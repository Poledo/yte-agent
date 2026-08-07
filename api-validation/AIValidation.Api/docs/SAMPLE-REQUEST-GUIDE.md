# Sample Validation Request - Hướng Dẫn

## 📋 Cấu Trúc ValidationRequest

### 1. **page** (string, required)
Tên trang/chức năng trên HIS đang xử lý
- Ví dụ: `"DiagnosisPage"`, `"PatientRegistration"`, `"MedicineForm"`

### 2. **trigger** (TriggerInfo, required)
Thông tin về sự kiện kích hoạt validation

**Các trường:**
- `field` (string): Tên trường thay đổi, ví dụ: `"diagnosis_code"`
- `event` (enum): Loại sự kiện
  - `"Change"` - Dữ liệu trường thay đổi
  - `"Blur"` - Rời khỏi trường
  - `"Focus"` - Vào trường
  - `"Save"` - Lưu form

### 3. **context** (ValidationContext, required)
Thông tin ngữ cảnh

**Các trường:**
- `timestamp` (DateTime): Thời gian ISO 8601, ví dụ: `"2024-01-15T10:30:00Z"`
- `extensionVersion` (string): Phiên bản extension, ví dụ: `"1.0.0"`
- `sessionId` (string): ID phiên làm việc, ví dụ: `"sess_male_35_valid"`
- `userId` (string, nullable): ID người dùng, ví dụ: `"user_doctor_001"`

### 4. **form** (JsonElement, required)
Snapshot toàn bộ dữ liệu form - cấu trúc động (object)

Các section chính:
- **patient**: Thông tin bệnh nhân
  - `id`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `age`, `nationalId`
- **encounter**: Thông tin khám bệnh
  - `id`, `admissionDate`, `admissionTime`, `department`, `visitType`, `chiefComplaint`
- **diagnosis**: Danh sách chẩn đoán (array)
  - `code`, `name`, `type`, `icdVersion`, `severity`
- **procedure**: Danh sách thủ thuật (array)
  - `code`, `name`, `date`, `status`
- **medicine**: Danh sách thuốc (array)
  - `code`, `name`, `dose`, `frequency`, `duration`, `route`
- **insurance**: Thông tin bảo hiểm
  - `code`, `type`, `status`, `expiryDate`

---

## 📁 Các File Mẫu

### 1️⃣ `sample-validation-request.json`
**Bệnh nhân nam - Dữ liệu hợp lệ**

- Bệnh nhân: **Nam, 35 tuổi**
- Chẩn đoán: **I50 (Suy tim)**, E11 (Đái tháo đường)
- Thủ thuật: Điện tâm đồ, Siêu âm tim
- Thuốc: Lisinopril, Simvastatin, Metformin
- **Kiểm tra**: Dữ liệu toàn bộ hợp lệ with gender-specific rules

**Test**: Endpoint nên trả về `issues: []` (không có lỗi)

---

### 2️⃣ `sample-validation-request-female.json`
**Bệnh nhân nữ - Dữ liệu hợp lệ (có ICD O80)**

- Bệnh nhân: **Nữ, 28 tuổi**
- Chẩn đoán: **O80 (Chuyển dạ và sinh thường)** ✓ Hợp lệ cho nữ
- Thủ thuật: Siêu âm thai
- Thuốc: Vitamin D, Acid folic
- Thêm: Thông tin thai kỳ (28 tuần)
- **Kiểm tra**: ICD O80 chỉ áp dụng cho nữ - dữ liệu này hợp lệ

**Test**: Endpoint nên trả về `issues: []` (không có lỗi gender-specific)

---

### 3️⃣ `sample-validation-request-invalid.json`
**Bệnh nhân nam - Dữ liệu sai (gender mismatch)**

- Bệnh nhân: **Nam, 45 tuổi**
- Chẩn đoán: **O80** ❌ Sai! ICD O80 chỉ áp dụng cho nữ
- Dữ liệu khác: Bình thường
- **Kiểm tra**: AI phải phát hiện lỗi gender-specific

**Test**: Endpoint nên trả về issues với lỗi như:
```json
{
  "issues": [
	{
	  "code": "GENDER_MISMATCH",
	  "severity": "ERROR",
	  "field": "diagnosis.O80",
	  "message": "ICD O80 chỉ áp dụng cho bệnh nhân nữ, nhưng bệnh nhân này là nam"
	}
  ]
}
```

---

## 🧪 Cách Test Trên Scalar

### Bước 1: Mở Scalar UI
```
http://localhost:5075/scalar/v1
```

### Bước 2: Tìm endpoint
```
POST /api/Validation
```

### Bước 3: Copy JSON vào Request Body
Chọn một trong 3 file JSON mẫu ở trên

### Bước 4: Click "Send"

### Kết Quả Mong Đợi

| File | Kết Quả Mong Đợi |
|---|---|
| **sample-validation-request.json** | Status 200, `issues: []` hoặc validate thành công |
| **sample-validation-request-female.json** | Status 200, `issues: []` hoặc validate thành công |
| **sample-validation-request-invalid.json** | Status 200, `issues: [...]` với lỗi gender mismatch |

---

## 📝 Quy Tắc Validation

### Gender-Specific Codes
- **O80** (Chuyển dạ và sinh thường): Chỉ hợp lệ cho `Female`
- **N40** (Tăng sản lành tính tuyến tiền liệt): Chỉ hợp lệ cho `Male`

### Age-Appropriate
- Một số ICD chỉ áp dụng cho độ tuổi nhất định
- Ví dụ: Các ICD về bệnh lão hóa không nên có ở bệnh nhân trẻ

### Data Consistency
- Admission date phải trước discharge date
- Thủ thuật date phải trong khoảng admission-discharge
- Thuốc frequency và duration phải hợp lý

---

## 💡 Ghi Chú

### File Nào Để Test Thành Công?
- Dùng **`sample-validation-request.json`** hoặc **`sample-validation-request-female.json`**
- Cả hai đều không có lỗi dữ liệu

### File Nào Để Test Lỗi?
- Dùng **`sample-validation-request-invalid.json`**
- Sẽ phát hiện được lỗi gender-specific (O80 với bệnh nhân nam)

### Cách Extend
- Copy một file và thay đổi dữ liệu để test các scenario khác
- Ví dụ: Tuổi không phù hợp, thuốc không tương thích, v.v.

---

## 📊 Summary

```
✓ File 1: Male + Valid              → Use for happy-path testing
✓ File 2: Female + O80 + Valid      → Use for gender-specific testing
✓ File 3: Male + O80 + Invalid      → Use for error detection testing
```

**Bây giờ bạn có đầy đủ dữ liệu mẫu để test API Validation trên Scalar! 🚀**
