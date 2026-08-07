namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho Placeholder Engine - quản lý việc thay thế placeholders trong prompt templates.
/// 
/// Hỗ trợ các placeholder:
/// - {{Patient}}: Thông tin bệnh nhân (JSON)
/// - {{Encounter}}: Thông tin khám bệnh (JSON)
/// - {{Diagnosis}}: Thông tin chẩn đoán (JSON)
/// - {{Procedure}}: Thông tin thủ thuật (JSON)
/// - {{Medicine}}: Thông tin thuốc (JSON)
/// - {{Knowledge}}: Thông tin tham chiếu (Structured text)
/// - {{Question}}: Câu hỏi từ người dùng (Text)
/// 
/// Nếu placeholder không tồn tại trong context, sẽ được thay bằng chuỗi rỗng.
/// Không throw exception nếu placeholder không tìm thấy.
/// 
/// Task-022: Placeholder Engine cho Prompt Template System.
/// </summary>
public interface IPlaceholderEngine
{
    /// <summary>
    /// Thay thế các placeholders trong prompt template bằng giá trị thực tế.
    /// 
    /// Quy trình:
    /// 1. Tìm tất cả placeholders {{...}} trong template
    /// 2. Với mỗi placeholder, lấy giá trị từ context
    /// 3. Nếu placeholder không tồn tại trong context, thay bằng chuỗi rỗng
    /// 4. Trả về prompt đã thay thế
    /// </summary>
    /// <param name="template">Prompt template chứa placeholders.</param>
    /// <param name="context">Context chứa giá trị để thay thế placeholders. Key là tên placeholder (không có {{}})</param>
    /// <returns>Prompt với các placeholders đã được thay thế.</returns>
    string ReplacePlaceholders(string template, Dictionary<string, string> context);

    /// <summary>
    /// Kiểm tra xem template có chứa placeholder nào không.
    /// </summary>
    /// <param name="template">Prompt template để kiểm tra.</param>
    /// <returns>True nếu template chứa ít nhất một placeholder, false nếu không.</returns>
    bool HasPlaceholders(string template);

    /// <summary>
    /// Lấy danh sách tất cả placeholders trong template.
    /// </summary>
    /// <param name="template">Prompt template để kiểm tra.</param>
    /// <returns>List các placeholder names (không có {{}})</returns>
    IReadOnlyList<string> GetPlaceholders(string template);
}
