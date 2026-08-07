using AIValidation.Api.Models.Auth;

namespace AIValidation.Api.Services.Auth;

/// <summary>Quản trị vai trò: CRUD role, gán quyền cho role, liệt kê quyền.</summary>
public interface IRoleAdminService
{
    Task<IReadOnlyList<RoleDto>> ListAsync(CancellationToken ct = default);

    Task<ServiceResult<RoleDto>> GetAsync(Guid id, CancellationToken ct = default);

    Task<ServiceResult<RoleDto>> CreateAsync(CreateRoleRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult<RoleDto>> UpdateAsync(Guid id, UpdateRoleRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult> DeleteAsync(Guid id, Guid? actorId, string? ip, CancellationToken ct = default);

    Task<ServiceResult<RoleDto>> AssignPermissionsAsync(Guid id, AssignPermissionsRequest request, Guid? actorId, string? ip, CancellationToken ct = default);

    /// <summary>Liệt kê toàn bộ quyền, gom theo nhóm.</summary>
    Task<IReadOnlyList<PermissionGroupDto>> ListPermissionsAsync(CancellationToken ct = default);
}
