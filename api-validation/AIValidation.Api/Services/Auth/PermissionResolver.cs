using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Gộp quyền của user từ các role: join role_permissions với permissions.
/// </summary>
public sealed class PermissionResolver : IPermissionResolver
{
    private readonly AppDbContext _db;

    public PermissionResolver(AppDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<string>> GetPermissionsForRolesAsync(
        IEnumerable<string> roleNames, CancellationToken ct = default)
    {
        var names = roleNames.Distinct().ToList();
        if (names.Count == 0)
        {
            return Array.Empty<string>();
        }

        var codes = await (
            from role in _db.Roles
            where names.Contains(role.Name!)
            join rp in _db.RolePermissions on role.Id equals rp.RoleId
            join p in _db.Permissions on rp.PermissionId equals p.Id
            select p.Code)
            .Distinct()
            .ToListAsync(ct);

        return codes;
    }
}
