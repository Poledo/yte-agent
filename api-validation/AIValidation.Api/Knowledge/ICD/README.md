# ICD Knowledge

Thư mục này chứa dữ liệu tham chiếu về ICD (International Classification of Diseases).

## Dữ liệu được hỗ trợ:

- **icd-codes.json**: Danh sách ICD codes
- **icd-descriptions.json**: Mô tả chi tiết của ICD codes
- **icd-mappings.json**: Ánh xạ giữa ICD-9 và ICD-10 (tuỳ thuộc hệ thống)

## Format:

Mỗi file JSON nên có cấu trúc:
```json
{
  "documents": [
	{
	  "name": "ICD-10-A00.0",
	  "category": "ICD",
	  "content": "Cholera due to Vibrio cholerae 01, biovar cholerae",
	  "metadata": {
		"version": "2024.01",
		"language": "vi"
	  }
	}
  ]
}
```

## Cách sử dụng:

- FileKnowledgeSource sẽ tự động phát hiện folder này
- Dữ liệu sẽ được load khi cần và cache trong bộ nhớ
- Hỗ trợ multiple diseases entries

## TODO:

- [ ] Thêm dữ liệu ICD-10 đầy đủ
- [ ] Thêm bản dịch Tiếng Việt
- [ ] Thêm mapping với các code hệ thống khác
