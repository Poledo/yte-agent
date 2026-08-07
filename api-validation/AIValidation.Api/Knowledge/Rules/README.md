# Rules Knowledge

Thư mục này chứa dữ liệu tham chiếu về các quy tắc validation nghiệp vụ y tế.

## Dữ liệu được hỗ trợ:

- **validation-rules.json**: Các quy tắc xác thực
- **business-rules.json**: Quy tắc nghiệp vụ
- **clinical-guidelines.json**: Hướng dẫn lâm sàng

## Format:

Mỗi file JSON nên có cấu trúc:
```json
{
  "documents": [
	{
	  "name": "Rule-001",
	  "category": "Rules",
	  "content": "Ngày nhập viện phải trước ngày xuất viện",
	  "metadata": {
		"version": "2024.01",
		"severity": "Error",
		"field": "AdmissionDate, DischargeDate"
	  }
	}
  ]
}
```

## Cách sử dụng:

- FileKnowledgeSource sẽ tự động phát hiện folder này
- Dữ liệu sẽ được load khi cần
- Hỗ trợ filtering theo severity

## TODO:

- [ ] Thêm quy tắc xác thực dữ liệu bắt buộc
- [ ] Thêm quy tắc xác thực logic giữa các trường
- [ ] Thêm hướng dẫn lâm sàng
