namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho JSON extractor - trích xuất JSON hợp lệ từ AI response.
///
/// Mục đích:
/// - Xử lý các định dạng AI response khác nhau:
///   * Markdown code block (```json ... ```)
///   * Text + JSON (description + JSON object)
///   * JSON thuần
///   * Khoảng trắng thừa
///
/// Extractor chỉ trích xuất và làm sạch, không deserialize hay validate logic.
/// </summary>
public interface IJsonExtractor
{
    /// <summary>
    /// Trích xuất JSON string từ AI response.
    ///
    /// Xử lý các trường hợp:
    /// - Markdown code block: ```json { ... } ``` → { ... }
    /// - Text + JSON: "Here is JSON: { ... }" → { ... }
    /// - JSON thuần: { ... } → { ... }
    /// - Khoảng trắng: "   { ... }   " → { ... }
    ///
    /// Process:
    /// 1. Loại bỏ khoảng trắng đầu/cuối
    /// 2. Phát hiện và loại bỏ Markdown code block nếu có
    /// 3. Tìm JSON object hợp lệ (bắt đầu '{' kết thúc '}')
    /// 4. Trả về JSON string
    ///
    /// Note: Chỉ trích xuất, không validate JSON syntax.
    /// </summary>
    /// <param name="response">AI response text cần trích xuất JSON.</param>
    /// <returns>JSON string đã trích xuất và làm sạch.</returns>
    /// <exception cref="InvalidOperationException">Nếu không tìm thấy JSON hợp lệ trong response.</exception>
    string Extract(string response);
}
