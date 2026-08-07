using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization;

/// <summary>
/// Yêu cầu ủy quyền: user phải sở hữu quyền có mã <see cref="PermissionCode"/>.
/// </summary>
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionCode { get; }

    public PermissionRequirement(string permissionCode)
    {
        PermissionCode = permissionCode;
    }
}
