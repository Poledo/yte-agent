# Insurance (BHYT) Knowledge

Thư mục này chứa dữ liệu tham chiếu về Bảo hiểm Y tế.

## Dữ liệu được hỗ trợ:

- **insurance-codes.json**: Mã bảo hiểm
- **insurance-packages.json**: Các gói bảo hiểm
- **insurance-coverages.json**: Nội dung bảo hiểm

## Format:

Mỗi file JSON nên có cấu trúc:
```json
{
  "documents": [
	{
	  "name": "BHYT-001",
	  "category": "Insurance",
	  "content": "Bảo hiểm Y tế bắt buộc - Gói cơ bản",
	  "metadata": {
		"version": "2024.01",
		"coverage_rate": "0.8",
		"effective_date": "2024-01-01"
	  }
	}
  ]
}
```

## Cách sử dụng:

- FileKnowledgeSource sẽ tự động phát hiện folder này
- Dữ liệu sẽ được load khi cần
- Hỗ trợ lookup theo mã bảo hiểm

## TODO:

- [ ] Thêm mã bảo hiểm từ Bộ Lao động
- [ ] Thêm tỉ lệ thanh toán
- [ ] Thêm điều kiện coverage
