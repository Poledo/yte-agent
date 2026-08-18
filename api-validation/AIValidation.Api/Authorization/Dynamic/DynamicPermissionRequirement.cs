using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>
/// Yêu cầu quyền với mã BIẾT TRƯỚC — sinh ra từ <see cref="PermissionAttribute"/>.
/// </summary>
public sealed class PermissionCodeRequirement : IAuthorizationRequirement
{
    /// <summary>Mã quyền bắt buộc phải có.</summary>
    public string Code { get; }

    public PermissionCodeRequirement(string code)
    {
        Code = code;
    }
}

/// <summary>
/// Yêu cầu quyền với mã TỰ TRA theo endpoint đang gọi — dùng cho mọi endpoint không
/// khai báo gì. Mã quyền chỉ biết được lúc chạy nên requirement này không mang dữ liệu.
/// </summary>
public sealed class DynamicPermissionRequirement : IAuthorizationRequirement
{
}
