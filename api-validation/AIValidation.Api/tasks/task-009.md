# Prompt Task-009

Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ Models, Interfaces, Configuration, Prompt System, Knowledge Layer, AI Domain và LLM Provider đã được tạo ở các Task trước.

==================================================

Task-009

Mục tiêu:

Thiết kế tầng xử lý phản hồi từ AI.

Đổi tên ResponseParser thành ResponseProcessor.

ResponseProcessor chịu trách nhiệm:

- Làm sạch phản hồi từ AI.
- Trích xuất JSON hợp lệ.
- Deserialize thành ValidationResponse.
- Kiểm tra dữ liệu trả về.
- Báo lỗi nếu phản hồi không hợp lệ.

Không gọi AI.

Không sửa ValidationService.

==================================================

1.

Đổi:

IResponseParser

↓

IResponseProcessor

--------------------------------------------------

2.

Đổi:

ResponseParser

↓

ResponseProcessor

--------------------------------------------------

3.

Tạo Interface:

IJsonExtractor

Mục đích:

Tách JSON từ phản hồi AI.

Ví dụ xử lý:

- Markdown Code Block
- Text + JSON
- JSON thuần
- Khoảng trắng dư

Method:

string Extract(string response);

--------------------------------------------------

4.

Tạo Interface:

IJsonDeserializer

Method:

ValidationResponse Deserialize(
    string json);

--------------------------------------------------

5.

ResponseProcessor

Constructor Injection:

- IJsonExtractor
- IJsonDeserializer

Không deserialize trực tiếp.

Không dùng JsonSerializer trực tiếp.

==================================================

6.

Tạo:

JsonExtractor

JsonDeserializer

Chỉ skeleton.

Method chỉ throw NotImplementedException.

==================================================

7.

Dependency Injection

Đăng ký:

IResponseProcessor

IJsonExtractor

IJsonDeserializer

==================================================

Yêu cầu coding

- Không viết business logic.
- Không implement Extract.
- Không implement Deserialize.
- Constructor Injection.
- Nullable Reference Types.
- XML Summary.
- Namespace rõ ràng.

==================================================

Sau khi hoàn thành

1.

Giải thích kiến trúc mới.

2.

Giải thích vì sao ResponseProcessor không deserialize trực tiếp.

3.

Giải thích cách xử lý nếu AI trả:

- Markdown
- Text + JSON
- JSON lỗi

4.

Chờ yêu cầu tiếp theo.