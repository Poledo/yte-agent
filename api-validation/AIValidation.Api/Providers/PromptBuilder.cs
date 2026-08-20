using AIValidation.Api.Configuration;
using AIValidation.Api.Models;
using AIValidation.Api.Models.AI;
using AIValidation.Api.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Providers;

/// <summary>
/// Builder xây dựng AIRequest để gửi tới AI Provider.
/// 
/// Chịu trách nhiệm tổng hợp toàn bộ thông tin cần thiết thành một AIRequest hoàn chỉnh:
/// - System Prompt: Hướng dẫn cơ bản cho AI
/// - Validation Rules: Các luật xác thực ngành nghề
/// - Knowledge: Dữ liệu tham chiếu (ICD, thuốc, etc.)
/// - Form Snapshot: Dữ liệu trường cần xác thực
/// - Output Schema: Định dạng JSON kết quả mong muốn
/// - Model &amp; Temperature: Từ LLMOptions configuration
/// 
/// Prompt không được hard-code trong C#, được quản lý riêng qua IPromptLoader.
/// </summary>
public class PromptBuilder : IPromptBuilder
{
    private readonly IPromptLoader _promptLoader;
    private readonly IOptions<LLMOptions> _llmOptions;
    private readonly IOptions<ValidationOptions> _validationOptions;
    private readonly ILogger<PromptBuilder>? _logger;

    /// <summary>
    /// Khởi tạo PromptBuilder với PromptLoader dependency.
    /// </summary>
    /// <param name="promptLoader">Loader để đọc prompt files từ thư mục Prompts/.</param>
    /// <param name="llmOptions">LLM configuration (Model, Temperature, MaxTokens).</param>
    /// <param name="validationOptions">Validation configuration (EnableLogging, EnableCache).</param>
    /// <param name="logger">Optional logger cho debug logging.</param>
    public PromptBuilder(
        IPromptLoader promptLoader,
        IOptions<LLMOptions> llmOptions,
        IOptions<ValidationOptions> validationOptions,
        ILogger<PromptBuilder>? logger = null)
    {
        _promptLoader = promptLoader ?? throw new ArgumentNullException(nameof(promptLoader));
        _llmOptions = llmOptions ?? throw new ArgumentNullException(nameof(llmOptions));
        _validationOptions = validationOptions ?? throw new ArgumentNullException(nameof(validationOptions));
        _logger = logger;
    }

    /// <summary>
    /// Xây dựng AIRequest hoàn chỉnh để gửi tới AI Provider.
    /// 
    /// Quy trình:
    /// 1. Load System Prompt từ PromptLoader (system.md)
    /// 2. Load Validation Rules từ PromptLoader (validation.md)
    /// 3. Load Output Schema từ PromptLoader (output.md)
    /// 4. Kết hợp tất cả với Knowledge và Form Data
    /// 5. Xây dựng UserPrompt hoàn chỉnh
    /// 6. Build AIRequest object với Model, Temperature, MaxTokens từ LLMOptions
    /// 7. Return AIRequest ready cho LLMProvider
    /// 
    /// UserPrompt Structure (Task-017):
    /// 1. Patient Information Summary (Gender, Age, Form data)
    /// 2. Trang/Lĩnh vực xác thực (Page, Field, Event)
    /// 3. Knowledge Context
    ///    - Information about ICD, Procedures, Drugs, Rules
    ///    - Gender restrictions if any
    ///    - Applicable conditions
    /// 4. Validation Rules
    ///    - General rules to check
    ///    - Output format requirements
    /// 5. Output Schema
    ///    - JSON structure expected with issues array
    /// 6. Explicit Instruction
    ///    - What to validate
    ///    - How to respond (JSON only, no Markdown)
    /// </summary>
    /// <param name="request">Yêu cầu xác thực chứa form data và context.</param>
    /// <param name="knowledge">Dữ liệu tham chiếu từ KnowledgeProvider (structured).</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>AIRequest hoàn chỉnh sẵn sàng gửi tới AI Provider.</returns>
    public async Task<AIRequest> BuildPromptAsync(
        ValidationRequest request,
        IReadOnlyList<KnowledgeDocument> knowledge,
        CancellationToken cancellationToken = default)
    {
        // Step 1: Load System Prompt
        var systemPrompt = await _promptLoader.LoadAsync("system", cancellationToken);

        // Step 2: Load Validation Rules
        var validationRules = await _promptLoader.LoadAsync("validation", cancellationToken);

        // Step 3: Load Output Schema
        var outputSchema = await _promptLoader.LoadAsync("output", cancellationToken);

        // Step 4-5: Build UserPrompt by combining all components
        var userPrompt = BuildUserPrompt(request, knowledge, validationRules, outputSchema);

        // Log prompt if enabled (excluding sensitive data)
        if (_validationOptions.Value.EnableLogging && _logger != null)
        {
            _logger.LogDebug("Prompt built for page: {Page}, field: {Field}", request.Page, request.Trigger.Field);
            _logger.LogDebug("Knowledge documents included: {Count}", knowledge.Count);
        }

        // Step 6: Build AIRequest object with configuration from LLMOptions
        var llmConfig = _llmOptions.Value;
        var aiRequest = new AIRequest
        {
            SystemPrompt = systemPrompt,
            UserPrompt = userPrompt,
            Model = llmConfig.Model,
            Temperature = llmConfig.Temperature,
            MaxTokens = llmConfig.MaxTokens,
            Metadata = new Dictionary<string, string>
            {
                { "page", request.Page },
                { "trigger_field", request.Trigger.Field },
                { "timestamp", request.Context.Timestamp.ToString("O") },
                { "session_id", request.Context.SessionId }
            }
        };

        // Step 7: Return AIRequest
        return aiRequest;
    }

    /// <summary>
    /// Build the UserPrompt by combining form data, knowledge, rules, and output schema.
    ///
    /// Structure (Task-017):
    /// 1. Patient Information Summary
    ///    - Gender (critical for validation)
    ///    - Age, other relevant fields
    /// 2. Validation Context
    ///    - Page, Field, Event being validated
    /// 3. Knowledge Context (Organized by Category)
    ///    - ICD Information
    ///    - Procedure Information
    ///    - Drug Information
    ///    - Insurance Rules
    ///    - Guidelines
    /// 4. Validation Rules
    ///    - General rules to check
    ///    - Output format requirements
    /// 5. Output Schema
    ///    - JSON structure expected (MUST be JSON only)
    /// 6. Explicit Instruction
    ///    - What to validate
    ///    - Response format requirement (JSON ONLY, NO MARKDOWN)
    /// </summary>
    private static string BuildUserPrompt(
        ValidationRequest request,
        IReadOnlyList<KnowledgeDocument> knowledge,
        string validationRules,
        string outputSchema)
    {
        var prompt = new System.Text.StringBuilder();

        // 1. Patient Information Summary
        prompt.AppendLine("===== Thông tin bệnh nhân =====");
        prompt.AppendLine(request.Form.ToString());
        prompt.AppendLine();

        // 2. Validation Context
        prompt.AppendLine("===== Trang/Lĩnh vực xác thực =====");
        prompt.AppendLine($"- Page: {request.Page}");
        prompt.AppendLine($"- Trigger field: {request.Trigger.Field}");
        prompt.AppendLine($"- Trigger event: {request.Trigger.Event}");
        prompt.AppendLine();

        // 3. Knowledge Context - Organized by Category
        if (knowledge.Count > 0)
        {
            prompt.AppendLine("===== Thông tin tham chiếu =====");

            // Group knowledge by category
            var groupedByCategory = knowledge
                .GroupBy(k => k.Category)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Display ICD Knowledge
            if (groupedByCategory.TryGetValue("ICD", out var icdDocs))
            {
                prompt.AppendLine("## ICD (Mã bệnh):");
                foreach (var doc in icdDocs)
                {
                    prompt.AppendLine($"- Code: {doc.Metadata?["code"] ?? "N/A"}");
                    prompt.AppendLine($"  Name: {doc.Name}");
                    prompt.AppendLine($"  Content: {doc.Content}");
                    if (doc.Metadata?.TryGetValue("applicable_to", out var applicability) == true)
                    {
                        prompt.AppendLine($"  Applicable To: {applicability}");
                    }
                }
                prompt.AppendLine();
            }

            // Display Procedure Knowledge
            if (groupedByCategory.TryGetValue("Procedure", out var procDocs))
            {
                prompt.AppendLine("## Procedure (Kỹ thuật/Thủ thuật):");
                foreach (var doc in procDocs)
                {
                    prompt.AppendLine($"- Code: {doc.Metadata?["code"] ?? "N/A"}");
                    prompt.AppendLine($"  Name: {doc.Name}");
                    prompt.AppendLine($"  Content: {doc.Content}");
                }
                prompt.AppendLine();
            }

            // Display Drug Knowledge
            if (groupedByCategory.TryGetValue("Drug", out var drugDocs))
            {
                prompt.AppendLine("## Drug (Thuốc):");
                foreach (var doc in drugDocs)
                {
                    prompt.AppendLine($"- Code: {doc.Metadata?["code"] ?? "N/A"}");
                    prompt.AppendLine($"  Name: {doc.Name}");
                    prompt.AppendLine($"  Content: {doc.Content}");
                }
                prompt.AppendLine();
            }

            // Display Insurance Rules
            if (groupedByCategory.TryGetValue("Rule", out var ruleDocs))
            {
                prompt.AppendLine("## Insurance/Rules (Quy tắc/Bảo hiểm):");
                foreach (var doc in ruleDocs)
                {
                    prompt.AppendLine($"- Code: {doc.Metadata?["code"] ?? "N/A"}");
                    prompt.AppendLine($"  Name: {doc.Name}");
                    prompt.AppendLine($"  Content: {doc.Content}");
                }
                prompt.AppendLine();
            }

            // Display any other knowledge
            var displayedCategories = new[] { "ICD", "Procedure", "Drug", "Rule" };
            var otherCategories = groupedByCategory.Keys.Except(displayedCategories);
            foreach (var category in otherCategories)
            {
                if (groupedByCategory.TryGetValue(category, out var otherDocs))
                {
                    prompt.AppendLine($"## {category}:");
                    foreach (var doc in otherDocs)
                    {
                        prompt.AppendLine($"- Code: {doc.Metadata?["code"] ?? "N/A"}");
                        prompt.AppendLine($"  Name: {doc.Name}");
                        prompt.AppendLine($"  Content: {doc.Content}");
                    }
                    prompt.AppendLine();
                }
            }
        }

        // 4. Validation Rules
        prompt.AppendLine("===== Luật xác thực =====");
        prompt.AppendLine(validationRules);
        prompt.AppendLine();

        // 5. Output Schema & Requirements
        prompt.AppendLine("===== Định dạng JSON đầu ra =====");
        prompt.AppendLine(outputSchema);
        prompt.AppendLine();

        // 6. Task-Specific Instruction - CRITICAL: JSON ONLY
        prompt.AppendLine("===== Yêu cầu quan trọng =====");
        prompt.AppendLine("CRITICAL: Respond ONLY with valid JSON. Do not include any markdown, explanations, or text outside the JSON.");
        prompt.AppendLine("CRITICAL: Response must be parseable JSON with 'issues' array.");
        prompt.AppendLine("CRITICAL: No markdown code blocks (```json). Just raw JSON.");
        prompt.AppendLine();

        prompt.AppendLine("Dựa vào thông tin bệnh nhân, dữ liệu form, và thông tin tham chiếu:");
        prompt.AppendLine("1. Validate all form fields according to validation rules.");
        prompt.AppendLine("2. Check data types, formats, and required fields.");
        prompt.AppendLine("3. Validate codes (ICD, Drug, Procedure) against knowledge base if provided.");
        prompt.AppendLine("4. Check for logical consistency and medical appropriateness.");
        prompt.AppendLine("5. If any issue found, create an issue object with code, severity, field, and message.");
        prompt.AppendLine("6. Return response in JSON format ONLY with the issues array.");
        prompt.AppendLine("7. If no issues found, return {\"issues\": []}.");
        prompt.AppendLine();

        return prompt.ToString();
    }
}
