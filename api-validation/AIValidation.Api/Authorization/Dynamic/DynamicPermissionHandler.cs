using System.Security.Claims;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>Tên claim riêng của tầng phân quyền động.</summary>
public static class RbacClaimTypes
{
    /// <summary>Id cơ sở KCB của tài khoản. Không có claim = tài khoản cấp hệ thống.</summary>
    public const string FacilityId = "facilityId";

    /// <summary>Mã cơ sở KCB (tiện cho giao diện, không dùng để phân quyền).</summary>
    public const string FacilityCode = "facilityCode";

    /// <summary>Cờ quản trị toàn hệ thống.</summary>
    public const string IsSuperAdmin = "isSuperAdmin";
}

/// <summary>Kết quả một lần kiểm quyền, để middleware ghi nhật ký và dựng phản hồi 403.</summary>
/// <param name="Code">Mã quyền đang yêu cầu, rỗng nếu không tra được.</param>
/// <param name="Result">Lý do cụ thể.</param>
/// <param name="Allowed">Có cho đi tiếp không (chế độ Audit vẫn cho qua).</param>
public sealed record PermissionCheckOutcome(string Code, PermissionAuditResult Result, bool Allowed)
{
    /// <summary>Khóa lưu trong <c>HttpContext.Items</c>.</summary>
    public const string ItemKey = "__rbac_outcome";

    /// <summary>Thông điệp tiếng Việt kèm theo phản hồi 403.</summary>
    public string Reason => Result switch
    {
        PermissionAuditResult.Unauthenticated => "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        PermissionAuditResult.PermissionNotFound => "Chức năng này chưa được khai báo quyền. Vui lòng chạy quét lại quyền ở màn hình quản trị.",
        PermissionAuditResult.PermissionDisabled => "Quyền của chức năng này đang bị tắt.",
        PermissionAuditResult.NoRole => "Tài khoản chưa được gán vai trò nào.",
        PermissionAuditResult.Denied => "Tài khoản không có quyền thực hiện chức năng này.",
        _ => "Không đủ quyền.",
    };
}

/// <summary>
/// Chốt kiểm quyền lúc chạy. Xử lý cả hai kiểu yêu cầu: mã ghim sẵn bằng
/// <see cref="PermissionAttribute"/> và mã tự tra theo endpoint.
/// </summary>
public sealed class DynamicPermissionHandler : IAuthorizationHandler
{
    private readonly IPermissionCache _cache;
    private readonly RbacOptions _options;
    private readonly ILogger<DynamicPermissionHandler> _logger;

    public DynamicPermissionHandler(
        IPermissionCache cache,
        IOptions<RbacOptions> options,
        ILogger<DynamicPermissionHandler> logger)
    {
        _cache = cache;
        _options = options.Value;
        _logger = logger;
    }

    public async Task HandleAsync(AuthorizationHandlerContext context)
    {
        var pending = context.PendingRequirements
            .Where(r => r is PermissionCodeRequirement or DynamicPermissionRequirement)
            .ToList();

        if (pending.Count == 0)
        {
            return;
        }

        var http = context.Resource as HttpContext;
        if (http is null)
        {
            // Không có HttpContext thì không thể biết endpoint nào đang gọi — không
            // đoán mò, để requirement chưa được thỏa và tầng trên trả 403.
            return;
        }

        foreach (var requirement in pending)
        {
            var explicitCode = (requirement as PermissionCodeRequirement)?.Code;
            var outcome = await EvaluateAsync(http, context.User, explicitCode);

            if (outcome is null)
            {
                context.Succeed(requirement);
                continue;
            }

            http.Items[PermissionCheckOutcome.ItemKey] = outcome;

            if (outcome.Allowed)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail(new AuthorizationFailureReason(this, outcome.Reason));
            }
        }
    }

    /// <summary>Trả null khi được đi qua vô điều kiện, ngược lại trả lý do cụ thể.</summary>
    private async Task<PermissionCheckOutcome?> EvaluateAsync(HttpContext http, ClaimsPrincipal user, string? explicitCode)
    {
        var endpoint = http.GetEndpoint();
        var path = PermissionScanner.NormalizeRoute(http.Request.Path.Value);
        var underRbac = IsUnderIncludedPrefix(path);

        // Endpoint hạ tầng (openapi, scalar, health) và endpoint được miễn tường minh.
        if (!underRbac || endpoint?.Metadata.GetMetadata<IgnorePermissionAttribute>() is not null)
        {
            return null;
        }

        // Tắt RBAC vẫn GIỮ yêu cầu đăng nhập: policy dự phòng cố ý không gắn
        // RequireAuthenticatedUser, nên trả Succeed thẳng ở đây là mở toang toàn bộ
        // /api cho người lạ. Tắt phân quyền không đồng nghĩa với tắt đăng nhập.
        if (!_options.Enabled)
        {
            return user.Identity?.IsAuthenticated == true
                ? null
                : new PermissionCheckOutcome(string.Empty, PermissionAuditResult.Unauthenticated, Allowed: false);
        }

        if (user.Identity?.IsAuthenticated != true)
        {
            // Chưa đăng nhập thì chế độ Audit cũng không cho qua: Audit là để dò quyền
            // còn thiếu, không phải để mở cửa.
            return new PermissionCheckOutcome(string.Empty, PermissionAuditResult.Unauthenticated, Allowed: false);
        }

        if (IsSuperAdminClaim(user))
        {
            return null;
        }

        if (!TryGetUserId(user, out var userId))
        {
            return new PermissionCheckOutcome(string.Empty, PermissionAuditResult.Unauthenticated, Allowed: false);
        }

        var snapshot = await _cache.GetUserSnapshotAsync(userId, http.RequestAborted);
        if (snapshot is null || !snapshot.IsActive)
        {
            return new PermissionCheckOutcome(string.Empty, PermissionAuditResult.Unauthenticated, Allowed: false);
        }

        // Cờ SuperAdmin trong CSDL thắng cả token cũ chưa có claim này.
        if (snapshot.IsSuperAdmin)
        {
            return null;
        }

        var code = explicitCode ?? ResolveCode(http, endpoint);
        if (string.IsNullOrEmpty(code))
        {
            return Decide(string.Empty, PermissionAuditResult.PermissionNotFound);
        }

        var states = await _cache.GetPermissionStatesAsync(http.RequestAborted);
        if (!states.TryGetValue(code, out var isActive))
        {
            return Decide(code, PermissionAuditResult.PermissionNotFound);
        }

        if (!isActive)
        {
            return Decide(code, PermissionAuditResult.PermissionDisabled);
        }

        if (snapshot.RoleCount == 0)
        {
            return Decide(code, PermissionAuditResult.NoRole);
        }

        if (!snapshot.Codes.Contains(code))
        {
            return Decide(code, PermissionAuditResult.Denied);
        }

        return null;
    }

    /// <summary>
    /// Ở chế độ Audit, request thiếu quyền vẫn đi tiếp nhưng vẫn để lại dấu vết — đây
    /// là thứ cho phép đổi cả bộ mã quyền mà không khóa cửa toàn bộ người dùng ngay
    /// lần deploy đầu.
    /// </summary>
    private PermissionCheckOutcome Decide(string code, PermissionAuditResult result)
    {
        if (_options.Mode == RbacMode.Audit)
        {
            _logger.LogWarning(
                "RBAC Audit: bỏ qua thiếu quyền {Code} ({Result})", string.IsNullOrEmpty(code) ? "(không xác định)" : code, result);
            return new PermissionCheckOutcome(code, result, Allowed: true);
        }

        return new PermissionCheckOutcome(code, result, Allowed: false);
    }

    private string ResolveCode(HttpContext http, Endpoint? endpoint)
    {
        if (endpoint is not RouteEndpoint routeEndpoint)
        {
            return string.Empty;
        }

        var route = PermissionScanner.NormalizeRoute(routeEndpoint.RoutePattern.RawText);
        var map = _cache.RouteMap;

        if (map.TryGetValue(PermissionScanner.RouteKey(http.Request.Method, route), out var code))
        {
            return code;
        }

        // Action không ràng buộc verb được bộ quét ghi dưới ký tự đại diện "*".
        return map.TryGetValue(PermissionScanner.RouteKey("*", route), out var wildcard)
            ? wildcard
            : string.Empty;
    }

    private bool IsUnderIncludedPrefix(string normalizedPath)
    {
        var prefixes = _options.IncludeRoutePrefixes;
        if (prefixes is null || prefixes.Length == 0)
        {
            return true;
        }

        foreach (var prefix in prefixes)
        {
            if (normalizedPath.StartsWith(prefix.Trim('/').ToLowerInvariant(), StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsSuperAdminClaim(ClaimsPrincipal user)
    {
        var value = user.FindFirst(RbacClaimTypes.IsSuperAdmin)?.Value;
        return string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryGetUserId(ClaimsPrincipal user, out Guid userId)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? user.FindFirst("sub")?.Value;
        return Guid.TryParse(raw, out userId);
    }
}
