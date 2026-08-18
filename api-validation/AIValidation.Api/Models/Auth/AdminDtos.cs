namespace AIValidation.Api.Models.Auth;

// ===== DTO cho quản trị User =====

/// <summary>
/// Tạo user mới (quản trị).
///
/// FacilityId: cơ sở KCB của tài khoản. Chỉ quản trị HỆ THỐNG được chọn; quản trị cơ
/// sở gửi lên gì cũng bị ép về cơ sở của chính họ. <c>null</c> (do quản trị hệ thống
/// tạo) = tài khoản cấp hệ thống, thấy toàn bộ dữ liệu.
/// </summary>
public record CreateUserRequest(
    string Email, string Password, string FullName, IReadOnlyList<string>? Roles, long? FacilityId = null);

/// <summary>Cập nhật thông tin user.</summary>
public record UpdateUserRequest(string? FullName, bool? IsActive);

/// <summary>Gán danh sách role cho user (thay thế toàn bộ).</summary>
public record AssignRolesRequest(IReadOnlyList<string> Roles);

/// <summary>
/// Thông tin user cho danh sách quản trị.
///
/// FacilityCode/FacilityName chỉ để hiển thị cột "Cơ sở" cho quản trị hệ thống —
/// quản trị cơ sở nhìn danh sách mà mọi dòng đều là cơ sở mình thì cột đó chỉ tốn chỗ,
/// web-admin tự ẩn đi.
/// </summary>
public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsActive,
    bool EmailConfirmed,
    bool IsLockedOut,
    DateTime CreatedAt,
    IReadOnlyList<string> Roles,
    long? FacilityId = null,
    string? FacilityCode = null,
    string? FacilityName = null,
    bool IsSuperAdmin = false);

// ===== DTO cho quản trị Role =====

/// <summary>
/// Tạo vai trò mới. <c>Code</c> bỏ trống thì hệ thống tự sinh từ tên (viết HOA, bỏ dấu);
/// đây là mã bất biến để tra lại vai trò, còn tên hiển thị đổi được tùy ý.
/// </summary>
public record CreateRoleRequest(
    string Name, string? Description, IReadOnlyList<string>? Permissions, string? Code = null);

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
    IReadOnlyList<string> Permissions,
    string Code = "");

/// <summary>
/// Thông tin quyền (danh mục). <c>Category</c> là tên controller sinh ra quyền,
/// dùng để gom nhóm ở màn hình gán quyền.
/// </summary>
public record PermissionDto(
    string Code,
    string DisplayName,
    string Category,
    string HttpMethod = "",
    string Route = "",
    bool IsActive = true,
    bool IsSystem = true);

/// <summary>Nhóm quyền để hiển thị theo Category.</summary>
public record PermissionGroupDto(string Category, IReadOnlyList<PermissionDto> Permissions);

// ===== DTO cho màn hình Quyền (RBAC động) =====

/// <summary>Đổi tên hiển thị của một quyền.</summary>
public record UpdatePermissionDisplayNameRequest(string DisplayName);

/// <summary>Bật/tắt hàng loạt quyền theo mã.</summary>
public record BulkTogglePermissionsRequest(IReadOnlyList<string> Codes, bool IsActive);

/// <summary>Giá trị lọc có sẵn cho màn hình Quyền (dropdown Category / HTTP method).</summary>
public record PermissionFacetsDto(
    IReadOnlyList<string> Categories,
    IReadOnlyList<string> HttpMethods,
    int Total,
    int ActiveCount,
    int InactiveCount);

/// <summary>
/// So sánh bảng quyền trong CSDL với danh sách endpoint đang chạy — trả lời câu hỏi
/// "quét lại có thay đổi gì không" trước khi người quản trị bấm nút quét.
/// </summary>
public record PermissionSyncStatusDto(
    int EndpointCount,
    int DbCount,
    int ActiveCount,
    int MissingCount,
    int OrphanCount,
    IReadOnlyList<string> MissingCodes,
    IReadOnlyList<string> OrphanCodes,
    DateTime? LastScanAt);
