Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-029

Check icd phù hợp với giới tính (dùng gioitinh = 0 là Nam, 1 là Nữ, hoặc cbgioitinh true là Nam, false là Nữ)
Ví dụ như Mã icd A34, B26.0†, B37.3†,... chỉ dành cho nữ, thì khi giới tính Nam thì sẽ thông báo. tương tự icd B26.0†, C60.0, C60 là chỉ dành cho Nam

và bạn đã check icd Cân mã cụ thể hơn chưa

trả về hướng dẫn ghi chú mã hóa

code js này như task-028 thôi, bạn cần đọc lại để phân tích thì đọc

Code JS tham chieu giong task-028, da tach ra file dung chung, xem:

    docs/analysis/icd-lookup-reference.js

