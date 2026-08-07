Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-027

Implement ICD validation rules using the official ICD master data.

Context

The folder

docs/analis/03_Icd_data/

contains the official ICD master data.

Files include:

- icd_meta.json
- icd_rows.json

These files are the only source of truth for ICD validation.

Requirements

1. Analyze the JSON structure first.
Do not make assumptions about field names.
Use the actual JSON schema found in the files.

2. Build an ICD Provider that loads the ICD master data into memory.
The data should be loaded once and reused for all validations.

3. Implement ICD validation rules based on the JSON data.

At minimum support:

- ICD code exists.
- ICD code is active (not expired, not cancelled).
- ICD is allowed to be used as the primary diagnosis.
- ICD is NOT allowed to be used as the primary diagnosis.
- ICD gender restriction.
- ICD death-only indicator (if defined in the data).
- Any additional validation flags found in the JSON.

4. Do not hardcode ICD codes.
All decisions must come from the JSON master data.

5. Each validation rule must return a ValidationIssue containing:
- RuleCode
- Severity
- Message
- Field
- SuggestedResolution (if applicable)

6. Register all ICD rules in the Rule Engine.

7. Rules should only execute when:
Trigger.Field == "icdVao"

8. Add detailed logging.

9. Keep the implementation SOLID and testable.

10. Add XML documentation.

Important

Do not call any AI model.

Do not use PromptBuilder.

Do not use LLM.

All validation must rely only on the ICD master data contained in:

docs/analis/03_Icd_data/

Thay vì tạo một IcdRule làm tất cả, hãy tách thành nhiều rule độc lập, ví dụ:

IcdExistsRule
IcdActiveRule
IcdPrimaryDiagnosisRule
IcdGenderRule
IcdDeathOnlyRule

Mỗi rule chỉ đảm nhiệm một trách nhiệm duy nhất (Single Responsibility Principle). Sau này nếu Bộ Y tế bổ sung quy định mới (ví dụ giới hạn theo tuổi, thai kỳ...), bạn chỉ cần thêm một rule mới mà không phải sửa các rule hiện có.