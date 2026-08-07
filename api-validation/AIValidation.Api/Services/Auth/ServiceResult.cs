namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Kết quả thao tác nghiệp vụ, mang thông báo tiếng Việt và mã HTTP gợi ý.
/// Tránh ném exception cho các lỗi nghiệp vụ thông thường (sai mật khẩu, trùng email...).
/// </summary>
public class ServiceResult
{
    public bool Succeeded { get; init; }

    /// <summary>Thông báo tiếng Việt cho người dùng.</summary>
    public string? Message { get; init; }

    /// <summary>Mã HTTP gợi ý khi thất bại (400, 401, 404, 409...).</summary>
    public int StatusCode { get; init; } = 200;

    public static ServiceResult Ok(string? message = null) =>
        new() { Succeeded = true, Message = message, StatusCode = 200 };

    public static ServiceResult Fail(string message, int statusCode = 400) =>
        new() { Succeeded = false, Message = message, StatusCode = statusCode };
}

/// <summary>Kết quả thao tác có dữ liệu trả về.</summary>
public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; init; }

    public static ServiceResult<T> Ok(T data, string? message = null) =>
        new() { Succeeded = true, Data = data, Message = message, StatusCode = 200 };

    public static new ServiceResult<T> Fail(string message, int statusCode = 400) =>
        new() { Succeeded = false, Message = message, StatusCode = statusCode };
}
