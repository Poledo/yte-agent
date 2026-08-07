using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Auth;

/// <summary>Quản trị người dùng (yêu cầu quyền User.Manage ở tầng controller).</summary>
public sealed class UserAdminService : IUserAdminService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly IAuditService _auditService;

    public UserAdminService(
        UserManager<AppUser> userManager,
        RoleManager<AppRole> roleManager,
        IAuditService auditService)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _auditService = auditService;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<UserDto>> ListAsync(string? search, CancellationToken ct = default)
    {
        var query = _userManager.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u => u.Email!.Contains(s) || u.FullName.Contains(s));
        }

        var users = await query.OrderBy(u => u.Email).ToListAsync(ct);

        var result = new List<UserDto>(users.Count);
        foreach (var user in users)
        {
            result.Add(await ToDtoAsync(user));
        }
        return result;
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<UserDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult<UserDto>.Fail("Không tìm thấy người dùng.", 404);
        }
        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user));
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<UserDto>> CreateAsync(
        CreateUserRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ServiceResult<UserDto>.Fail("Email và mật khẩu không được để trống.");
        }

        if (await _userManager.FindByEmailAsync(request.Email) != null)
        {
            return ServiceResult<UserDto>.Fail("Email đã được sử dụng.", 409);
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName ?? string.Empty,
            EmailConfirmed = true, // quản trị tạo thì coi như đã xác nhận
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return ServiceResult<UserDto>.Fail(string.Join(" ", created.Errors.Select(e => e.Description)));
        }

        if (request.Roles is { Count: > 0 })
        {
            var valid = await FilterExistingRolesAsync(request.Roles);
            if (valid.Count > 0)
            {
                await _userManager.AddToRolesAsync(user, valid);
            }
        }

        await _auditService.LogAsync("User.Create", actorId, entityType: "User", entityId: user.Id.ToString(),
            detail: user.Email, ipAddress: ip, ct: ct);

        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user), "Tạo người dùng thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<UserDto>> UpdateAsync(
        Guid id, UpdateUserRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult<UserDto>.Fail("Không tìm thấy người dùng.", 404);
        }

        if (request.FullName != null)
        {
            user.FullName = request.FullName;
        }
        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        var updated = await _userManager.UpdateAsync(user);
        if (!updated.Succeeded)
        {
            return ServiceResult<UserDto>.Fail(string.Join(" ", updated.Errors.Select(e => e.Description)));
        }

        await _auditService.LogAsync("User.Update", actorId, entityType: "User", entityId: user.Id.ToString(), ipAddress: ip, ct: ct);
        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user), "Cập nhật người dùng thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> DeleteAsync(Guid id, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult.Fail("Không tìm thấy người dùng.", 404);
        }

        var deleted = await _userManager.DeleteAsync(user);
        if (!deleted.Succeeded)
        {
            return ServiceResult.Fail(string.Join(" ", deleted.Errors.Select(e => e.Description)));
        }

        await _auditService.LogAsync("User.Delete", actorId, entityType: "User", entityId: id.ToString(),
            detail: user.Email, ipAddress: ip, ct: ct);
        return ServiceResult.Ok("Đã xóa người dùng.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<UserDto>> AssignRolesAsync(
        Guid id, AssignRolesRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult<UserDto>.Fail("Không tìm thấy người dùng.", 404);
        }

        var target = await FilterExistingRolesAsync(request.Roles ?? new List<string>());
        var current = await _userManager.GetRolesAsync(user);

        var toRemove = current.Except(target).ToList();
        var toAdd = target.Except(current).ToList();

        // Phải kiểm tra kết quả: Identity lưu vai trò kèm ConcurrencyStamp của
        // bản ghi người dùng, nếu bản ghi vừa bị sửa ở nơi khác thì lệnh bị hủy
        // và trả về ConcurrencyFailure. Bỏ qua kết quả sẽ báo "thành công" trong
        // khi vai trò không hề được lưu.
        if (toRemove.Count > 0)
        {
            var removed = await _userManager.RemoveFromRolesAsync(user, toRemove);
            if (!removed.Succeeded)
            {
                return ServiceResult<UserDto>.Fail(DescribeIdentityErrors(removed));
            }
        }
        if (toAdd.Count > 0)
        {
            var added = await _userManager.AddToRolesAsync(user, toAdd);
            if (!added.Succeeded)
            {
                return ServiceResult<UserDto>.Fail(DescribeIdentityErrors(added));
            }
        }

        await _auditService.LogAsync("User.AssignRoles", actorId, entityType: "User", entityId: user.Id.ToString(),
            detail: string.Join(",", target), ipAddress: ip, ct: ct);

        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user), "Gán vai trò thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<UserDto>> SetLockAsync(
        Guid id, bool locked, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult<UserDto>.Fail("Không tìm thấy người dùng.", 404);
        }

        // Dùng IsActive làm cờ khóa mềm + đặt LockoutEnd để chặn đăng nhập ngay
        user.IsActive = !locked;
        await _userManager.UpdateAsync(user);

        if (locked)
        {
            await _userManager.SetLockoutEnabledAsync(user, true);
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        }
        else
        {
            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);
        }

        await _auditService.LogAsync(locked ? "User.Lock" : "User.Unlock", actorId,
            entityType: "User", entityId: user.Id.ToString(), ipAddress: ip, ct: ct);

        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user), locked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
    }

    /// <summary>Gộp lỗi Identity thành một câu tiếng Việt cho người dùng cuối.</summary>
    private static string DescribeIdentityErrors(IdentityResult result)
    {
        if (result.Errors.Any(e => e.Code == "ConcurrencyFailure"))
        {
            return "Thông tin người dùng vừa bị thay đổi bởi thao tác khác. Vui lòng tải lại danh sách rồi thử lại.";
        }
        return string.Join(" ", result.Errors.Select(e => e.Description));
    }

    private async Task<List<string>> FilterExistingRolesAsync(IReadOnlyList<string> roles)
    {
        var valid = new List<string>();
        foreach (var role in roles.Distinct())
        {
            if (await _roleManager.RoleExistsAsync(role))
            {
                valid.Add(role);
            }
        }
        return valid;
    }

    private async Task<UserDto> ToDtoAsync(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var isLockedOut = await _userManager.IsLockedOutAsync(user);
        return new UserDto(
            user.Id, user.Email ?? string.Empty, user.FullName,
            user.IsActive, user.EmailConfirmed, isLockedOut, user.CreatedAt, roles.ToList());
    }
}
