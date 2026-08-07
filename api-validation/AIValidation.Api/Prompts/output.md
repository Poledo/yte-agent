# Output Schema for Validation Response

## Schema Structure

Your response MUST be valid JSON with the following structure:

```json
{
  "isValid": boolean,
  "issues": [
	{
	  "code": "string - unique identifier for issue type",
	  "severity": "Error|Warning|Info",
	  "field": "string - name of affected field",
	  "message": "string - clear description in Vietnamese",
	  "suggestion": "string (optional) - how to fix the issue",
	  "canAutoFix": "boolean (optional) - whether system can auto-fix",
	  "fixValue": "string (optional) - corrected value if canAutoFix true"
	}
  ],
  "summary": "string - brief overall assessment in Vietnamese"
}
```

## Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| isValid | Boolean | Yes | true if no issues found, false if any issues exist |
| issues | Array | Yes | Array of validation issues found |
| summary | String | Yes | Brief summary of validation result (1-2 sentences in Vietnamese) |
| code | String | Yes | Unique identifier (FIELD_REQUIRED, INVALID_FORMAT, etc.) |
| severity | String | Yes | One of: Error, Warning, Info |
| field | String | Yes | Name of the field with issue |
| message | String | Yes | Clear explanation in Vietnamese |
| suggestion | String | No | How to correct the issue |
| canAutoFix | Boolean | No | True if system can auto-fix |
| fixValue | String | No | The corrected value (if canAutoFix=true) |

## Response States

### Valid Data (No Issues)
```json
{
  "isValid": true,
  "issues": [],
  "summary": "Dữ liệu hợp lệ, có thể tiếp tục xử lý."
}
```

### Single Issue Found
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "FIELD_REQUIRED",
	  "severity": "Error",
	  "field": "patientCode",
	  "message": "Mã bệnh nhân không được để trống",
	  "suggestion": "Vui lòng nhập mã bệnh nhân",
	  "canAutoFix": false
	}
  ],
  "summary": "Phát hiện 1 lỗi bắt buộc cần sửa trước khi tiếp tục."
}
```

### Multiple Issues
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "FIELD_REQUIRED",
	  "severity": "Error",
	  "field": "patientCode",
	  "message": "Mã bệnh nhân không được để trống",
	  "canAutoFix": false
	},
	{
	  "code": "INVALID_DATE_FORMAT",
	  "severity": "Error",
	  "field": "admissionDate",
	  "message": "Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD",
	  "suggestion": "Chuyển đổi thành 2025-01-15",
	  "canAutoFix": true,
	  "fixValue": "2025-01-15"
	},
	{
	  "code": "GENDER_MISMATCH",
	  "severity": "Error",
	  "field": "icdCode",
	  "message": "Chẩn đoán O80 chỉ áp dụng cho bệnh nhân nữ nhưng bệnh nhân này là nam",
	  "suggestion": "Kiểm tra lại mã chẩn đoán",
	  "canAutoFix": false
	}
  ],
  "summary": "Phát hiện 3 vấn đề cần xử lý: 2 lỗi bắt buộc và 1 điểm không khớp về giới tính."
}
```

## Common Issue Codes

| Code | Severity | Description |
|------|----------|-------------|
| FIELD_REQUIRED | Error | Required field is missing |
| INVALID_FORMAT | Error | Field format is invalid |
| INVALID_DATE_FORMAT | Error | Date not in YYYY-MM-DD |
| INVALID_NUMERIC_VALUE | Error | Non-numeric in numeric field |
| INVALID_CODE_FORMAT | Error | Code doesn't match expected format |
| GENDER_MISMATCH | Error | Gender-specific diagnosis mismatch |
| AGE_INAPPROPRIATE_DIAGNOSIS | Warning | Diagnosis not appropriate for age |
| INVALID_DATE_RANGE | Error | Date logic invalid (e.g., admission after discharge) |
| DRUG_NOT_FOUND | Warning | Drug not found in knowledge base |
| PROCEDURE_NOT_FOUND | Warning | Procedure not found in knowledge base |
| INVALID_INSURANCE_CODE | Warning | Insurance code is invalid |
| UNKNOWN_VALUE | Warning | Value not found in reference data |

## Validation Rules for Response

1. **Must be valid JSON** - Response must parse as valid JSON
2. **Must have required fields** - Top level must contain "isValid", "issues", and "summary"
3. **No markdown formatting** - No ```json code fences
4. **No explanations outside JSON** - Response should be JSON only
5. **Vietnamese messages** - All messages in Vietnamese
6. **Severity must be one of**: Error, Warning, Info
7. **Required fields in each issue**: code, severity, field, message
8. **Optional fields**: suggestion, canAutoFix, fixValue

## Processing Logic for Client

```
If isValid == true:
  - Form data is valid, proceed to submission

If issues have Error severity:
  - Block form submission
  - Display errors to user
  - Highlight affected fields

If issues have Warning severity:
  - Allow submission but with confirmation
  - Display warnings to user

If issues have Info severity:
  - Informational only, don't block submission
  - Display as informational messages

For each issue with canAutoFix=true:
  - Offer auto-fix option to user
  - Apply fixValue to field if accepted
```

## Examples of Well-Formed Responses

### Example 1: Valid Form
```json
{"isValid":true,"issues":[],"summary":"Dữ liệu hợp lệ."}
```

### Example 2: Required Field Missing
```json
{"isValid":false,"issues":[{"code":"FIELD_REQUIRED","severity":"Error","field":"patientCode","message":"Mã bệnh nhân không được để trống"}],"summary":"Phát hiện 1 lỗi bắt buộc."}
```

### Example 3: Multiple Issues with Auto-Fix
```json
{"isValid":false,"issues":[{"code":"INVALID_DATE_FORMAT","severity":"Error","field":"birthDate","message":"Ngày sinh phải là YYYY-MM-DD","suggestion":"Sử dụng định dạng YYYY-MM-DD","canAutoFix":true,"fixValue":"1980-05-15"},{"code":"GENDER_MISMATCH","severity":"Error","field":"icdCode","message":"Chẩn đoán O80 chỉ áp dụng cho nữ","canAutoFix":false}],"summary":"Phát hiện 2 vấn đề: 1 định dạng sai và 1 không khớp giới tính."}
```

## Critical Implementation Notes

1. **MUST respond with JSON only** - No markdown, no explanations
2. **MUST include isValid, issues, and summary fields** - All three are required
3. **MUST use correct severity levels** - Error, Warning, or Info only
4. **MUST use Vietnamese messages** - All user-facing text in Vietnamese
5. **MUST structure each issue properly** - Include all required fields
6. **MUST not assume data** - Flag missing/unclear data as errors, not assumptions
7. **isValid MUST match issues array** - If issues is empty, isValid must be true; if issues exist, isValid must be false
