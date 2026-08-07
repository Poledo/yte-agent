# Task 002 - Field Registry

## Mục tiêu

Xây dựng Field Registry để quản lý toàn bộ các trường dữ liệu trên trang web.

Field Registry là nơi lưu trạng thái hiện tại của từng field.

Task này KHÔNG thực hiện quét DOM.

Task này KHÔNG gọi API.

Task này KHÔNG validate.

---

# User Story

Là Content Script,

Tôi muốn có một nơi lưu thông tin các field,

Để các module khác có thể truy cập thống nhất.

---

# Phạm vi

Chỉ xây dựng Field Registry.

Không implement module khác.

---

# Kiến trúc

Field Registry chỉ lưu dữ liệu.

Không xử lý nghiệp vụ.

Không xử lý UI.

Không biết API.

---

# Yêu cầu

Sử dụng TypeScript.

Không dùng thư viện ngoài.

Ưu tiên Map.

Không dùng object thường.

---

# Interface

FieldInfo

Bao gồm tối thiểu

- id
- name
- label
- type
- value
- required
- readonly
- disabled
- element

ValidationState

Bao gồm

- valid
- message

---

# Chức năng

FieldRegistry phải hỗ trợ

register()

unregister()

update()

get()

getAll()

clear()

exists()

size()

---

# Quy tắc

Một DOM Element chỉ được đăng ký một lần.

Nếu đăng ký lại thì update.

Không được duplicate.

---

# Deliverables

Tạo các file

src/shared/models/FieldInfo.ts

src/shared/models/ValidationState.ts

src/shared/registry/FieldRegistry.ts

---

# Acceptance Criteria

Có thể

Register

Update

Remove

Get

Get All

Không có duplicate.

Build thành công.

TypeScript không warning.

---

# Không được làm

Không quét DOM.

Không gọi API.

Không Highlight.

Không MutationObserver.

Không Event.

Không Validation.
