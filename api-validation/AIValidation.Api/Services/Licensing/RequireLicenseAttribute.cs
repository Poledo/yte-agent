using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Licensing;

/// <summary>
/// Cổng kiểm khóa bản quyền cho các endpoint tiện ích gọi tới.
///
/// Đặt trên controller/action mà extension dùng. Mức siết do cấu hình
/// <c>Licensing:Mode</c> quyết định chứ không do attribute — nhờ vậy bật/tắt được
/// bằng cấu hình cụm, không phải sửa mã và deploy lại.
///
/// Cố ý KHÔNG dùng <c>[Authorize]</c>: khóa bản quyền là danh tính của CƠ SỞ KCB,
/// khác với tài khoản người dùng web admin (JWT). Hai cơ chế song song, không thay nhau.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class RequireLicenseAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var services = context.HttpContext.RequestServices;
        var options = services.GetRequiredService<IOptions<LicensingOptions>>().Value;
        var licenseContext = services.GetRequiredService<ILicenseContext>();

        var staffCode = context.HttpContext.Request.Headers["X-Staff-Code"].ToString();

        if (options.Mode == LicensingMode.Off)
        {
            // Vẫn phân giải khóa nếu client có gửi, để thống kê và sổ tính tiền
            // có dữ liệu ngay từ trước khi bật siết.
            await TryAttachAsync(context, options, licenseContext, staffCode);
            await next();
            return;
        }

        var resolution = await ResolveAsync(context, options);

        if (!resolution.IsValid)
        {
            var logger = services.GetRequiredService<ILogger<RequireLicenseAttribute>>();

            if (options.Mode == LicensingMode.Warn)
            {
                logger.LogWarning(
                    "Request tới {Path} không có khóa bản quyền hợp lệ ({Status}) — chế độ Warn nên vẫn phục vụ",
                    context.HttpContext.Request.Path, resolution.Status);
                licenseContext.Set(null, staffCode);
                await next();
                return;
            }

            logger.LogWarning(
                "Từ chối request tới {Path}: khóa bản quyền {Status}",
                context.HttpContext.Request.Path, resolution.Status);

            // 401 cho khóa thiếu/sai/hết hạn — client biết cần sửa phần khai báo khóa.
            context.Result = new ObjectResult(new { message = resolution.Message })
            {
                StatusCode = StatusCodes.Status401Unauthorized,
            };
            return;
        }

        licenseContext.Set(resolution.License, staffCode);
        await services.GetRequiredService<ILicenseResolver>()
            .TouchAsync(resolution.License!.Id, context.HttpContext.RequestAborted);

        await next();
    }

    /// <summary>Phân giải khóa từ header cấu hình.</summary>
    private static async Task<LicenseResolution> ResolveAsync(
        ActionExecutingContext context, LicensingOptions options)
    {
        var resolver = context.HttpContext.RequestServices.GetRequiredService<ILicenseResolver>();
        var key = context.HttpContext.Request.Headers[options.HeaderName].ToString();
        return await resolver.ResolveAsync(key, context.HttpContext.RequestAborted);
    }

    /// <summary>Gắn giấy phép nếu khóa hợp lệ, im lặng bỏ qua nếu không (chế độ Off).</summary>
    private static async Task TryAttachAsync(
        ActionExecutingContext context,
        LicensingOptions options,
        ILicenseContext licenseContext,
        string staffCode)
    {
        var key = context.HttpContext.Request.Headers[options.HeaderName].ToString();
        if (string.IsNullOrWhiteSpace(key))
        {
            licenseContext.Set(null, staffCode);
            return;
        }

        var resolution = await ResolveAsync(context, options);
        licenseContext.Set(resolution.IsValid ? resolution.License : null, staffCode);
    }
}
