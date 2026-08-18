using Microsoft.AspNetCore.Authorization;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>
/// Ghim một endpoint vào MỘT mã quyền cụ thể thay vì mã "{Controller}.{Action}" mặc định.
///
/// Bình thường KHÔNG cần khai gì: bộ quét tự sinh mã cho mọi action. Chỉ dùng attribute
/// này khi nhiều endpoint phải dùng chung một quyền — vd ba action xuất báo cáo đều
/// thuộc quyền "Report.Export" để người quản trị không phải tick ba ô.
/// </summary>
/// <example>[Permission("Report.Export")]</example>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class PermissionAttribute : AuthorizeAttribute
{
    /// <summary>Tiền tố quy ước cho policy quyền động.</summary>
    public const string PolicyPrefix = "perm:";

    /// <summary>Mã quyền yêu cầu.</summary>
    public string Code { get; }

    public PermissionAttribute(string code)
    {
        Code = code;
        Policy = PolicyPrefix + code;
    }
}

/// <summary>
/// Miễn kiểm tra quyền cho endpoint — dành cho webhook, endpoint máy-gọi-máy đã có cơ
/// chế xác thực riêng (khóa bản quyền, chữ ký), hoặc endpoint hạ tầng.
///
/// Bắt buộc nêu lý do: một endpoint bỏ qua phân quyền mà không ai nhớ vì sao là thứ
/// sẽ nằm im trong code nhiều năm cho tới lúc thành lỗ hổng.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class IgnorePermissionAttribute : Attribute
{
    /// <summary>Vì sao endpoint này không cần kiểm quyền.</summary>
    public string Reason { get; }

    public IgnorePermissionAttribute(string reason)
    {
        Reason = reason;
    }
}
