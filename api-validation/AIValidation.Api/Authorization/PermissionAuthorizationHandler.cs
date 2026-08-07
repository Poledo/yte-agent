using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization;

/// <summary>
/// Kiểm tra user có quyền yêu cầu hay không dựa trên claim "permission" trong
/// access token. SystemAdmin (có quyền System.Admin) được bỏ qua kiểm tra —
/// coi như toàn quyền.
/// </summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    /// <summary>Tên claim chứa mã quyền chi tiết.</summary>
    public const string PermissionClaimType = "permission";

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var permissionClaims = context.User.FindAll(PermissionClaimType);

        foreach (var claim in permissionClaims)
        {
            // SystemAdmin: toàn quyền, bỏ qua kiểm tra chi tiết
            if (claim.Value == Permissions.SystemAdmin ||
                claim.Value == requirement.PermissionCode)
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }
        }

        return Task.CompletedTask;
    }
}
