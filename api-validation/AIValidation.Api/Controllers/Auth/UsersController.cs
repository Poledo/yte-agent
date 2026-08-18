using AIValidation.Api.Models.Auth;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Quản trị người dùng. Yêu cầu quyền User.Manage cho toàn bộ endpoint.
/// </summary>
[Route("api/admin/users")]
public sealed class UsersController : AuthControllerBase
{
    private readonly IUserAdminService _service;

    public UsersController(IUserAdminService service)
    {
        _service = service;
    }

    /// <summary>Liệt kê người dùng (tùy chọn tìm theo email/tên).</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, CancellationToken ct)
        => Ok(await _service.ListAsync(search, ct));

    /// <summary>Chi tiết một người dùng.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => ToActionResult(await _service.GetAsync(id, ct));

    /// <summary>Tạo người dùng mới.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
        => ToActionResult(await _service.CreateAsync(request, CurrentUserId, ClientIp, ct));

    /// <summary>Cập nhật thông tin người dùng.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
        => ToActionResult(await _service.UpdateAsync(id, request, CurrentUserId, ClientIp, ct));

    /// <summary>Xóa người dùng.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => ToActionResult(await _service.DeleteAsync(id, CurrentUserId, ClientIp, ct));

    /// <summary>Gán danh sách vai trò cho người dùng (thay thế toàn bộ).</summary>
    [HttpPut("{id:guid}/roles")]
    public async Task<IActionResult> AssignRoles(Guid id, [FromBody] AssignRolesRequest request, CancellationToken ct)
        => ToActionResult(await _service.AssignRolesAsync(id, request, CurrentUserId, ClientIp, ct));

    /// <summary>Khóa tài khoản.</summary>
    [HttpPost("{id:guid}/lock")]
    public async Task<IActionResult> Lock(Guid id, CancellationToken ct)
        => ToActionResult(await _service.SetLockAsync(id, locked: true, CurrentUserId, ClientIp, ct));

    /// <summary>Mở khóa tài khoản.</summary>
    [HttpPost("{id:guid}/unlock")]
    public async Task<IActionResult> Unlock(Guid id, CancellationToken ct)
        => ToActionResult(await _service.SetLockAsync(id, locked: false, CurrentUserId, ClientIp, ct));
}
