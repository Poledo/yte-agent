using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Services.Tenancy;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Ghi nhật ký kiểm toán. Lỗi ghi log không được làm hỏng nghiệp vụ chính nên
/// mọi ngoại lệ được nuốt và chỉ log cảnh báo.
/// </summary>
public sealed class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly ITenantScope _tenant;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AppDbContext db, ITenantScope tenant, ILogger<AuditService> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task LogAsync(
        string action,
        Guid? userId = null,
        string? userName = null,
        string? entityType = null,
        string? entityId = null,
        string? detail = null,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        try
        {
            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = action,
                UserId = userId,
                UserName = userName,
                EntityType = entityType,
                EntityId = entityId,
                Detail = detail,
                IpAddress = ipAddress,
                // Cơ sở của NGƯỜI THỰC HIỆN, không phải của đối tượng bị tác động: nhật ký
                // trả lời câu hỏi "ai ở cơ sở nào đã làm gì", nên quản trị cơ sở soi được
                // đúng thao tác của nhân viên mình.
                FacilityId = _tenant.FacilityId,
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không ghi được audit log cho hành động {Action}", action);
        }
    }
}
