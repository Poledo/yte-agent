using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Auth;

/// <summary>Quản trị người dùng (yêu cầu quyền User.Manage ở tầng controller).</summary>
public sealed class UserAdminService : IUserAdminService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;
    private readonly ITenantScope _tenant;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly IPermissionCache _permissionCache;

    public UserAdminService(
        UserManager<AppUser> userManager,
        RoleManager<AppRole> roleManager,
        AppDbContext db,
        IAuditService auditService,
        ITenantScope tenant,
        IFacilityTreeProvider facilityTree,
        IPermissionCache permissionCache)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _db = db;
        _auditService = auditService;
        _tenant = tenant;
        _facilityTree = facilityTree;
        _permissionCache = permissionCache;
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

        // Tài khoản KHÔNG gắn cơ sở là tài khoản cấp hệ thống, KHÔNG phải "dùng chung":
        // quản trị cơ sở không được thấy, càng không được sửa. Đây là khác biệt cố ý so
        // với danh mục và kho tri thức, nơi null nghĩa là dùng chung.
        var tenant = await _tenant.GetFilterAsync(ct);
        if (!tenant.IsSystemScope)
        {
            var ids = tenant.Ids;
            query = query.Where(u => u.FacilityId != null && ids.Contains(u.FacilityId.Value));
        }

        var users = await query.OrderBy(u => u.Email).ToListAsync(ct);

        var result = new List<UserDto>(users.Count);
        foreach (var user in users)
        {
            result.Add(await ToDtoAsync(user, ct));
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
        if (await GuardAsync<UserDto>(user, ct) is { } denied)
        {
            return denied;
        }
        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user, ct));
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

        // Cơ sở của tài khoản mới: quản trị cơ sở KHÔNG được chọn — luôn ép về cơ sở của
        // chính họ. Cho chọn tự do thì chỉ cần sửa một số trong body là tạo được tài
        // khoản ở cơ sở khác, hoặc tài khoản cấp hệ thống (FacilityId null) thấy hết.
        long? facilityId;
        if (_tenant.IsSystemScope)
        {
            facilityId = request.FacilityId;
            if (facilityId.HasValue && await _facilityTree.FindByIdAsync(facilityId.Value, ct) == null)
            {
                return ServiceResult<UserDto>.Fail($"Không có cơ sở KCB #{facilityId.Value} trong cây đơn vị.");
            }
        }
        else
        {
            facilityId = _tenant.FacilityId;
            if (!facilityId.HasValue)
            {
                return ServiceResult<UserDto>.Fail(
                    "Tài khoản của bạn chưa gắn cơ sở KCB nên không tạo được người dùng.", 403);
            }
        }

        var valid = request.Roles is { Count: > 0 }
            ? await FilterExistingRolesAsync(request.Roles)
            : new List<string>();
        if (await GuardRoleEscalationAsync<UserDto>(valid, actorId, ct) is { } escalation)
        {
            return escalation;
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName ?? string.Empty,
            EmailConfirmed = true, // quản trị tạo thì coi như đã xác nhận
            IsActive = true,
            FacilityId = facilityId,
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return ServiceResult<UserDto>.Fail(string.Join(" ", created.Errors.Select(e => e.Description)));
        }

        if (valid.Count > 0)
        {
            await _userManager.AddToRolesAsync(user, valid);
        }

        await _auditService.LogAsync("User.Create", actorId, entityType: "User", entityId: user.Id.ToString(),
            detail: user.Email, ipAddress: ip, ct: ct);

        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user, ct), "Tạo người dùng thành công.");
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
        if (await GuardAsync<UserDto>(user, ct) is { } denied)
        {
            return denied;
        }

        if (request.FullName != null)
        {
            user.FullName = request.FullName;
        }
        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        // Cờ quản trị hệ thống: chỉ tài khoản cấp hệ thống mới được đổi — quản trị cơ
        // sở tự phong cho mình (hoặc cho người khác) là leo thang đặc quyền. Và không
        // ai tự gỡ cờ của chính mình: gỡ nhầm là mất luôn tài khoản vào được toàn hệ thống.
        var superAdminChanged = false;
        if (request.IsSuperAdmin.HasValue && request.IsSuperAdmin.Value != user.IsSuperAdmin)
        {
            if (!_tenant.IsSystemScope)
            {
                return ServiceResult<UserDto>.Fail(
                    "Chỉ tài khoản cấp hệ thống mới được cấp hoặc gỡ quyền quản trị hệ thống.", 403);
            }
            if (actorId.HasValue && actorId.Value == user.Id && !request.IsSuperAdmin.Value)
            {
                return ServiceResult<UserDto>.Fail(
                    "Không thể tự gỡ quyền quản trị hệ thống của chính mình.", 403);
            }

            user.IsSuperAdmin = request.IsSuperAdmin.Value;
            superAdminChanged = true;
        }

        var updated = await _userManager.UpdateAsync(user);
        if (!updated.Succeeded)
        {
            return ServiceResult<UserDto>.Fail(string.Join(" ", updated.Errors.Select(e => e.Description)));
        }

        if (superAdminChanged)
        {
            // Cờ IsSuperAdmin nằm trong ảnh chụp quyền — không xóa cache thì tài khoản
            // vừa được cấp vẫn phải chờ hết TTL mới có hiệu lực.
            _permissionCache.InvalidateAll();
        }

        await _auditService.LogAsync("User.Update", actorId, entityType: "User", entityId: user.Id.ToString(),
            detail: user.Email + (superAdminChanged
                ? (user.IsSuperAdmin ? " [+quản trị hệ thống]" : " [-quản trị hệ thống]")
                : string.Empty),
            ipAddress: ip, ct: ct);
        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user, ct), "Cập nhật người dùng thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> DeleteAsync(Guid id, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return ServiceResult.Fail("Không tìm thấy người dùng.", 404);
        }
        if (await GuardAsync(user, ct) is { } denied)
        {
            return denied;
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
        if (await GuardAsync<UserDto>(user, ct) is { } denied)
        {
            return denied;
        }

        var target = await FilterExistingRolesAsync(request.Roles ?? new List<string>());
        if (await GuardRoleEscalationAsync<UserDto>(target, actorId, ct) is { } escalation)
        {
            return escalation;
        }

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

        // Quyền của tài khoản này vừa đổi — xóa cache ngay, nếu không người vừa bị gỡ
        // vai trò vẫn dùng được quyền cũ cho tới khi hết TTL.
        _permissionCache.InvalidateAll();

        return ServiceResult<UserDto>.Ok(await ToDtoAsync(user, ct), "Gán vai trò thành công.");
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
        if (await GuardAsync<UserDto>(user, ct) is { } denied)
        {
            return denied;
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

        // Cờ IsActive nằm trong ảnh chụp quyền — không xóa cache thì tài khoản vừa khóa
        // vẫn gọi được API cho tới khi hết TTL.
        _permissionCache.InvalidateAll();

        return ServiceResult<UserDto>.Ok(
            await ToDtoAsync(user, ct), locked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
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

    /// <summary>
    /// Chặn thao tác lên tài khoản ngoài phạm vi. Trả null nghĩa là cho phép.
    ///
    /// Tài khoản không gắn cơ sở (<c>FacilityId == null</c>) là tài khoản cấp hệ thống nên
    /// quản trị cơ sở luôn bị chặn — khác hẳn danh mục và kho tri thức, nơi null nghĩa là
    /// dùng chung. Nhầm chỗ này thì admin cơ sở sửa được cả tài khoản quản trị hệ thống.
    /// </summary>
    private async Task<ServiceResult<T>?> GuardAsync<T>(AppUser user, CancellationToken ct)
    {
        var tenant = await _tenant.GetFilterAsync(ct);
        if (tenant.IsSystemScope || tenant.Allows(user.FacilityId))
        {
            return null;
        }
        return ServiceResult<T>.Fail("Tài khoản này không thuộc phạm vi quản lý của bạn.", 403);
    }

    /// <inheritdoc cref="GuardAsync{T}(AppUser, CancellationToken)"/>
    private async Task<ServiceResult?> GuardAsync(AppUser user, CancellationToken ct)
    {
        var tenant = await _tenant.GetFilterAsync(ct);
        if (tenant.IsSystemScope || tenant.Allows(user.FacilityId))
        {
            return null;
        }
        return ServiceResult.Fail("Tài khoản này không thuộc phạm vi quản lý của bạn.", 403);
    }

    /// <summary>
    /// Chặn leo thang đặc quyền: quản trị cơ sở không được gán vai trò chứa quyền mà chính
    /// họ không có. Không có rào này thì lỗ hổng rất rẻ — admin cơ sở tự tạo một tài khoản,
    /// gán cho nó vai trò quản trị hệ thống, rồi đăng nhập bằng tài khoản đó.
    ///
    /// Quản trị hệ thống và tài khoản SuperAdmin đi qua tự do.
    /// </summary>
    private async Task<ServiceResult<T>?> GuardRoleEscalationAsync<T>(
        IReadOnlyList<string> roleNames, Guid? actorId, CancellationToken ct)
    {
        if (roleNames.Count == 0 || _tenant.IsSystemScope)
        {
            return null;
        }

        if (!actorId.HasValue)
        {
            return ServiceResult<T>.Fail("Không xác định được người thực hiện nên không gán được vai trò.", 403);
        }

        var actor = await _permissionCache.GetUserSnapshotAsync(actorId.Value, ct);
        if (actor == null)
        {
            return ServiceResult<T>.Fail("Không xác định được người thực hiện nên không gán được vai trò.", 403);
        }
        if (actor.IsSuperAdmin)
        {
            return null;
        }

        var granted = await (
            from r in _db.Roles
            where roleNames.Contains(r.Name!)
            join rp in _db.RolePermissions on r.Id equals rp.RoleId
            join p in _db.Permissions on rp.PermissionId equals p.Id
            select p.Code)
            .Distinct()
            .ToListAsync(ct);

        var missing = granted.Where(code => !actor.Codes.Contains(code)).OrderBy(c => c).ToList();
        if (missing.Count == 0)
        {
            return null;
        }

        // Nêu thẳng mã còn thiếu: người quản trị biết ngay phải xin quyền nào,
        // thay vì đoán mò giữa một vai trò có hàng chục quyền.
        return ServiceResult<T>.Fail(
            "Không thể gán vai trò có quyền vượt quá quyền của bạn. Quyền còn thiếu: "
                + string.Join(", ", missing.Take(5))
                + (missing.Count > 5 ? $" (và {missing.Count - 5} quyền khác)." : "."),
            403);
    }

    private async Task<UserDto> ToDtoAsync(AppUser user, CancellationToken ct)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var isLockedOut = await _userManager.IsLockedOutAsync(user);

        // Mã/tên cơ sở lấy từ cache cây đơn vị, không join thêm bảng. Web-admin chỉ hiện
        // cột này cho quản trị hệ thống.
        var facility = user.FacilityId.HasValue
            ? await _facilityTree.FindByIdAsync(user.FacilityId.Value, ct)
            : null;

        return new UserDto(
            user.Id, user.Email ?? string.Empty, user.FullName,
            user.IsActive, user.EmailConfirmed, isLockedOut, user.CreatedAt, roles.ToList(),
            user.FacilityId, facility?.Code, facility?.Name, user.IsSuperAdmin);
    }
}
