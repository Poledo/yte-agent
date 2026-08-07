# Task 003 - Form Analyzer

## Mục tiêu

Xây dựng Form Analyzer để phân tích các biểu mẫu (form) trên trang web.

Module này có nhiệm vụ tìm tất cả các trường dữ liệu và tạo metadata cho từng field.

Module này KHÔNG thực hiện validate.

Module này KHÔNG gọi API.

Module này KHÔNG highlight.

---

# User Story

Là Content Script,

Tôi muốn phân tích toàn bộ form trên trang,

Để các module khác có thể sử dụng thông tin field.

---

# Phạm vi

Task này chỉ xây dựng Form Analyzer.

Không xử lý MutationObserver.

Không xử lý Event.

Không xử lý Validation.

Không xử lý Highlight.

---

# Kiến trúc

Form Analyzer gồm các thành phần

- Field Discovery
- Label Resolver
- Metadata Builder

Form Analyzer chỉ chịu trách nhiệm đọc DOM.

Không lưu trạng thái.

Field Registry sẽ chịu trách nhiệm lưu.

---

# Field Discovery

Tìm các control sau

- input
- textarea
- select

Không cần

- button
- iframe
- canvas

---

# Label Resolver

Ưu tiên tìm label theo thứ tự

1.

<label for="">

↓

2.

<label>

<input>

↓

3.

aria-label

↓

4.

placeholder

↓

5.

title

↓

6.

previousElementSibling

↓

7.

table cell

↓

8.

text gần nhất

Nếu không tìm được

label = ""

---

# Metadata Builder

Thu thập

- id
- name
- label
- type
- value
- placeholder
- required
- readonly
- disabled

Không validate.

Không format.

---

# Field Registry

Sau khi tạo FieldInfo

Đăng ký vào Field Registry.

Không lưu ở nơi khác.

---

# Public API

FormAnalyzer

scan()

scanNode()

scanElement()

Không expose DOM logic ra ngoài.

---

# Deliverables

Tạo

src/content/analyzer/

FieldDiscovery.ts

LabelResolver.ts

MetadataBuilder.ts

FormAnalyzer.ts

---

# Acceptance Criteria

Có thể

- Scan toàn bộ trang
- Scan một node
- Scan một element

Label Resolver hoạt động.

Không duplicate.

Compile thành công.

Không warning TypeScript.

---

# Không được làm

Không MutationObserver.

Không Event.

Không Validation.

Không API.

Không Highlight.

Không Popup.

Không AI.

# Sau khi xong ở trên thì tiếp

Hãy tích hợp Form Analyzer vào luồng khởi động của Extension.

Yêu cầu:

- Khởi tạo FieldRegistry.
- Khởi tạo FormAnalyzer.
- Khi Content Script được inject thì tự động scan toàn bộ trang.
- In ra Console:
    - Số lượng field tìm được.
    - Danh sách FieldInfo.
- Không thay đổi kiến trúc.
- Không thêm Validation.
- Không thêm MutationObserver.
- Build lại project và đảm bảo extension hoạt động.
