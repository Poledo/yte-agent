namespace AIValidation.Api.Services.Auth;

/// <summary>Ghi nhật ký kiểm toán cho các hành động quan trọng.</summary>
public interface IAuditService
{
    /// <summary>Ghi một mục audit log.</summary>
    Task LogAsync(
        string action,
        Guid? userId = null,
        string? userName = null,
        string? entityType = null,
        string? entityId = null,
        string? detail = null,
        string? ipAddress = null,
        CancellationToken ct = default);
}
