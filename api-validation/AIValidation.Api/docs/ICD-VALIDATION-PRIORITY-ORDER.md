# Cải Tiến Thứ Tự & Ưu Tiên Kiểm Tra ICD

## Tóm Tắt Thay Đổi
Các quy tắc ICD giờ đây được thực thi theo thứ tự ưu tiên chính xác để tối ưu hóa trải nghiệm người dùng.
Nếu ICD không tồn tại hoặc bị hủy, các kiểm tra khác sẽ bị bỏ qua (early exit).

## Thứ Tự Ưu Tiên Quy Tắc ICD (Cao → Thấp)

### **Ưu Tiên 1 (Quan Trọng Nhất): Kiểm tra Tồn Tại**
```
IcdExistsRule
├─ Kiểm tra: Mã ICD có tồn tại không?
├─ Lỗi trả về: ICD_NOT_FOUND
└─ Hành động: Nếu không tồn tại → DỪ NGAY, không kiểm tra gì khác
```

### **Ưu Tiên 2: Lỗi Nghiêm Trọng (Critical Error)**
```
IcdActiveRule
├─ Kiểm tra: Mã ICD còn hoạt động không? (chưa bị hủy)
├─ Lỗi trả về: ICD_CANCELLED
└─ Hành động: Nếu bị hủy → DỪ NGAY

IcdGenderCompatibilityRule
├─ Kiểm tra: Mã ICD phù hợp với giới tính bệnh nhân không?
├─ Lỗi trả về: ICD_GENDER_MISMATCH
└─ Hành động: Tiếp tục kiểm tra (nếu cần)

IcdDeathOnlyRule
├─ Kiểm tra: Mã ICD chỉ dành cho tử vong không?
├─ Lỗi trả về: ICD_DEATH_ONLY
└─ Hành động: Tiếp tục kiểm tra (nếu cần)
```

### **Ưu Tiên 3: Lỗi Khác (Thấp Hơn)**
```
IcdPrimaryDiagnosisRule
├─ Kiểm tra: Mã ICD có thể làm chẩn đoán chính không?
├─ Lỗi trả về: ICD_NOT_PRIMARY
└─ Hành động: Chỉ cảnh báo

IcdGenderRule
├─ Kiểm tra: Giới tính bệnh nhân phù hợp không? (bổ sung)
├─ Lỗi trả về: ICD_GENDER_MISMATCH
└─ Hành động: Chỉ cảnh báo

IcdAgeCompatibilityRule
├─ Kiểm tra: Tuổi bệnh nhân phù hợp không?
├─ Lỗi trả về: ICD_AGE_MISMATCH
└─ Hành động: Chỉ cảnh báo (ưu tiên thấp nhất)
```

## Early Exit Logic (Dừng Sớm)

Khi `IcdExistsRule` hoặc `IcdActiveRule` phát hiện ra lỗi, RuleEngine sẽ:
```
1. Thu thập lỗi (ICD_NOT_FOUND hoặc ICD_CANCELLED)
2. Ghi log: "Dừng kiểm tra vì tìm thấy lỗi ICD nghiêm trọng"
3. BỎ QUAT tất cả các quy tắc còn lại
4. Trả về ValidationResponse với chỉ lỗi nghiêm trọng
```

## Ví Dụ Thực Tế

### Scenario 1: ICD Không Tồn Tại
```
Input: icdCode = "ZZZ99"
└─ IcdExistsRule: ❌ Không tìm thấy
   ├─ Trả về: ICD_NOT_FOUND
   ├─ RuleEngine: Dừng ngay
   └─ Output: Chỉ lỗi ICD_NOT_FOUND (không kiểm tra tiếp)
```

### Scenario 2: ICD Bị Hủy
```
Input: icdCode = "A05.0" (giả sử bị hủy), gioitinh = 0 (Nam)
└─ IcdExistsRule: ✓ Tìm thấy
   └─ IcdActiveRule: ❌ Đã bị hủy
	  ├─ Trả về: ICD_CANCELLED
	  ├─ RuleEngine: Dừng ngay
	  └─ Output: Chỉ lỗi ICD_CANCELLED (không kiểm tra giới tính)
```

### Scenario 3: ICD Tồn Tại Nhưng Không Phù Hợp Giới Tính (Nam Nhưng Chỉ Dành Cho Nữ)
```
Input: icdCode = "A34" (nữ), gioitinh = 0 (Nam)
└─ IcdExistsRule: ✓ Tìm thấy
   └─ IcdActiveRule: ✓ Còn hoạt động
	  └─ IcdGenderCompatibilityRule: ❌ Không phù hợp
		 ├─ Trả về: ICD_GENDER_MISMATCH (Warning)
		 ├─ RuleEngine: Tiếp tục (ưu tiên thấp)
		 └─ IcdDeathOnlyRule: ✓ Kiểm tra xong
			└─ IcdPrimaryDiagnosisRule: ✓ Kiểm tra xong
			   └─ ...
	  └─ Output: Nhiều lỗi (gender + các lỗi khác)
```

## Tệp Được Cập Nhật

### 1. **Program.cs**
- Sắp xếp lại thứ tự đăng ký rule theo ưu tiên
- Thêm nhận xét giải thích từng ưu tiên
- Bao gồm `IcdGenderCompatibilityRule` và `IcdAgeCompatibilityRule`

### 2. **RuleEngine.cs**
- Thêm early exit logic:
  - Kiểm tra lỗi: `ICD_NOT_FOUND` hoặc `ICD_CANCELLED`
  - Nếu tìm thấy: ghi log và thoát khỏi vòng lặp rule
- Dịch tất cả log message sang tiếng Việt
- Hỗ trợ dừng sớm mà không làm hỏng validation flow

## Lợi Ích

✅ **Trải Nghiệm Người Dùng Tốt Hơn**
- Không nhận quá nhiều thông báo lỗi quy nhân
- Thông báo lỗi quan trọng nhất được ưu tiên

✅ **Hiệu Suất**
- Giảm số lần kiểm tra không cần thiết
- Dừng sớm khi tìm thấy lỗi nghiêm trọng

✅ **Tính Nhất Quán**
- Thứ tự kiểm tra luôn cố định
- Hành vi có thể dự đoán được

## Build Status
✅ **Build Successful** (0 lỗi) - Task hoàn tất

## Test Recommendations

### Test Case 1: ICD Không Tồn Tại
```json
{
  "icdVao": "ZZZ99",
  "gioitinh": 0,
  "namSinh": 1980
}
```
**Kỳ vọng:** Chỉ lỗi ICD_NOT_FOUND (không kèm lỗi ICD khác)

Lưu ý: đừng dùng `X99` làm ví dụ mã không tồn tại — đây là mã có thật
("Tấn công bằng vật sắc nhọn", flags=4).

### Test Case 2: ICD Bị Hủy
```json
{
  "icdVao": "C84.2",
  "gioitinh": 0,
  "namSinh": 1980
}
```
**Kỳ vọng:** Chỉ lỗi ICD_CANCELLED (không kèm lỗi ICD khác)

Các mã đã hủy dùng để test (flags=1): `C84.2`, `C83.4`, `C83.6`, `C85.0`, `C88.1`, `C91.2`.

**Quan trọng:** `IcdProvider.Exists()` chỉ kiểm tra sự tồn tại, không quan tâm mã đã hủy
hay chưa. Nếu gộp điều kiện `!IsCancelled` vào `Exists()`, mã đã hủy sẽ bị `IcdExistsRule`
báo nhầm thành ICD_NOT_FOUND và early-exit khiến `IcdActiveRule` không bao giờ chạy.

### Test Case 3: ICD Hợp Lệ Nhưng Có Lỗi Giới Tính
```json
{
  "icdVao": "A34",
  "gioitinh": 0,
  "namSinh": 1980
}
```
**Kỳ vọng:** Lỗi ICD_GENDER_MISMATCH + các lỗi khác (nếu có)

### Test Case 4: ICD Hoàn Toàn Hợp Lệ
```json
{
  "icdVao": "A00.0",
  "gioitinh": 0,
  "namSinh": 1980
}
```
**Kỳ vọng:** Không có lỗi ICD (hoặc chỉ lỗi từ các trường khác)
