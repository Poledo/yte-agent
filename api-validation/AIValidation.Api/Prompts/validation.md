# Validation Rules for Medical Form Data

## General Data Validation Rules

### 1. Required Fields
- **Rule**: All mandatory fields for the current page MUST be present
- **Action**: If required field is missing, flag as ERROR
- **Issue Code**: FIELD_REQUIRED
- **Message Template**: "{field} không được để trống (bắt buộc)"

### 2. Date Format Validation
- **Rule**: All date fields MUST be in YYYY-MM-DD format or empty
- **Action**: If date has invalid format, flag as ERROR
- **Issue Code**: INVALID_DATE_FORMAT
- **Message Template**: "Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD"
- **Auto-fix**: Attempt to convert if possible

### 3. Numeric Field Validation
- **Rule**: All numeric fields MUST be valid numbers
- **Action**: If non-numeric value in numeric field, flag as ERROR
- **Issue Code**: INVALID_NUMERIC_VALUE
- **Message Template**: "{field} phải là số"

### 4. Code Format Validation
- **Rule**: ICD codes must match standard format (alphanumeric, 3-10 chars)
- **Action**: If code format invalid, flag as ERROR
- **Issue Code**: INVALID_CODE_FORMAT
- **Message Template**: "Mã {field} không hợp lệ"

## Medical Logic Validation Rules

### 5. Gender-Specific Diagnosis Validation
- **Rule**: Some diagnoses are gender-specific (O80 female-only, N40 male-only)
- **Action**: If gender mismatch found, flag as ERROR
- **Issue Code**: GENDER_MISMATCH
- **Message Template**: "Chẩn đoán {icd_code} chỉ áp dụng cho bệnh nhân {gender}"
- **Example**: Patient male with O80 (childbirth) = ERROR

### 6. Age Appropriateness Validation
- **Rule**: Certain diagnoses are not age-appropriate
- **Action**: If age outside expected range, flag as WARNING
- **Issue Code**: AGE_INAPPROPRIATE_DIAGNOSIS
- **Message Template**: "Chẩn đoán {icd_code} không phù hợp với tuổi bệnh nhân ({age} tuổi)"

### 7. Date Logic Validation
- **Rule**: Admission date must be before discharge date
- **Action**: If invalid, flag as ERROR
- **Issue Code**: INVALID_DATE_RANGE
- **Message Template**: "Ngày vào viện không thể sau ngày ra viện"

### 8. Drug-Specific Validations
- **Rule**: Drugs must be validated against knowledge base if provided
- **Action**: If drug not found in knowledge, flag as WARNING
- **Issue Code**: DRUG_NOT_FOUND
- **Message Template**: "Thuốc '{drug_name}' không tìm thấy trong cơ sở dữ liệu"

### 9. Procedure Validation
- **Rule**: Procedures must be in standard DVKT format
- **Action**: If procedure not recognized, flag as WARNING
- **Issue Code**: PROCEDURE_NOT_FOUND
- **Message Template**: "Kỹ thuật/Thủ thuật '{procedure}' không tìm thấy"

### 10. Insurance Code Validation
- **Rule**: BHYT codes must be valid and authorized
- **Action**: If insurance code invalid, flag as WARNING
- **Issue Code**: INVALID_INSURANCE_CODE
- **Message Template**: "Mã BHYT '{bhyt_code}' không hợp lệ hoặc hết hạn"

## Severity Levels

- **Error**: Critical issue that prevents data processing or poses medical safety risk
- **Warning**: Non-critical issue that should be reviewed but doesn't block processing
- **Info**: Informational message for user awareness

## Output Requirements

For each validation issue found:
1. Assign unique issue code (FIELD_REQUIRED, INVALID_FORMAT, etc.)
2. Assign appropriate severity (Error, Warning, Info)
3. Specify affected field name
4. Provide clear Vietnamese message
5. Include suggestion for correction if applicable
6. Indicate if auto-fix is possible
7. Provide fixed value if auto-fix available

## Example Issues

```json
{
  "code": "FIELD_REQUIRED",
  "severity": "Error",
  "field": "patientCode",
  "message": "Mã bệnh nhân không được để trống"
}
```

```json
{
  "code": "GENDER_MISMATCH",
  "severity": "Error",
  "field": "icdCode",
  "message": "Chẩn đoán O80 (Đẻ thường) chỉ áp dụng cho bệnh nhân nữ",
  "suggestion": "Kiểm tra lại mã chẩn đoán hoặc giới tính bệnh nhân"
}
```

```json
{
  "code": "INVALID_DATE_FORMAT",
  "severity": "Error",
  "field": "admissionDate",
  "message": "Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD",
  "suggestion": "Chuyển đổi sang định dạng YYYY-MM-DD",
  "canAutoFix": true,
  "fixValue": "2025-01-15"
}
```
