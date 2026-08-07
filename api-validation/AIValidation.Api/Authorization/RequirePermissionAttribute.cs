using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization;

/// <summary>
/// Yêu cầu user có quyền chi tiết tương ứng để truy cập action/controller.
/// Đặt Policy = "perm:{code}"; policy này được PermissionPolicyProvider sinh
/// động và PermissionAuthorizationHandler kiểm tra claim "permission".
/// </summary>
/// <example>[RequirePermission("Document.Manage")]</example>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    /// <summary>Tiền tố quy ước cho các policy quyền động.</summary>
    public const string PolicyPrefix = "perm:";

    /// <summary>Mã quyền yêu cầu (dạng "Resource.Action").</summary>
    public string Permission { get; }

    public RequirePermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = PolicyPrefix + permission;
    }
}
