using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>Đăng ký tầng phân quyền động vào DI và pipeline.</summary>
public static class DynamicRbacExtensions
{
    /// <summary>
    /// Gói toàn bộ tầng phân quyền động: cấu hình, bộ quét, cache, policy provider,
    /// handler và bộ dựng phản hồi 403.
    /// </summary>
    public static IServiceCollection AddDynamicRbac(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RbacOptions>(configuration.GetSection(RbacOptions.SectionName));

        services.AddMemoryCache();

        services.AddSingleton<IPermissionCache, PermissionCache>();
        services.AddSingleton<IPermissionScanner, PermissionScanner>();
        services.AddSingleton<IAuthorizationPolicyProvider, DynamicPermissionPolicyProvider>();
        services.AddSingleton<IAuthorizationHandler, DynamicPermissionHandler>();
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, PermissionAuthorizationResultHandler>();
        services.AddSingleton<IHostedService, PermissionScannerHostedService>();

        return services;
    }

    /// <summary>
    /// Bật ghi nhật ký từ chối quyền. Phải gọi TRƯỚC <c>UseAuthorization()</c> để
    /// middleware này bọc ngoài tầng phân quyền và đọc được kết quả lúc request đi ra.
    /// </summary>
    public static IApplicationBuilder UseDynamicRbacAudit(this IApplicationBuilder app)
        => app.UseMiddleware<PermissionAuditMiddleware>();
}
