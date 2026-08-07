# IRule Implementation Guide & Testing

## Overview

We have successfully implemented **8 concrete validation rules** from the rule catalog that are now active in the validation pipeline:

### Demographics Rules (DEM)
1. **DEM-R001: Date of Birth Validation** (`DateOfBirthValidationRule`)
   - Validates DOB is in past, age 0-150 years
   - Warning if age > 120

2. **DEM-R002: Full Name Required** (`FullNameValidationRule`)
   - Requires either fullName OR both firstName + lastName

3. **DEM-R003: Gender Field Validation** (`GenderValidationRule`)
   - Valid values: M, F, O, U

4. **DEM-R004: Patient Identity Requirement** (`PatientIdentityRequirementRule`)
   - At least one ID required: nationalId or passportNumber (Warning level)

5. **DEM-R005: National ID Format Validation** (`NationalIdFormatValidationRule`)
   - Validates Vietnamese ID format: X-XXXXXX-XXXXXX or 12-13 digits

### Contact Information Rules (CON)
6. **CON-R001: Required Contact Information** (`RequiredContactInformationRule`)
   - Requires both currentAddress and primaryPhone

7. **CON-R002: Phone Number Format Validation** (`PhoneNumberFormatValidationRule`)
   - Validates Vietnamese phone format (0XXX-XXXXXX or +84XXXXXXXXX)

8. **CON-R003: Email Format Validation** (`EmailFormatValidationRule`)
   - Validates email format if provided (Warning level)

---

## Architecture

### Rule Registration Flow
```
Program.cs
  ├─ AddScoped<DateOfBirthValidationRule>() ... (8 rule classes)
  └─ AddScoped<IRuleEngine, RuleEngine>(provider factory)
	   └─ Instantiates RuleEngine with all 8 IRule implementations
```

### Execution Flow
```
ValidationController.Validate(ValidationRequest)
  └─ ValidationService.ValidateAsync(request)
	  └─ RuleEngine.ExecuteAsync(request)
		  ├─ DateOfBirthValidationRule.ValidateAsync(request)
		  ├─ FullNameValidationRule.ValidateAsync(request)
		  ├─ GenderValidationRule.ValidateAsync(request)
		  ├─ ... (all 8 rules execute in sequence)
		  └─ Aggregate all ValidationIssue results
			  → Return ValidationResponse with all issues
```

---

## Test Cases

### Test 1: Valid Patient with All Required Fields

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "fullName"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

**Expected Response:**
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

### Test 2: Missing Full Name (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "fullName"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "NAME_REQUIRED",
	  "severity": "Error",
	  "field": "fullName",
	  "message": "Patient name is required (either Full Name or First Name + Last Name)",
	  "suggestion": "Please provide either a full name or both first and last names",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

### Test 3: Invalid Date of Birth - Future Date (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "dateOfBirth"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "2030-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "DOB_FUTURE_DATE",
	  "severity": "Error",
	  "field": "dateOfBirth",
	  "message": "Date of birth cannot be in the future",
	  "suggestion": "Please enter a valid birth date from the past",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

### Test 4: Age > 120 (Should Warn)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "dateOfBirth"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1880-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "AGE_EXCEEDS_120",
	  "severity": "Warning",
	  "field": "dateOfBirth",
	  "message": "Age exceeds 120 years (144 years) - please verify this is correct",
	  "suggestion": "Double-check the date of birth for accuracy",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

### Test 5: Invalid Gender (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Change",
	"field": "gender"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "X",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_GENDER",
	  "severity": "Error",
	  "field": "gender",
	  "message": "Invalid gender value 'X'. Must be: M (Male), F (Female), O (Other), U (Unspecified)",
	  "suggestion": "Select a valid gender value: M, F, O, or U",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

### Test 6: Invalid National ID Format (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "nationalId"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "INVALID-ID-123",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_ID_FORMAT",
	  "severity": "Error",
	  "field": "nationalId",
	  "message": "Invalid National ID format. Expected format: X-XXXXXX-XXXXXX or XXXXXXXXXXXX",
	  "suggestion": "Please enter a valid Vietnamese National ID (12 or 13 digits, with or without dashes)",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

### Test 7: Missing Contact Information (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "currentAddress"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "ADDRESS_REQUIRED",
	  "severity": "Error",
	  "field": "currentAddress",
	  "message": "Current address is required",
	  "suggestion": "Please enter the patient's current address",
	  "canAutoFix": false
	},
	{
	  "code": "PHONE_REQUIRED",
	  "severity": "Error",
	  "field": "primaryPhone",
	  "message": "Primary phone number is required",
	  "suggestion": "Please enter a valid phone number",
	  "canAutoFix": false
	}
  ],
  "summary": "2 error(s) found"
}
```

---

### Test 8: Invalid Phone Number Format (Should Fail)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "primaryPhone"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "123456"
  }
}
```

**Expected Response:**
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_PRIMARY_PHONE_FORMAT",
	  "severity": "Error",
	  "field": "primaryPhone",
	  "message": "Invalid primary phone format '123456'. Expected format for Vietnam: 0XXX-XXXXXX, +84XXXXXXXXX, or (0)XXX-XXXXXX",
	  "suggestion": "Please enter a valid Vietnamese phone number",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

### Test 9: No Patient ID (Should Warn)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "fullName"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678"
  }
}
```

**Expected Response:**
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "NO_PATIENT_ID",
	  "severity": "Warning",
	  "field": "nationalId",
	  "message": "No patient ID provided. At least one ID type (National ID or Passport) is recommended",
	  "suggestion": "Please provide either a National ID or Passport number for better patient identification",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

### Test 10: Invalid Email Format (Should Warn)

**Request Body:**
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "email"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "invalid.email@"
  }
}
```

**Expected Response:**
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "INVALID_EMAIL_FORMAT",
	  "severity": "Warning",
	  "field": "email",
	  "message": "Email format appears invalid: invalid.email@",
	  "suggestion": "Please enter a valid email address (e.g., patient@example.com)",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

## Key Features

### 1. Case-Insensitive Property Matching
All rules use `TryGetPropertyCaseInsensitive()` to handle JSON properties in any case:
- ✓ `dateOfBirth`, `DateOfBirth`, `DATEOFBIRTH`
- ✓ `gender`, `Gender`, `GENDER`
- ✓ Works with all field names

### 2. Flexible Field Name Support
Rules accept multiple possible field names for better compatibility:
- **National ID**: `nationalId`, `nationalID`, `national_id`
- **Passport**: `passportNumber`, `passport`, `passportNum`
- **Address**: `currentAddress`, `address`, `addressCurrent`
- **Phone**: `primaryPhone`, `phone`, `primaryPhoneNumber`

### 3. Severity Levels
- **Error**: Blocks saving (isValid = false)
- **Warning**: Allows saving but flags concerns (isValid = true with issues)

### 4. Rich Error Messages
Each validation issue includes:
- `code`: Machine-readable error code
- `severity`: Error or Warning
- `field`: Which field has the issue
- `message`: User-friendly message
- `suggestion`: How to fix it
- `canAutoFix`: Can system auto-correct (always false for now)

---

## XML130 Rules (v2)

Kiểm tra hồ sơ XML 130 (QĐ 130/QĐ-BYT) — interface riêng `IXml130Rule` (nhận `Xml130Hoso`, không dùng `ValidationRequest`), đăng ký DI collection trong Program.cs, orchestrate bởi `Xml130ValidationService`.

**Lớp 1 — FieldSpecValidator** (data-driven): kiểm tra 455 trường / 15 bảng theo `Knowledge/Xml130/field_specs.json` — required, kiểu số, độ dài tối đa, định dạng ngày (yyyyMMdd/yyyyMMddHHmm, chấp nhận tháng/ngày "00" cho NGAY_SINH), danh mục giá trị (enum + valueLabels). RuleId dạng `SPEC-{loại}-{bảng}`.

**Lớp 2 — Cross-field rules** (`Providers/Xml130/Rules/`):

1. **BhytCardRule** (`BHYT-CARD`, XML1-C001…C006): cấu trúc mã thẻ (2 chữ + 13 số hoặc 10 số định danh), GT_THE_TU ≤ GT_THE_DEN, thẻ hết hạn trước/giữa đợt điều trị, MA_DKBD 5 ký tự.
2. **TimeSequenceRule** (`TIME-SEQ`, XML1-T001…T006, XML2/XML3-T001…T003): ngày sinh ≤ vào viện, tuổi ≤ 120, vào ≤ ra, thanh toán ≥ ra, SO_NGAY_DTRI khớp (nội trú), khám ngoại trú < 5 phút, NGAY_YL/NGAY_TH_YL/NGAY_KQ trong đợt điều trị.
3. **FinancialRule** (`FINANCE`, XML1-F001…F005, XML2/XML3-F001…F005): thành tiền = SL×ĐG×tỷ lệ (sai số 1đ), tỷ lệ/mức hưởng 0–100, T_BHTT ≤ thành tiền, cơ cấu nguồn khớp tổng chi BH (sai số 5đ), T_THUOC/T_VTYT khớp chi tiết, số tiền âm.
4. **DiagnosisRule** (`DIAGNOSIS`, XML1-D001…D010, XML2/XML3-D001): ICD-10 regex, trùng/lặp mã, mã bệnh dòng chi tiết ⊆ chẩn đoán hồ sơ; đối chiếu danh mục ICD trong DB (tồn tại, hiệu lực, giới tính, tuổi, được làm chẩn đoán chính + gợi ý mã con).
5. **LinkConsistencyRule** (`LINK`, {bảng}-L001…L004): MA_LK khớp XML1, MA_CSKCB khớp, HO_TEN/MA_THE_BHYT giấy tờ kèm theo khớp, thiếu bảng XML1.
6. **KcbLogicRule** (`KCB-LOGIC`, XML1-K001…K004, XML13-K001/K002, XML14-K001): logic nội/ngoại trú, giấy chuyển tuyến, hẹn khám lại, tử vong khớp loại ra viện.
7. **DuplicateLineRule** (`DUP-LINE`, XML2/XML3-DUP01): kê trùng trong MỘT hồ sơ — cùng MA_THUOC (XML2) hoặc MA_DICH_VU (XML3, loại dòng ngày giường) + cùng NGAY_YL xuất hiện nhiều dòng → dấu hiệu kê đôi, cảnh báo kèm tổng số lượng và danh sách dòng.

**Lớp 3 — Đối chiếu danh mục cơ sở KCB** (`Providers/Xml130/Rules/`, dữ liệu từ `catalog_items`):

7. **DrugCatalogRule** (`DRUG-CATALOG`, XML2-CAT001…CAT004): mã hoạt chất có trong danh mục thuốc của cơ sở; thuốc tạm ngưng; ngoài danh mục BHYT; đơn giá.
8. **ServiceCatalogRule** (`SERVICE-CATALOG`, XML3-CAT001…CAT003): mã DVKT có trong danh mục dịch vụ/CĐHA/xét nghiệm/giường của cơ sở; dịch vụ ngừng hoạt động; đơn giá BH.
9. **TransferCatalogRule** (`TRANSFER-CATALOG`, XML1-CAT010/011, XML13-CAT010/011): MA_NOI_DEN (XML1) và MA_CSKCB_DEN (XML13) có trong danh mục đơn vị chuyển tuyến của cơ sở; đơn vị đã ngừng hoạt động.
10. **StaffCatalogRule** (`STAFF-CATALOG`, XML2/XML3-CAT020): MA_BAC_SI, NGUOI_THUC_HIEN là số CCHN của nhân viên thuộc cơ sở. Số CCHN được chuẩn hóa bỏ số 0 ở đầu trước khi so ("004840/KH-CCHN" ≡ "4840/KH-CCHN") vì hồ sơ và danh mục HIS ghi khác nhau. Mức Cảnh báo (không phải Lỗi) vì danh mục nhân sự thường khai thiếu CCHN cho một phần nhân viên.

Riêng danh mục nhân viên và đơn vị chuyển tuyến: file HIS xuất ra **không có cột mã cơ sở**, nên khi nạp phải chỉ định `POST /api/catalog/import?facility=56006`. Không chỉ định thì hai rule này tự bỏ qua — tránh đem danh mục của cơ sở này đối chiếu hồ sơ cơ sở khác.

Hai đặc điểm quan trọng của lớp này:

- **Theo cơ sở KCB**: danh mục gắn với mã cơ sở (cột DVTT). Rule chỉ chạy khi đã nạp danh mục của đúng cơ sở trong hồ sơ (XML1.MA_CSKCB); chưa có thì bỏ qua và ghi log Information — tránh báo sai hàng loạt với hồ sơ của cơ sở chưa nạp danh mục.
- **Một mã ↔ nhiều dòng danh mục**: mã hoạt chất (vd 40.807) ứng với nhiều biệt dược khác giá (Metformin 500: 680đ, Metformin Denk: 600đ). Vì vậy rule lấy TẤT CẢ dòng cùng mã: chỉ báo tạm ngưng/ngoài danh mục khi mọi dòng đều vậy, và đơn giá hợp lệ nếu khớp bất kỳ dòng nào (thông báo nêu khoảng giá).

Catalog nghiệp vụ đầy đủ (100 rule, cả những rule chưa hiện thực bằng C#): `Knowledge/Xml130/cross_field_rules.json`, expose qua `GET /api/xml130/rules`.

**Lớp 4 — Đối chiếu CHÉO giữa nhiều hồ sơ / nhiều file** (`Providers/Xml130/CrossRules/`, interface `IXml130CrossFileRule`, orchestrate bởi `Xml130BatchValidationService`, endpoint `POST /api/xml130/validate-batch` nhận nhiều file multipart):

11. **BedOverlapCrossRule** (`CROSS-GIUONG`): hai bệnh nhân khác nhau trùng khoa + trùng mã giường (XML3.MA_KHOA + MA_GIUONG) với khoảng nằm giường giao nhau. Khoảng nằm = NGAY_TH_YL → NGAY_KQ (thiếu thì + SO_LUONG ngày). Giao < 4 giờ coi là bàn giao giường trong ngày, bỏ qua; ≥ 24 giờ là Lỗi. Case xuất toán gốc: "Nhiều người nằm trên 1 giường trong 1 ngày tại một Khoa".
12. **DoctorTimeOverlapCrossRule** (`CROSS-BACSI`, `CROSS-BACSI-YL`): (a) cùng NGUOI_THUC_HIEN có 2 khoảng thực hiện DVKT giao nhau (hoặc trùng phút bắt đầu) trên 2 hồ sơ khác nhau — Lỗi; (b) cùng MA_BAC_SI ra y lệnh trùng đến từng phút trên ≥ 2 bệnh nhân — Cảnh báo (dấu hiệu sao chép y lệnh). Chỉ so mốc thời gian đủ 12 ký tự (có giờ:phút); loại dòng ngày giường. Case gốc: "Bác sĩ thực hiện y lệnh 2 nhóm DVKT tại một thời điểm (phút)", "Giờ y lệnh giống nhau (phút) cùng 1 BS".
13. **PatientEpisodeOverlapCrossRule** (`CROSS-BENHNHAN`, `CROSS-BENHNHAN-TS`): cùng mã thẻ BHYT có 2 đợt điều trị [NGAY_VAO, NGAY_RA] chồng nhau — Lỗi (case "Trùng chi phí tiền giường giữa 2 đợt điều trị"); > 2 hồ sơ trong cùng một tháng — Cảnh báo rà soát (case "Bệnh mãn tính KCB nhiều hơn 2 lần trong 1 tháng").
14. **DrugRefillOverlapCrossRule** (`CROSS-THUOC`): bệnh nhân lĩnh lại cùng MA_THUOC khi đợt cấp trước chưa dùng hết. Số ngày dùng ƯỚC LƯỢNG = SO_LUONG ÷ (liều mỗi lần × số lần/ngày parse từ LIEU_DUNG/CACH_DUNG); chỉ áp cho đơn vị đếm được (viên/gói/ống...), dạng lọ/tuýp bỏ qua; chỉ so hai lần lĩnh KHÁC hồ sơ (nội trú cấp hằng ngày cùng hồ sơ là bình thường); ước > 120 ngày coi là parse sai, bỏ qua.
15. **PatientSimultaneousServiceCrossRule** (`CROSS-BN-2NOI`): một bệnh nhân có 2 dịch vụ thực hiện tại HAI KHOA khác nhau với khung giờ giao nhau (so cả các dòng trong cùng hồ sơ). Loại dòng ngày giường và nhóm xét nghiệm (MA_NHOM=1 — giờ chạy mẫu, bệnh nhân không cần có mặt); mỗi cặp khoa một bệnh nhân chỉ báo một lần.

Đặc điểm lớp này: rule chạy trên TOÀN BỘ hồ sơ của lô (gộp mọi file, kể cả nhiều hồ sơ trong một file); mỗi vấn đề (`Xml130CrossIssue`) thuộc về một NHÓM hồ sơ kèm tên file, không thuộc hồ sơ đơn lẻ; mỗi rule tự chặn tối đa 100 vấn đề để kết quả không ngập khi dữ liệu lỗi hàng loạt. Endpoint validate đơn lẻ không chạy lớp này — extension tự chuyển sang validate-batch khi người dùng kiểm tra từ 2 file trở lên.

Quy ước phân xử xung đột (`CrossAnchor.Pick`): luôn chọn đúng MỘT hồ sơ làm GỐC (`PhatSinhTruoc = true`, coi là hợp lệ) theo 3 nấc — thời điểm nghiệp vụ sớm hơn → giờ tiếp nhận XML1.NGAY_VAO sớm hơn → MA_LK đứng trước; các hồ sơ còn lại là bên cần rà soát. Response còn có `Files[].ConflictWith` — danh sách file khác có hồ sơ đụng với file đó, suy ra từ CrossIssues — để UI vẽ sơ đồ "file nào xung đột với file nào" (hỗ trợ cả nhóm hơn 2 file).

Lớp này cũng chạy khi kiểm tra MỘT file: file XML 130 thường chứa nhiều hồ sơ nên `Xml130ValidationService` tự đối chiếu chéo giữa các hồ sơ trong file (kết quả ở `Xml130ValidationResponse.CrossIssues`). Khi kiểm tra lô, service được gọi với `crossCheck: false` — phần chéo chạy ở cấp lô trên toàn bộ hồ sơ của mọi file (bao phủ cả chéo trong từng file), tránh báo trùng hai lần.

---

## Next Steps

To implement more rules:

1. Create new rule class in `AIValidation.Api/Providers/Rules/[Category]/`
2. Implement `IRule` interface
3. Add to Program.cs service registration
4. Add to RuleEngine factory provider list

Example categories ready for implementation:
- **Diagnosis Rules (DIA)**: Diagnosis validation, ICD code validation
- **Medication Rules (MED)**: Drug interaction checking, dosage validation
- **Insurance Rules (INS)**: Insurance coverage validation
- **Medical History Rules (HIS)**: Allergy checking, chronic condition rules

---

