namespace AIValidation.Api.Configuration;

/// <summary>
/// Configuration options cho Prompt Management.
/// 
/// Chứa cấu hình về vị trí các prompt files.
/// 
/// Được load từ appsettings.json section "Prompt".
/// 
/// Task-022: Support multiple prompt templates với placeholder engine.
/// </summary>
public class PromptOptions
{
    /// <summary>
    /// Thư mục chứa prompt files.
    /// 
    /// VD: "Prompts"
    /// Full path sẽ là: {ApplicationBaseDirectory}/Prompts
    /// 
    /// Thư mục này chứa các file:
    /// - system.md: System prompt (legacy, for backward compatibility)
    /// - validation.md: Validation rules (legacy, for backward compatibility)
    /// - output.md: Output schema (legacy, for backward compatibility)
    /// - validation.system.md: System prompt cho validation (Task-022)
    /// - validation.user.md: User prompt cho validation với placeholders (Task-022)
    /// - explanation.system.md: System prompt cho explanation (Task-022)
    /// - explanation.user.md: User prompt cho explanation với placeholders (Task-022)
    /// </summary>
    public string Folder { get; set; } = "Prompts";

    /// <summary>
    /// File name cho validation system prompt.
    /// 
    /// VD: "validation.system"
    /// File path: {Folder}/validation.system.md
    /// </summary>
    public string ValidationSystem { get; set; } = "validation.system";

    /// <summary>
    /// File name cho validation user prompt.
    /// 
    /// VD: "validation.user"
    /// File path: {Folder}/validation.user.md
    /// 
    /// User prompt hỗ trợ placeholders:
    /// - {{Patient}}: Thông tin bệnh nhân
    /// - {{Encounter}}: Thông tin khám bệnh
    /// - {{Diagnosis}}: Thông tin chẩn đoán
    /// - {{Procedure}}: Thông tin thủ thuật
    /// - {{Medicine}}: Thông tin thuốc
    /// - {{Knowledge}}: Thông tin tham chiếu
    /// </summary>
    public string ValidationUser { get; set; } = "validation.user";

    /// <summary>
    /// File name cho explanation system prompt.
    /// 
    /// VD: "explanation.system"
    /// File path: {Folder}/explanation.system.md
    /// </summary>
    public string ExplanationSystem { get; set; } = "explanation.system";

    /// <summary>
    /// File name cho explanation user prompt.
    /// 
    /// VD: "explanation.user"
    /// File path: {Folder}/explanation.user.md
    /// 
    /// User prompt hỗ trợ placeholders:
    /// - {{Question}}: Câu hỏi từ người dùng
    /// - {{Knowledge}}: Thông tin tham chiếu
    /// </summary>
    public string ExplanationUser { get; set; } = "explanation.user";
}
