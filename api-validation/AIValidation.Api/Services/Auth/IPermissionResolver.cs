namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Gộp danh sách quyền (permission code) của user từ các role của user.
/// </summary>
public interface IPermissionResolver
{
    /// <summary>Lấy toàn bộ mã quyền của các role (đã loại trùng).</summary>
    Task<IReadOnlyList<string>> GetPermissionsForRolesAsync(
        IEnumerable<string> roleNames, CancellationToken ct = default);
}
