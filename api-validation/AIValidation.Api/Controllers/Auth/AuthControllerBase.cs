using System.Security.Claims;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Lớp cơ sở cho các controller auth: tiện ích lấy userId, IP và chuyển
/// ServiceResult sang IActionResult với ProblemDetails tiếng Việt.
/// </summary>
[ApiController]
public abstract class AuthControllerBase : ControllerBase
{
    /// <summary>Lấy Id user hiện tại từ claim (null nếu chưa đăng nhập).</summary>
    protected Guid? CurrentUserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    /// <summary>Địa chỉ IP nguồn của request.</summary>
    protected string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();

    /// <summary>Chuyển ServiceResult không dữ liệu sang IActionResult.</summary>
    protected IActionResult ToActionResult(ServiceResult result, string? successMessage = null)
    {
        if (result.Succeeded)
        {
            return Ok(new { message = successMessage ?? result.Message });
        }
        return Problem(detail: result.Message, statusCode: result.StatusCode);
    }

    /// <summary>Chuyển ServiceResult có dữ liệu sang IActionResult.</summary>
    protected IActionResult ToActionResult<T>(ServiceResult<T> result)
    {
        if (result.Succeeded)
        {
            return Ok(new { message = result.Message, data = result.Data });
        }
        return Problem(detail: result.Message, statusCode: result.StatusCode);
    }
}
