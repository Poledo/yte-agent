using AIValidation.Api.Models;

namespace AIValidation.Api.Services.Interfaces;

/// <summary>
/// Interface cho dịch vụ xác thực dữ liệu chính.
/// 
/// Chịu trách nhiệm orchestrate toàn bộ quá trình xác thực:
/// - Phân tích request
/// - Thu thập knowledge nếu cần
/// - Xây dựng prompt
/// - Gọi AI Provider
/// - Parse kết quả
/// - Trả về ValidationResponse
/// </summary>
public interface IValidationService
{
    /// <summary>
    /// Thực hiện xác thực dữ liệu từ Chrome Extension.
    /// </summary>
    /// <param name="request">Yêu cầu xác thực chứa form data, trigger info, và context.</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Danh sách các vấn đề phát hiện được.</returns>
    Task<ValidationResponse> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default);
}
