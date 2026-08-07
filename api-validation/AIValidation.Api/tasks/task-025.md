Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-025

Implement the Rule Engine Core for AI Validation.

Current architecture:

Controller
→ ValidationService
→ PromptBuilder
→ LLM

must be refactored to:

Controller
→ ValidationService
→ RuleEngine
→ ValidationResponse

Do NOT implement any business rules yet.

Do NOT read ICD JSON.

Do NOT call AI.

Requirements

1. Create ValidationContext.

2. Create ValidationIssue.

3. Create IRule interface.

4. Create RuleEngine.

5. RuleEngine executes all registered rules.

6. ValidationService must use RuleEngine instead of directly calling PromptBuilder.

7. If there are no rules, return ValidationResponse with empty Issues.

8. Register RuleEngine through Dependency Injection.

9. Keep code SOLID.

10. Add XML documentation.

11. Keep existing folder structure.

12. Do not break existing API contract.

Output:

- RuleEngine
- IRule
- ValidationContext
- ValidationIssue
- Updated ValidationService