Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code hiện tại trước khi thực hiện thay đổi.

==================================================

Task-019

Mục tiêu:

Hoàn thiện ResponseProcessor để xử lý an toàn kết quả trả về từ LLM.

ResponseProcessor là tầng duy nhất chịu trách nhiệm chuyển AIResponse thành ValidationResponse.

Không sửa Controller.

Không sửa ValidationService.

Không sửa PromptBuilder.

Không sửa LLMProvider.

==================================================

1. Hoàn thiện IResponseProcessor

Method:

Task<ValidationResponse> ProcessAsync(
    AIResponse response,
    CancellationToken cancellationToken = default);

==================================================

2. ResponseProcessor

ResponseProcessor phải xử lý các trường hợp:

Case 1

AI trả JSON hợp lệ

↓

Deserialize thành ValidationResponse.

--------------------------------------------------

Case 2

AI trả:

```json
{
 ...
}
```

↓

Tự động loại bỏ Markdown.

--------------------------------------------------

Case 3

AI trả thêm lời giải thích trước hoặc sau JSON.

↓

Trích xuất phần JSON đầu tiên.

--------------------------------------------------

Case 4

AI trả JSON thiếu một số trường.

↓

Điền giá trị mặc định nếu hợp lý hoặc trả lỗi có kiểm soát.

--------------------------------------------------

Case 5

AI trả JSON không hợp lệ.

↓

Ghi log.

↓

Throw ResponseProcessingException.

==================================================

3. Validation

Sau khi Deserialize:

Kiểm tra tối thiểu:

- IsValid khác null.
- Issues khác null.
- Summary khác null.

Nếu thiếu:

Ghi log.

Throw ResponseProcessingException.

==================================================

4. Error Handling

Không để JsonException truyền trực tiếp ra ngoài.

Chuyển thành:

ResponseProcessingException.

==================================================

5. Logging

Ghi:

- FinishReason
- Token Usage (nếu có)
- Thời gian xử lý

Không ghi:

- API Key
- Prompt đầy đủ
- Dữ liệu nhạy cảm của bệnh nhân

==================================================

6. Unit Test (nếu project đã có test)

Chuẩn bị các test tối thiểu:

- JSON hợp lệ.
- JSON bọc trong Markdown.
- JSON có text trước/sau.
- JSON sai định dạng.
- JSON thiếu trường.

==================================================

Yêu cầu coding

- Async/Await.
- System.Text.Json.
- Nullable Reference Types.
- XML Summary.
- Không thêm business logic nghiệp vụ.
- Không sửa ValidationService.

==================================================

Sau khi hoàn thành

1. Giải thích vai trò của ResponseProcessor.

2. Giải thích cách xử lý các phản hồi không đúng định dạng từ AI.

3. Giải thích vì sao ResponseProcessor là nơi duy nhất thực hiện Deserialize.

4. Mô tả luồng:

AIResponse
↓

ResponseProcessor
↓

ValidationResponse

5. Chờ yêu cầu tiếp theo.