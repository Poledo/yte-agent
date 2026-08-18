using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>
/// Sinh policy ngay lúc chạy cho mọi mã quyền, thay cho việc phải khai báo trước từng
/// policy trong Program.cs. Mã quyền nằm trong CSDL nên không thể biết trước lúc build.
/// </summary>
public sealed class DynamicPermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallback;
    private readonly AuthorizationPolicy _dynamicFallbackPolicy;

    public DynamicPermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallback = new DefaultAuthorizationPolicyProvider(options);

        // Policy áp cho endpoint KHÔNG khai báo gì. Cố ý không gắn RequireAuthenticatedUser:
        // fallback policy của ASP.NET Core áp cho cả trang openapi, scalar, health check —
        // gắn vào đây là các trang đó cũng đòi đăng nhập. Việc "có cần đăng nhập không" để
        // DynamicPermissionHandler quyết theo đường dẫn (IncludeRoutePrefixes).
        _dynamicFallbackPolicy = new AuthorizationPolicyBuilder()
            .AddRequirements(new DynamicPermissionRequirement())
            .Build();
    }

    /// <summary>Policy mặc định cho <c>[Authorize]</c> trần: chỉ cần đăng nhập.</summary>
    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallback.GetDefaultPolicyAsync();

    /// <summary>Policy cho endpoint không khai báo gì.</summary>
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => Task.FromResult<AuthorizationPolicy?>(_dynamicFallbackPolicy);

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(PermissionAttribute.PolicyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var code = policyName[PermissionAttribute.PolicyPrefix.Length..];
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionCodeRequirement(code))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return _fallback.GetPolicyAsync(policyName);
    }
}
