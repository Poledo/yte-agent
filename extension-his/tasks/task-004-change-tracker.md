# Task 004 - Change Tracker

## Mục tiêu

Xây dựng Change Tracker để theo dõi sự thay đổi của biểu mẫu trên trang web.

Change Tracker chịu trách nhiệm:

- Theo dõi DOM khi có phần tử mới xuất hiện.
- Theo dõi thay đổi giá trị của các field.
- Đồng bộ lại Field Registry.

Task này KHÔNG thực hiện Validation.

Task này KHÔNG gọi Backend API.

Task này KHÔNG Highlight.

---

# User Story

Là Content Script,

Tôi muốn tự động phát hiện khi biểu mẫu thay đổi,

Để luôn giữ Field Registry đồng bộ với giao diện.

---

# Phạm vi

Chỉ xây dựng Change Tracker.

Không xử lý Validation.

Không xử lý Popup.

Không xử lý AI.

Không xử lý Highlight.

---

# Kiến trúc

Change Tracker gồm:

- MutationWatcher
- EventBinder
- RegistryUpdater

FormAnalyzer chỉ scan.

Change Tracker quyết định khi nào cần scan lại.

---

# MutationWatcher

Sử dụng MutationObserver.

Theo dõi:

- childList
- subtree

Không theo dõi attributes.

Không theo dõi characterData.

Khi phát hiện node mới:

- Chỉ scan node mới.
- Không scan toàn bộ document.

Nếu node không chứa field thì bỏ qua.

---

# EventBinder

Đăng ký các sự kiện cho field:

- input
- change
- blur

Không dùng:

- keyup
- keypress
- polling
- setInterval

Khi field thay đổi:

- Cập nhật value vào Field Registry.
- Không gọi Validation.

---

# RegistryUpdater

Khi nhận event:

- Tìm FieldInfo tương ứng.
- Cập nhật value.
- Cập nhật trạng thái nếu cần.

Không validate.

Không highlight.

---

# Public API

ChangeTracker

start()

stop()

bindElement()

unbindElement()

---

# Yêu cầu

Không dùng polling.

Không dùng setInterval.

Không dùng setTimeout để quét DOM.

Chỉ sử dụng MutationObserver và Event.

---

# Performance

Không scan toàn bộ document khi có thay đổi.

Chỉ scan subtree vừa được thêm.

Không bind event nhiều lần cho cùng một element.

Không tạo duplicate listener.

---

# Deliverables

Tạo:

src/content/change-tracker/

ChangeTracker.ts

MutationWatcher.ts

EventBinder.ts

RegistryUpdater.ts

---

# Integration

Content Script phải:

Khởi tạo:

- FieldRegistry
- FormAnalyzer
- ChangeTracker

Luồng khởi động:

1. Scan toàn bộ document.
2. Đăng ký Event cho toàn bộ field.
3. Khởi động MutationObserver.

---

# Debug

Khi phát hiện node mới:

Console:

[Tracker] New node detected

Khi bind field:

[Tracker] Bind field: {id}

Khi field thay đổi:

[Tracker] Field changed: {id} = {value}

Khi Registry được cập nhật:

[Tracker] Registry updated

---

# Acceptance Criteria

✓ Extension Load Unpacked thành công.

✓ Build thành công.

✓ Không lỗi TypeScript.

✓ MutationObserver hoạt động.

✓ Không duplicate event listener.

✓ Registry luôn đồng bộ.

✓ Khi thêm field mới bằng JavaScript thì Registry tự cập nhật.

✓ Khi người dùng thay đổi giá trị thì Registry được cập nhật.

---

# Không được làm

Không gọi API.

Không Validation.

Không AI.

Không Highlight.

Không Popup.

Không Rule Engine.

---

# Coding Rules

Tuân thủ SOLID.

Mỗi class chỉ có một trách nhiệm.

Không duplicate code.

Không hardcode selector.

Không sửa module ngoài phạm vi Task.

Ưu tiên code dễ đọc.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa toàn bộ lỗi compile nếu có.
- Đảm bảo Extension Load Unpacked thành công.
- Kiểm tra Console không có lỗi.
- Tóm tắt:
    - File tạo mới.
    - File sửa.
    - Chức năng đã hoàn thành.

---

# Lỗi đã sửa (Fixes)

## 1. EventBinder không binding events sau scan

**Lỗi**:

- `changeTracker.start()` gọi `eventBinder.bindAll()` trước khi fields được scan
- Registry lúc đó còn trống → không có field để bind events
- Khi FormAnalyzer scan xong, fields thêm vào registry nhưng events không được listener
- Kết quả: Input field không trigger validation

**Fix**:

- Sau khi scan xong, nếu phát hiện fields mới → gọi lại `eventBinder.bindAll()`
- Expose `getEventBinder()` method trong ChangeTracker
- Call rebind sau mỗi scan cycle hoàn thành

**Files sửa**:

- `src/content/tracker/ChangeTracker.ts` - Thêm `getEventBinder()` method
- `src/content/index.ts` - Gọi `eventBinder.bindAll()` sau scan

## 2. Callback chưa support field changes

**Lỗi**: EventBinder không có cách để notify khi field thay đổi (để gọi validation)

**Fix**:

- Thêm `onFieldChange(callback)` method trong EventBinder
- Thêm callback array để support multiple listeners
- Gọi callback khi field value updated
- Integrate với ChangeTracker untuk forward callback

**Files sửa**:

- `src/content/tracker/EventBinder.ts` - Thêm callback mechanism
- `src/content/tracker/ChangeTracker.ts` - Expose `onFieldChange()` method

---
