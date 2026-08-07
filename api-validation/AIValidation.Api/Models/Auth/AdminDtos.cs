namespace AIValidation.Api.Models.Auth;

// ===== DTO cho quản trị User =====

/// <summary>Tạo user mới (quản trị).</summary>
public record CreateUserRequest(string Email, string Password, string FullName, IReadOnlyList<string>? Roles);

/// <summary>Cập nhật thông tin user.</summary>
public record UpdateUserRequest(string? FullName, bool? IsActive);

/// <summary>Gán danh sách role cho user (thay thế toàn bộ).</summary>
public record AssignRolesRequest(IReadOnlyList<string> Roles);

/// <summary>Thông tin user cho danh sách quản trị.</summary>
public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsActive,
    bool EmailConfirmed,
    bool IsLockedOut,
    DateTime CreatedAt,
    IReadOnlyList<string> Roles);

// ===== DTO cho quản trị Role =====

/// <summary>Tạo vai trò mới.</summary>
public record CreateRoleRequest(string Name, string? Description, IReadOnlyList<string>? Permissions);

/// <summary>Cập nhật vai trò.</summary>
public record UpdateRoleRequest(string? Description);

/// <summary>Gán danh sách quyền cho vai trò (thay thế toàn bộ).</summary>
public record AssignPermissionsRequest(IReadOnlyList<string> Permissions);

/// <summary>Thông tin vai trò.</summary>
public record RoleDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsSystem,
    IReadOnlyList<string> Permissions);

/// <summary>Thông tin quyền (danh mục).</summary>
public record PermissionDto(string Code, string DisplayName, string Group);

/// <summary>Nhóm quyền để hiển thị theo Group.</summary>
public record PermissionGroupDto(string Group, IReadOnlyList<PermissionDto> Permissions);
