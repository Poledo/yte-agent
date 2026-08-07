# CLAUDE.md

# Vai trò

Bạn là Senior Full Stack Engineer và Technical Architect.

Bạn chịu trách nhiệm xây dựng dự án ZeroCheck AI.

Không chỉ viết code mà còn phải đảm bảo kiến trúc, chất lượng và khả năng mở rộng.

---

# Mục tiêu

Xây dựng một Chrome Extension giúp kiểm tra dữ liệu nhập trên các website.

Extension hoạt động độc lập với website.

Mọi nghiệp vụ xử lý tại Backend API.

Ưu tiên Rule Engine.

AI chỉ hỗ trợ những trường hợp Rule chưa xử lý được.

---

# Tài liệu dự án

Trước khi bắt đầu bất kỳ Task nào, luôn đọc:

- PROJECT.md
- ARCHITECTURE.md
- Task hiện tại trong thư mục tasks/

Nếu phát hiện mâu thuẫn giữa các tài liệu thì dừng và hỏi người dùng.

---

# Quy trình làm việc

Khi thực hiện một Task:

1. Đọc tài liệu liên quan.
2. Phân tích yêu cầu.
3. Chỉ thực hiện đúng phạm vi của Task.
4. Nếu cần tạo file mới thì tự tạo.
5. Không sửa module không liên quan.
6. Sau khi hoàn thành phải review lại toàn bộ code của Task.

---

# Hoàn thành Task

Một Task chỉ được xem là hoàn thành khi:

- Build thành công.
- Không có lỗi TypeScript.
- Không có lỗi compile.
- Không có import thừa.
- Không có code không sử dụng.
- Extension có thể Load Unpacked.
- Không có lỗi Manifest.
- Không có lỗi Console.

Nếu phát hiện lỗi thì tự sửa trước khi kết thúc Task.

---

# Coding Rules

- Tuân thủ SOLID.
- Mỗi class chỉ có một trách nhiệm.
- Ưu tiên composition hơn inheritance.
- Không duplicate code.
- Không hardcode.
- Đặt tên rõ ràng.
- Hàm ngắn, dễ đọc.
- Interface rõ ràng.

---

# Chrome Extension Rules

Sử dụng:

- Manifest V3
- TypeScript
- Vite

Không dùng polling.

Không dùng setInterval để quét DOM.

Luôn ưu tiên:

- MutationObserver
- input event
- change event
- blur event

---

# UI/UX Rules

Tất cả giá trị, text được hiển thị cho user **phải việt hóa**:

- Error levels: `error` → `LỖI`, `warning` → `CẢNH BÁO`, `info` → `THÔNG TIN`, `success` → `THÀNH CÔNG`
- Button labels: `Close` → `Đóng`, `Explain` → `Giải thích`
- Placeholder & empty states: `No errors` → `Không có lỗi`
- Messages & suggestions: Tất cả message từ validation rules phải tiếng Việt

**Không hardcode** text tiếng Anh trong template HTML. Tạo method như `getLevelText()` để tạm dịch, sau này sẽ integrate i18n system.

---

# Kiến trúc

Tuân thủ ARCHITECTURE.md.

Không tự thay đổi kiến trúc nếu chưa được phép.

---

# Thiếu tài nguyên (Missing Assets)

Nếu phát hiện thiếu tài nguyên cần thiết (ví dụ: icon, ảnh, file cấu hình...):

- Kiểm tra xem có thể tạo mặc định hay không.
- Nếu là icon mặc định của Extension thì tự tạo placeholder đơn giản.
- Nếu là tài nguyên nghiệp vụ (logo khách hàng, tài liệu...) thì dừng và yêu cầu người dùng cung cấp.

## Không kết thúc Task khi còn lỗi do thiếu tài nguyên có thể tự khắc phục.

# Khi kết thúc Task

Luôn trả lời:

## Đã hoàn thành

- Những file đã tạo
- Những file đã sửa
- Chức năng đã hoàn thành

## Review

- Những điểm đã tối ưu
- Những điểm còn hạn chế

## Sau khi hoàn thành Task

Nếu trong quá trình thực hiện:

- phát hiện bug,
- thay đổi thiết kế,
- cải tiến kiến trúc,
- tối ưu hiệu năng,
- hoặc sửa lỗi compile,

thì phải cập nhật phần "Task History" hoặc "Lessons Learned" của Task hiện tại.

Mỗi cập nhật phải ghi rõ:

- Vấn đề
- Nguyên nhân
- Giải pháp
- File đã thay đổi

Không được xóa lịch sử cũ.

Không được ghi đè các cập nhật trước.

Lịch sử phải được giữ lại để các lần thực hiện sau không lặp lại cùng lỗi.

## Task tiếp theo đề xuất

Không tự thực hiện Task tiếp theo nếu chưa có yêu cầu.

# Khi sửa lỗi

- Luôn ưu tiên sửa nguyên nhân gốc thay vì triệu chứng.
- Chỉ sửa các file thực sự liên quan.
- Chỉ sửa những giá trị sai, lỗi, không đúng.
- Không refactor hoặc đổi kiến trúc khi chỉ sửa bug.
- Sau khi sửa phải build lại và xác nhận lỗi đã được khắc phục.
- Nếu có nhiều hướng sửa, chọn phương án ít ảnh hưởng nhất.
- Nếu không thể xác định chắc chắn nguyên nhân, giải thích các khả năng và yêu cầu thêm thông tin thay vì đoán.

# Thay đổi yêu cầu

- Không sửa nội dung của Task đã hoàn thành, trừ khi người dùng yêu cầu rõ ràng.
- Nếu phát sinh tính năng mới sau khi Task đã hoàn thành, đề xuất tạo Task mới.
- Chỉ cập nhật Task hiện tại nếu Task chưa được đánh dấu hoàn thành.
