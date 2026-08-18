using System.Text.Json;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>
/// Thay phản hồi 403 rỗng mặc định bằng thân JSON nêu rõ MÃ QUYỀN còn thiếu và lý do.
/// Người quản trị đọc thông báo trên màn hình là biết phải tick ô nào, không phải mở
/// log server để đoán.
/// </summary>
public sealed class PermissionAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private static readonly AuthorizationMiddlewareResultHandler Default = new();

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden
            && context.Items.TryGetValue(PermissionCheckOutcome.ItemKey, out var raw)
            && raw is PermissionCheckOutcome outcome)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json; charset=utf-8";

            var body = new
            {
                permissionCode = outcome.Code,
                reason = outcome.Reason,
                result = outcome.Result.ToString(),
                path = context.Request.Path.Value,
                method = context.Request.Method,
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
            return;
        }

        await Default.HandleAsync(next, context, policy, authorizeResult);
    }
}

/// <summary>
/// Ghi lại các lần kiểm quyền không đạt. Chạy BỌC NGOÀI middleware phân quyền: kết quả
/// chỉ có sau khi tầng phân quyền chạy xong nên phải đọc lúc request đi ngược ra.
/// </summary>
public sealed class PermissionAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PermissionAuditMiddleware> _logger;

    public PermissionAuditMiddleware(RequestDelegate next, ILogger<PermissionAuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, Microsoft.Extensions.Options.IOptions<RbacOptions> options)
    {
        await _next(context);

        if (!options.Value.LogDeniedToDatabase)
        {
            return;
        }

        if (!context.Items.TryGetValue(PermissionCheckOutcome.ItemKey, out var raw) || raw is not PermissionCheckOutcome outcome)
        {
            return;
        }

        try
        {
            var db = context.RequestServices.GetService<Data.AppDbContext>();
            if (db is null)
            {
                return;
            }

            Guid? userId = null;
            var rawId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(rawId, out var parsed))
            {
                userId = parsed;
            }

            db.PermissionAuditLogs.Add(new PermissionAuditLog
            {
                UserId = userId,
                UserName = context.User.Identity?.Name ?? context.User.FindFirst("name")?.Value,
                PermissionCode = outcome.Code,
                HttpMethod = context.Request.Method,
                Path = context.Request.Path.Value ?? string.Empty,
                // Chế độ Audit cho qua nhưng phải phân biệt được với lần chặn thật.
                Result = outcome.Allowed ? PermissionAuditResult.AuditOnly : outcome.Result,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                CreatedAt = DateTime.UtcNow,
            });

            await db.SaveChangesAsync(context.RequestAborted);
        }
        catch (Exception ex)
        {
            // Ghi nhật ký hỏng không được làm hỏng request đã xử lý xong.
            _logger.LogError(ex, "Không ghi được nhật ký từ chối quyền");
        }
    }
}
