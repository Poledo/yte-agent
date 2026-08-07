# Task 001 - Khởi tạo Chrome Extension

## Mục tiêu

Khởi tạo project Chrome Extension sử dụng Manifest V3.

Đây chỉ là bước tạo skeleton của project.

Không implement bất kỳ logic nghiệp vụ nào.

---

# User Story

Là một lập trình viên,

Tôi muốn có một project Chrome Extension chuẩn,

Để có thể phát triển các module sau này.

---

# Phạm vi

Task này chỉ thực hiện:

- Tạo project
- Cấu trúc thư mục
- Manifest V3
- TypeScript
- Vite
- Build thành công
- Load được Extension trên Chrome

---

# Không nằm trong phạm vi

Không làm các chức năng sau:

- DOM Parser
- MutationObserver
- Event Manager
- Highlight
- Popup logic
- API Client
- Rule Engine
- AI
- Validation

---

# Kiến trúc thư mục

extension/

    public/

    src/

        background/

        content/

        popup/

        shared/

        types/

        utils/

    manifest.json

    package.json

    tsconfig.json

    vite.config.ts

---

# Yêu cầu

Sử dụng

- Manifest Version 3

- TypeScript

- Vite

Không sử dụng React.

Không sử dụng Vue.

Popup dùng HTML thuần.

---

# Manifest

Cần có

- name
- description
- version
- permissions
- host_permissions
- background
- content_scripts
- action

Không khai báo quyền dư thừa.

---

# Background

Tạo Service Worker.

Chưa cần xử lý logic.

---

# Content Script

Inject được vào mọi website.

Khi trang load xong

Console:

ZeroCheck AI Loaded

---

# Popup

Hiển thị

ZeroCheck AI

Version

Status

Không có chức năng.

---

# Build

npm run build

không có lỗi.

---

# Acceptance Criteria

- Build thành công

- Có thể Load Unpacked Extension

- Content Script hoạt động

- Popup mở được

- Background chạy

- Không có warning TypeScript

---

# Deliverables

Các file:

manifest.json

package.json

vite.config.ts

tsconfig.json

src/background/index.ts

src/content/index.ts

src/popup/index.html

src/popup/index.ts

README.md

---

# Không được làm

Không thêm business logic.

Không tự tạo module ngoài phạm vi.

Không viết code cho Task 002.
