using AIValidation.Api.Models;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho JSON deserializer - chuyển đổi JSON string thành ValidationResponse.
///
/// Mục đích:
/// - Deserialize JSON string thành ValidationResponse object
/// - Validate cấu trúc dữ liệu:
///   * Tất cả required fields có giá trị
///   * Severity là enum hợp lệ (Error, Warning, Info)
///   * CanAutoFix là boolean
///   * ValidationIssue đầy đủ thông tin
/// - Xử lý lỗi nếu JSON không hợp lệ
///
/// Deserializer chỉ xử lý conversion, không làm sạch response text.
/// </summary>
public interface IJsonDeserializer
{
    /// <summary>
    /// Deserialize JSON string thành ValidationResponse.
    ///
    /// Process:
    /// 1. Parse JSON string to object
    /// 2. Validate ValidationResponse structure:
    ///    - Issues collection not null
    ///    - Each ValidationIssue has required fields (Code, Severity, Field, Message)
    ///    - Severity is valid enum value
    ///    - CanAutoFix is boolean
    /// 3. Return ValidationResponse DTO
    ///
    /// Note: Does not do cleanup or text extraction.
    /// </summary>
    /// <param name="json">JSON string to deserialize (extracted by IJsonExtractor).</param>
    /// <returns>ValidationResponse object with validated structure.</returns>
    /// <exception cref="InvalidOperationException">Nếu JSON không hợp lệ hoặc structure không match ValidationResponse.</exception>
    ValidationResponse Deserialize(string json);
}
