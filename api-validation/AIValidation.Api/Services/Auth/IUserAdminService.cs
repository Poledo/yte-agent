using AIValidation.Api.Models.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>Quản trị người dùng: CRUD, gán role, khóa/mở tài khoản.</summary>
public interface IUserAdminService
{
    Task<IReadOnlyList<UserDto>> ListAsync(string? search, CancellationToken ct = default);

    Task<ServiceResult<UserDto>> GetAsync(Guid id, CancellationToken ct = default);

    Task<ServiceResult<UserDto>> CreateAsync(CreateUserRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult> DeleteAsync(Guid id, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult<UserDto>> AssignRolesAsync(Guid id, AssignRolesRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    /// <summary>Khóa (locked=true) hoặc mở khóa (locked=false) tài khoản.</summary>
    Task<ServiceResult<UserDto>> SetLockAsync(Guid id, bool locked, Guid? actorId, string? ip, CancellationToken ct = default);
}
