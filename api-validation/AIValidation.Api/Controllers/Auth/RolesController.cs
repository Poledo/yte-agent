using AIValidation.Api.Models.Auth;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Quản trị vai trò và quyền của vai trò. Yêu cầu quyền Role.Manage.
/// </summary>
[Route("api/admin/roles")]
public sealed class RolesController : AuthControllerBase
{
    private readonly IRoleAdminService _service;

    public RolesController(IRoleAdminService service)
    {
        _service = service;
    }

    /// <summary>Liệt kê vai trò kèm danh sách quyền.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _service.ListAsync(ct));

    /// <summary>Chi tiết một vai trò.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => ToActionResult(await _service.GetAsync(id, ct));

    /// <summary>Tạo vai trò mới.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request, CancellationToken ct)
        => ToActionResult(await _service.CreateAsync(request, CurrentUserId, ClientIp, ct));

    /// <summary>Cập nhật vai trò.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
        => ToActionResult(await _service.UpdateAsync(id, request, CurrentUserId, ClientIp, ct));

    /// <summary>Xóa vai trò (không xóa được vai trò hệ thống).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => ToActionResult(await _service.DeleteAsync(id, CurrentUserId, ClientIp, ct));

    /// <summary>Gán danh sách quyền cho vai trò (thay thế toàn bộ).</summary>
    [HttpPut("{id:guid}/permissions")]
    public async Task<IActionResult> AssignPermissions(Guid id, [FromBody] AssignPermissionsRequest request, CancellationToken ct)
        => ToActionResult(await _service.AssignPermissionsAsync(id, request, CurrentUserId, ClientIp, ct));
}
