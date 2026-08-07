# DVKT (Dịch Vụ Kỹ Thuật) Knowledge

Thư mục này chứa dữ liệu tham chiếu về các dịch vụ kỹ thuật y tế.

## Dữ liệu được hỗ trợ:

- **services.json**: Danh sách các dịch vụ kỹ thuật
- **service-codes.json**: Mã codes cho các dịch vụ
- **service-categories.json**: Phân loại các dịch vụ

## Format:

Mỗi file JSON nên có cấu trúc:
```json
{
  "documents": [
	{
	  "name": "DVKT-001",
	  "category": "DVKT",
	  "content": "Siêu âm tim",
	  "metadata": {
		"version": "2024.01",
		"department": "Tim mạch"
	  }
	}
  ]
}
```

## Cách sử dụng:

- FileKnowledgeSource sẽ tự động phát hiện folder này
- Dữ liệu sẽ được load khi cần
- Hỗ trợ filtering theo department

## TODO:

- [ ] Thêm danh sách dịch vụ kỹ thuật đầy đủ
- [ ] Thêm giá dịch vụ (nếu cần)
- [ ] Thêm hướng dẫn thực hiện
