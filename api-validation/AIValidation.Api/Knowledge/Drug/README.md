# Drug (Thuốc) Knowledge

Thư mục này chứa dữ liệu tham chiếu về các loại thuốc.

## Dữ liệu được hỗ trợ:

- **drug-list.json**: Danh sách các loại thuốc
- **drug-interactions.json**: Tương tác thuốc
- **drug-allergies.json**: Dị ứng thuốc

## Format:

Mỗi file JSON nên có cấu trúc:
```json
{
  "documents": [
	{
	  "name": "Aspirin",
	  "category": "Drug",
	  "content": "Aspirin 100mg - chống viêm, giải sốt",
	  "metadata": {
		"version": "2024.01",
		"atc_code": "B01AC06",
		"warnings": ["Không dùng cho bệnh nhân dị ứng"]
	  }
	}
  ]
}
```

## Cách sử dụng:

- FileKnowledgeSource sẽ tự động phát hiện folder này
- Dữ liệu sẽ được load khi cần
- Hỗ trợ tìm kiếm thuốc theo tên, mã ATC

## TODO:

- [ ] Thêm danh sách thuốc từ Bộ Y tế
- [ ] Thêm tương tác thuốc
- [ ] Thêm contraindication
