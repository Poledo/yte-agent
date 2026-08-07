using AIValidation.Api.Authorization;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Danh mục quyền (read-only) — quyền là danh mục cố định, seed lúc khởi động.
/// Dùng để hiển thị khi gán quyền cho vai trò. Yêu cầu quyền Role.Manage.
/// </summary>
[Route("api/admin/permissions")]
[RequirePermission(Permissions.RoleManage)]
public sealed class PermissionsController : AuthControllerBase
{
    private readonly IRoleAdminService _service;

    public PermissionsController(IRoleAdminService service)
    {
        _service = service;
    }

    /// <summary>Liệt kê toàn bộ quyền, gom theo nhóm (Group).</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _service.ListPermissionsAsync(ct));
}
