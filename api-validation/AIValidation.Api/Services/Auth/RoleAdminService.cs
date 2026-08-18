using System.Globalization;
using System.Text;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Auth;

/// <summary>Quản trị vai trò và quyền (yêu cầu quyền Role.Manage ở tầng controller).</summary>
public sealed class RoleAdminService : IRoleAdminService
{
    private readonly RoleManager<AppRole> _roleManager;
    private readonly AppDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IPermissionCache _permissionCache;

    public RoleAdminService(
        RoleManager<AppRole> roleManager,
        AppDbContext db,
        IAuditService auditService,
        IPermissionCache permissionCache)
    {
        _roleManager = roleManager;
        _db = db;
        _auditService = auditService;
        _permissionCache = permissionCache;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<RoleDto>> ListAsync(CancellationToken ct = default)
    {
        var roles = await _roleManager.Roles.OrderBy(r => r.Name).ToListAsync(ct);
        var result = new List<RoleDto>(roles.Count);
        foreach (var role in roles)
        {
            result.Add(await ToDtoAsync(role, ct));
        }
        return result;
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<RoleDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role == null)
        {
            return ServiceResult<RoleDto>.Fail("Không tìm thấy vai trò.", 404);
        }
        return ServiceResult<RoleDto>.Ok(await ToDtoAsync(role, ct));
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<RoleDto>> CreateAsync(
        CreateRoleRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResult<RoleDto>.Fail("Tên vai trò không được để trống.");
        }

        if (await _roleManager.RoleExistsAsync(request.Name))
        {
            return ServiceResult<RoleDto>.Fail("Vai trò đã tồn tại.", 409);
        }

        var role = new AppRole
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = await ResolveCodeAsync(request.Code, request.Name, ct),
            Description = request.Description,
            IsSystem = false,
        };

        var created = await _roleManager.CreateAsync(role);
        if (!created.Succeeded)
        {
            return ServiceResult<RoleDto>.Fail(string.Join(" ", created.Errors.Select(e => e.Description)));
        }

        if (request.Permissions is { Count: > 0 })
        {
            await ReplacePermissionsAsync(role.Id, request.Permissions, ct);
        }

        await _auditService.LogAsync("Role.Create", actorId, entityType: "Role", entityId: role.Id.ToString(),
            detail: role.Name, ipAddress: ip, ct: ct);

        return ServiceResult<RoleDto>.Ok(await ToDtoAsync(role, ct), "Tạo vai trò thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<RoleDto>> UpdateAsync(
        Guid id, UpdateRoleRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role == null)
        {
            return ServiceResult<RoleDto>.Fail("Không tìm thấy vai trò.", 404);
        }

        if (request.Description != null)
        {
            role.Description = request.Description;
        }

        var updated = await _roleManager.UpdateAsync(role);
        if (!updated.Succeeded)
        {
            return ServiceResult<RoleDto>.Fail(string.Join(" ", updated.Errors.Select(e => e.Description)));
        }

        await _auditService.LogAsync("Role.Update", actorId, entityType: "Role", entityId: role.Id.ToString(), ipAddress: ip, ct: ct);
        return ServiceResult<RoleDto>.Ok(await ToDtoAsync(role, ct), "Cập nhật vai trò thành công.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult> DeleteAsync(Guid id, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role == null)
        {
            return ServiceResult.Fail("Không tìm thấy vai trò.", 404);
        }

        if (role.IsSystem)
        {
            return ServiceResult.Fail("Không thể xóa vai trò hệ thống.", 400);
        }

        var deleted = await _roleManager.DeleteAsync(role);
        if (!deleted.Succeeded)
        {
            return ServiceResult.Fail(string.Join(" ", deleted.Errors.Select(e => e.Description)));
        }

        // Xóa vai trò kéo theo mọi dòng gán vai trò cho người dùng — ảnh chụp quyền
        // đang cache của họ lập tức sai.
        _permissionCache.InvalidateAll();

        await _auditService.LogAsync("Role.Delete", actorId, entityType: "Role", entityId: id.ToString(),
            detail: role.Name, ipAddress: ip, ct: ct);
        return ServiceResult.Ok("Đã xóa vai trò.");
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<RoleDto>> AssignPermissionsAsync(
        Guid id, AssignPermissionsRequest request, Guid? actorId, string? ip, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role == null)
        {
            return ServiceResult<RoleDto>.Fail("Không tìm thấy vai trò.", 404);
        }

        await ReplacePermissionsAsync(role.Id, request.Permissions ?? new List<string>(), ct);

        await _auditService.LogAsync("Role.AssignPermissions", actorId, entityType: "Role", entityId: role.Id.ToString(),
            detail: string.Join(",", request.Permissions ?? new List<string>()), ipAddress: ip, ct: ct);

        return ServiceResult<RoleDto>.Ok(await ToDtoAsync(role, ct), "Gán quyền thành công.");
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<PermissionGroupDto>> ListPermissionsAsync(CancellationToken ct = default)
    {
        var permissions = await _db.Permissions
            .AsNoTracking()
            .OrderBy(p => p.Category).ThenBy(p => p.Code)
            .ToListAsync(ct);

        return permissions
            .GroupBy(p => p.Category)
            .Select(g => new PermissionGroupDto(
                g.Key,
                g.Select(p => new PermissionDto(
                    p.Code, p.DisplayName, p.Category,
                    p.HttpMethod, p.Route, p.IsActive, p.IsSystem)).ToList()))
            .ToList();
    }

    /// <summary>
    /// Mã vai trò bất biến: lấy mã người dùng nhập, không có thì sinh từ tên. Trùng mã
    /// thì nối số thứ tự — cột này unique, để đụng nhau là thao tác tạo vỡ ở tầng CSDL
    /// với thông báo khó hiểu thay vì một mã hợp lệ.
    /// </summary>
    private async Task<string> ResolveCodeAsync(string? requested, string name, CancellationToken ct)
    {
        var seed = Slugify(string.IsNullOrWhiteSpace(requested) ? name : requested);
        if (seed.Length == 0)
        {
            seed = "ROLE";
        }
        else if (seed.Length > 40)
        {
            // Cột Code dài tối đa 50; chừa chỗ cho hậu tố "_99" khi trùng
            seed = seed[..40].TrimEnd('_');
        }

        var taken = await _db.Roles
            .Where(r => r.Code.StartsWith(seed))
            .Select(r => r.Code)
            .ToListAsync(ct);

        if (!taken.Contains(seed, StringComparer.OrdinalIgnoreCase))
        {
            return seed;
        }

        for (var i = 2; ; i++)
        {
            var candidate = $"{seed}_{i}";
            if (!taken.Contains(candidate, StringComparer.OrdinalIgnoreCase))
            {
                return candidate;
            }
        }
    }

    /// <summary>"Quản trị cơ sở" → "QUAN_TRI_CO_SO". Bỏ dấu tiếng Việt, giữ A-Z 0-9 và gạch dưới.</summary>
    private static string Slugify(string input)
    {
        var normalized = input.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            // Đ/đ không phải là D có dấu phụ nên bước bỏ dấu ở trên không chạm tới
            if (ch is 'Đ' or 'đ') { sb.Append('D'); continue; }

            if (char.IsAsciiLetterOrDigit(ch)) sb.Append(char.ToUpperInvariant(ch));
            else if (sb.Length > 0 && sb[^1] != '_') sb.Append('_');
        }

        return sb.ToString().Trim('_');
    }

    /// <summary>Thay thế toàn bộ quyền của role bằng tập mã hợp lệ được cung cấp.</summary>
    private async Task ReplacePermissionsAsync(Guid roleId, IReadOnlyList<string> permissionCodes, CancellationToken ct)
    {
        var codes = permissionCodes.Distinct().ToList();
        var validPermissions = await _db.Permissions
            .Where(p => codes.Contains(p.Code))
            .Select(p => p.Id)
            .ToListAsync(ct);

        var existing = await _db.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync(ct);
        _db.RolePermissions.RemoveRange(existing);

        foreach (var permissionId in validPermissions)
        {
            _db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId });
        }

        await _db.SaveChangesAsync(ct);

        // Không xóa cache thì người vừa được cấp quyền phải chờ hết TTL mới vào được,
        // còn người vừa bị thu quyền vẫn đi lọt suốt quãng đó — nguy hiểm hơn nhiều.
        _permissionCache.InvalidateAll();
    }

    private async Task<RoleDto> ToDtoAsync(AppRole role, CancellationToken ct)
    {
        var permissions = await (
            from rp in _db.RolePermissions
            where rp.RoleId == role.Id
            join p in _db.Permissions on rp.PermissionId equals p.Id
            orderby p.Code
            select p.Code)
            .ToListAsync(ct);

        return new RoleDto(
            role.Id, role.Name ?? string.Empty, role.Description, role.IsSystem, permissions, role.Code);
    }
}
