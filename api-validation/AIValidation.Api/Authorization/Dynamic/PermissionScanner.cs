using System.Text;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>Một quyền suy ra từ một endpoint đang có trong ứng dụng.</summary>
public sealed record EndpointPermission(
    string Code,
    string DisplayName,
    string Category,
    string HttpMethod,
    string Route,
    string ControllerName,
    string ActionName);

/// <summary>Kết quả một lần đồng bộ bảng quyền với mã nguồn.</summary>
public sealed record PermissionSyncResult(
    int Scanned,
    int Added,
    int Updated,
    int Deactivated,
    int Reactivated,
    int AutoGranted,
    DateTime CompletedAt);

public interface IPermissionScanner
{
    /// <summary>Duyệt toàn bộ endpoint đang đăng ký, trả danh sách quyền suy ra được.</summary>
    IReadOnlyList<EndpointPermission> Scan();

    /// <summary>Đối chiếu kết quả quét với bảng quyền trong CSDL và ghi chênh lệch.</summary>
    Task<PermissionSyncResult> SyncAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Kết quả lần đồng bộ gần nhất TRONG TIẾN TRÌNH NÀY; null nghĩa là chưa chạy lần nào
    /// kể từ lúc khởi động (không phải "chưa bao giờ đồng bộ").
    /// </summary>
    PermissionSyncResult? LastSync { get; }

    /// <summary>
    /// Bản đồ "METHOD:route" → mã quyền, dùng lúc xử lý request để biết endpoint đang
    /// gọi thuộc quyền nào. Endpoint được miễn kiểm tra không có mặt trong bản đồ.
    /// </summary>
    IReadOnlyDictionary<string, string> BuildRouteMap();
}

/// <summary>
/// Bộ quét endpoint: nguồn sự thật của bảng quyền. Thêm một action vào controller là
/// lần khởi động sau đã có quyền tương ứng, không phải sửa danh sách mã nào trong code.
/// </summary>
public sealed class PermissionScanner : IPermissionScanner
{
    private readonly EndpointDataSource _endpoints;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RbacOptions _options;
    private readonly ILogger<PermissionScanner> _logger;

    /// <summary>Đọc/ghi từ nhiều luồng (hosted service lúc khởi động, request lúc bấm quét lại).</summary>
    private volatile PermissionSyncResult? _lastSync;

    public PermissionScanner(
        EndpointDataSource endpoints,
        IServiceScopeFactory scopeFactory,
        IOptions<RbacOptions> options,
        ILogger<PermissionScanner> logger)
    {
        _endpoints = endpoints;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public PermissionSyncResult? LastSync => _lastSync;

    public IReadOnlyList<EndpointPermission> Scan()
    {
        var result = new List<EndpointPermission>();

        foreach (var endpoint in _endpoints.Endpoints)
        {
            if (endpoint is not RouteEndpoint routeEndpoint)
            {
                continue;
            }

            var descriptor = endpoint.Metadata.GetMetadata<ControllerActionDescriptor>();
            if (descriptor is null)
            {
                // Endpoint không phải action của controller (openapi, scalar, health,
                // static file). Không sinh quyền, cũng không chặn.
                continue;
            }

            if (endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                continue;
            }

            if (endpoint.Metadata.GetMetadata<IgnorePermissionAttribute>() is not null)
            {
                continue;
            }

            var route = NormalizeRoute(routeEndpoint.RoutePattern.RawText);
            if (!IsUnderIncludedPrefix(route))
            {
                continue;
            }

            var controller = descriptor.ControllerName;
            var action = descriptor.ActionName;
            var code = endpoint.Metadata.GetMetadata<PermissionAttribute>()?.Code ?? $"{controller}.{action}";

            foreach (var method in ResolveHttpMethods(endpoint))
            {
                result.Add(new EndpointPermission(
                    Code: code,
                    DisplayName: BuildDisplayName(controller, action),
                    Category: controller,
                    HttpMethod: method,
                    Route: route,
                    ControllerName: controller,
                    ActionName: action));
            }
        }

        return result;
    }

    public IReadOnlyDictionary<string, string> BuildRouteMap()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var permission in Scan())
        {
            // Cùng một (verb, route) không thể thuộc hai endpoint khác nhau, nhưng nếu
            // định tuyến bị khai trùng thì giữ mục đầu và báo để còn sửa.
            var key = RouteKey(permission.HttpMethod, permission.Route);
            if (!map.TryAdd(key, permission.Code))
            {
                _logger.LogWarning(
                    "Route {Key} khai báo trùng ở hai endpoint ({Existing} và {New}), giữ mã {Existing}",
                    key, map[key], permission.Code, map[key]);
            }
        }

        return map;
    }

    public async Task<PermissionSyncResult> SyncAsync(CancellationToken cancellationToken = default)
    {
        var scanned = Scan();

        // Một mã quyền có thể do nhiều endpoint dùng chung (nhờ [Permission]) và một
        // endpoint có thể nhận nhiều verb — gom lại còn một dòng mỗi mã.
        var byCode = scanned
            .GroupBy(p => p.Code, StringComparer.OrdinalIgnoreCase)
            .Select(g => new
            {
                Sample = g.First(),
                Methods = string.Join(",", g.Select(x => x.HttpMethod).Distinct(StringComparer.OrdinalIgnoreCase).Order()),
                Routes = g.Select(x => x.Route).Distinct(StringComparer.OrdinalIgnoreCase).Order().First(),
            })
            .ToList();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Chỉ đụng tới quyền do bộ quét sinh. Quyền người quản trị tự tạo có
        // ControllerName rỗng và phải được để yên tuyệt đối.
        var existing = await db.Permissions
            .Where(p => p.ControllerName != "")
            .ToListAsync(cancellationToken);

        var existingByCode = existing
            .GroupBy(p => p.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var existingByMember = existing
            .GroupBy(p => MemberKey(p.ControllerName, p.ActionName), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;
        var matched = new HashSet<Guid>();
        var added = new List<Permission>();
        var updated = 0;
        var reactivated = 0;

        foreach (var item in byCode)
        {
            var ep = item.Sample;
            var memberKey = MemberKey(ep.ControllerName, ep.ActionName);

            // Khớp theo mã trước; nếu không có thì khớp theo (controller, action) —
            // nhánh này cứu trường hợp đổi tên action: mã đổi nhưng dòng cũ vẫn là
            // dòng đó, cập nhật tại chỗ thì mọi vai trò đang được gán vẫn giữ nguyên.
            var row = existingByCode.GetValueOrDefault(ep.Code)
                      ?? existingByMember.GetValueOrDefault(memberKey);

            if (row is null)
            {
                row = new Permission
                {
                    Id = Guid.NewGuid(),
                    Code = ep.Code,
                    DisplayName = ep.DisplayName,
                    Category = ep.Category,
                    HttpMethod = item.Methods,
                    Route = item.Routes,
                    ControllerName = ep.ControllerName,
                    ActionName = ep.ActionName,
                    IsSystem = true,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedDate = now,
                };
                db.Permissions.Add(row);
                added.Add(row);
                existingByCode[ep.Code] = row;
                existingByMember[memberKey] = row;
                continue;
            }

            matched.Add(row.Id);

            var changed = false;

            // Mã chỉ được đổi khi chưa có dòng khác giữ mã đó — index duy nhất trên Code
            // sẽ nổ nếu hai dòng cùng nhận một mã.
            if (!string.Equals(row.Code, ep.Code, StringComparison.Ordinal)
                && !existingByCode.ContainsKey(ep.Code))
            {
                existingByCode.Remove(row.Code);
                row.Code = ep.Code;
                existingByCode[ep.Code] = row;
                changed = true;
            }

            if (!string.Equals(row.Category, ep.Category, StringComparison.Ordinal)) { row.Category = ep.Category; changed = true; }
            if (!string.Equals(row.HttpMethod, item.Methods, StringComparison.Ordinal)) { row.HttpMethod = item.Methods; changed = true; }
            if (!string.Equals(row.Route, item.Routes, StringComparison.Ordinal)) { row.Route = item.Routes; changed = true; }
            if (!string.Equals(row.ControllerName, ep.ControllerName, StringComparison.Ordinal)) { row.ControllerName = ep.ControllerName; changed = true; }
            if (!string.Equals(row.ActionName, ep.ActionName, StringComparison.Ordinal)) { row.ActionName = ep.ActionName; changed = true; }

            // DisplayName KHÔNG bị ghi đè: bộ quét chỉ đặt tên lúc tạo, tên người quản
            // trị sửa lại cho sát nghiệp vụ phải sống sót qua mọi lần quét sau.
            if (string.IsNullOrWhiteSpace(row.DisplayName))
            {
                row.DisplayName = ep.DisplayName;
                changed = true;
            }

            if (!row.IsActive)
            {
                row.IsActive = true;
                reactivated++;
                changed = true;
            }

            if (changed)
            {
                row.UpdatedDate = now;
                updated++;
            }
        }

        // Endpoint đã gỡ khỏi code: chỉ TẮT, không xóa. Xóa sẽ kéo theo mọi dòng
        // role_permissions, gắn lại endpoint là mất sạch cấu hình phân quyền.
        var deactivated = 0;
        foreach (var row in existing.Where(p => p.IsActive && !matched.Contains(p.Id)))
        {
            row.IsActive = false;
            row.UpdatedDate = now;
            deactivated++;
        }

        await db.SaveChangesAsync(cancellationToken);

        var autoGranted = await AutoGrantAsync(db, added, cancellationToken);

        var result = new PermissionSyncResult(
            Scanned: byCode.Count,
            Added: added.Count,
            Updated: updated,
            Deactivated: deactivated,
            Reactivated: reactivated,
            AutoGranted: autoGranted,
            CompletedAt: now);

        _lastSync = result;

        _logger.LogInformation(
            "Đồng bộ quyền: quét {Scanned}, thêm {Added}, cập nhật {Updated}, tắt {Deactivated}, bật lại {Reactivated}, tự cấp {AutoGranted}",
            result.Scanned, result.Added, result.Updated, result.Deactivated, result.Reactivated, result.AutoGranted);

        return result;
    }

    /// <summary>
    /// Cấp mọi quyền vừa phát sinh cho vai trò quản trị. Không có bước này thì thêm một
    /// API mới là chính người quản trị bị 403 ở màn hình vừa viết ra.
    /// </summary>
    private async Task<int> AutoGrantAsync(AppDbContext db, List<Permission> added, CancellationToken cancellationToken)
    {
        if (added.Count == 0 || string.IsNullOrWhiteSpace(_options.AutoGrantToRoleCode))
        {
            return 0;
        }

        var roleCode = _options.AutoGrantToRoleCode.Trim();
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Code == roleCode, cancellationToken);
        if (role is null)
        {
            _logger.LogWarning("Không tìm thấy vai trò mã {RoleCode} để tự cấp quyền mới", roleCode);
            return 0;
        }

        var already = await db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync(cancellationToken);
        var alreadySet = already.ToHashSet();

        var grants = added
            .Where(p => !alreadySet.Contains(p.Id))
            .Select(p => new RolePermission { RoleId = role.Id, PermissionId = p.Id })
            .ToList();

        if (grants.Count == 0)
        {
            return 0;
        }

        db.RolePermissions.AddRange(grants);
        await db.SaveChangesAsync(cancellationToken);
        return grants.Count;
    }

    /// <summary>Khóa nhận diện của bộ quét: cặp (controller, action).</summary>
    private static string MemberKey(string controller, string action) => $"{controller}#{action}";

    /// <summary>Khóa tra cứu lúc chạy: verb + route đã chuẩn hóa.</summary>
    public static string RouteKey(string httpMethod, string route) => $"{httpMethod.ToUpperInvariant()}:{route}";

    /// <summary>Chuẩn hóa route để hai bên quét và tra cứu luôn khớp nhau.</summary>
    public static string NormalizeRoute(string? rawText) =>
        (rawText ?? string.Empty).Trim('/').ToLowerInvariant();

    private bool IsUnderIncludedPrefix(string normalizedRoute)
    {
        var prefixes = _options.IncludeRoutePrefixes;
        if (prefixes is null || prefixes.Length == 0)
        {
            return true;
        }

        foreach (var prefix in prefixes)
        {
            if (normalizedRoute.StartsWith(prefix.Trim('/').ToLowerInvariant(), StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<string> ResolveHttpMethods(Endpoint endpoint)
    {
        var metadata = endpoint.Metadata.GetMetadata<HttpMethodMetadata>();
        if (metadata is null || metadata.HttpMethods.Count == 0)
        {
            // Action không ràng buộc verb nhận mọi verb — dùng "*" làm ký tự đại diện,
            // bên tra cứu thử verb thật trước rồi mới thử "*".
            return new[] { "*" };
        }

        return metadata.HttpMethods;
    }

    /// <summary>Ánh xạ động từ trong tên action sang nhãn tiếng Việt.</summary>
    private static readonly (string Prefix, string Label)[] VerbLabels =
    {
        ("GetAll", "Xem danh sách"),
        ("GetList", "Xem danh sách"),
        ("List", "Xem danh sách"),
        ("Search", "Tìm kiếm"),
        ("Query", "Tra cứu"),
        ("Import", "Nhập dữ liệu"),
        ("Upload", "Tải lên"),
        ("Export", "Xuất dữ liệu"),
        ("Download", "Tải xuống"),
        ("Preview", "Xem trước"),
        ("Create", "Thêm"),
        ("Add", "Thêm"),
        ("Register", "Đăng ký"),
        ("Update", "Sửa"),
        ("Edit", "Sửa"),
        ("Save", "Lưu"),
        ("Set", "Đặt"),
        ("Delete", "Xóa"),
        ("Remove", "Xóa"),
        ("Toggle", "Bật/tắt"),
        ("Enable", "Bật"),
        ("Disable", "Tắt"),
        ("Activate", "Kích hoạt"),
        ("Approve", "Duyệt"),
        ("Reject", "Từ chối"),
        ("Rescan", "Quét lại"),
        ("Rebuild", "Dựng lại"),
        ("Reindex", "Đánh chỉ mục lại"),
        ("Refresh", "Làm mới"),
        ("Sync", "Đồng bộ"),
        ("Reset", "Đặt lại"),
        ("Test", "Kiểm thử"),
        ("Send", "Gửi"),
        ("Login", "Đăng nhập"),
        ("Logout", "Đăng xuất"),
        ("Stats", "Xem thống kê"),
        ("Summary", "Xem tổng hợp"),
        ("Report", "Xem báo cáo"),
        ("Detail", "Xem chi tiết"),
        ("Get", "Xem"),
        ("View", "Xem"),
        ("Read", "Xem"),
    };

    /// <summary>
    /// Tên hiển thị mặc định, chỉ dùng lúc tạo mới. Không cần hoàn hảo — người quản trị
    /// sửa lại được và bản sửa sẽ được giữ qua mọi lần quét sau.
    /// </summary>
    private static string BuildDisplayName(string controller, string action)
    {
        foreach (var (prefix, label) in VerbLabels)
        {
            if (action.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var rest = action[prefix.Length..];
                var subject = SplitPascalCase(string.IsNullOrEmpty(rest) ? controller : rest);
                return $"{label} {subject}".Trim();
            }
        }

        return $"{SplitPascalCase(action)} ({SplitPascalCase(controller)})";
    }

    /// <summary>Tách PascalCase thành các từ cách nhau bằng dấu cách.</summary>
    private static string SplitPascalCase(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length + 8);
        for (var i = 0; i < value.Length; i++)
        {
            var current = value[i];
            if (i > 0 && char.IsUpper(current) && !char.IsUpper(value[i - 1]))
            {
                builder.Append(' ');
            }

            builder.Append(current);
        }

        return builder.ToString();
    }
}
