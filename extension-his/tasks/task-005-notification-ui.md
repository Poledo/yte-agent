# Task 005 - Notification UI

## Mục tiêu

Xây dựng hệ thống Notification UI cho AI Validation Agent.

Notification UI là lớp hiển thị duy nhất của Extension.

Module này chịu trách nhiệm:

- Highlight field có vấn đề.
- Hiển thị Assistant Bubble.
- Phát âm thanh cảnh báo.
- Chuẩn bị nền tảng cho Popup Chat sau này.

Task này KHÔNG thực hiện Validation.

Task này KHÔNG gọi Backend API.

Task này KHÔNG xử lý AI.

---

# User Story

Là người dùng,

Khi Extension phát hiện vấn đề,

Tôi muốn nhìn thấy ngay vị trí lỗi,

Đồng thời nhận được thông báo trực quan từ AI Assistant.

---

# Phạm vi

Task này chỉ xây dựng giao diện thông báo.

Không xử lý Rule.

Không xử lý Backend.

Không xử lý AI.

Không xử lý Popup Settings.

---

# Kiến trúc

NotificationManager

├── HighlightManager

├── AssistantBubble

└── SoundManager

NotificationManager là Entry Point duy nhất.

Mọi module khác chỉ gọi NotificationManager.

---

# NotificationManager

Public API

notify()

clear()

clearAll()

NotificationManager quyết định:

- Highlight
- Bubble
- Sound

---

# HighlightManager

Hiển thị trạng thái trên Field.

Hỗ trợ:

Error

Warning

Info

Success

Yêu cầu:

- Viền đỏ
- Viền vàng
- Viền xanh
- Không sửa layout của website
- Không làm thay đổi giá trị field

---

# AssistantBubble

Hiển thị Assistant ở góc dưới bên phải.

Style:

- Floating
- Có Avatar AI
- Có tiêu đề "ZeroCheck AI"
- Có nội dung thông báo
- Có nút đóng

Bubble:

- Chỉ hiển thị một Bubble tại một thời điểm.
- Khi có Notification mới thì cập nhật nội dung.
- Không tạo nhiều Bubble.

## Error List Display

Khi có nhiều errors:

- Hiển thị tất cả errors dưới dạng scrollable list.
- Mỗi error item bao gồm:
    - Tên field
    - Mức độ (error/warning/info)
    - Message
    - Suggestion (nếu có)
    - Nút dismiss (✕) để xóa error đó

Auto-remove error:

- Khi user sửa field sao cho validation pass → error tự động remove khỏi list.
- Badge hiển thị số lỗi hiện tại.
- Khi hết error → Bubble tự động ẩn.

Bubble gồm:

- Avatar AI
- Tiêu đề
- Error list (scrollable)
- Nút đóng

Bubble tự động ẩn sau khoảng 8 giây (chỉ khi không có error).

Nếu người dùng rê chuột vào Bubble thì tạm dừng đếm thời gian.

Nút "Giải thích":

Hiện tại chỉ phát sự kiện (event) hoặc callback.

KHÔNG gọi Backend API.

KHÔNG gọi AI.

Task sau sẽ xử lý logic của nút này.

---

# SoundManager

Hỗ trợ:

playWarning()

playError()

playSuccess()

mute()

unmute()

Âm thanh sử dụng file local.

Không sử dụng TTS.

Không gọi API.

---

# Notification Object

Notification bao gồm:

Field

Level

Title

Message

Suggestion (optional)

CanExplain (boolean)

Metadata (optional)

Timestamp

---

# Public API

NotificationManager.notify()

NotificationManager.clear()

NotificationManager.clearFieldError() - Clear error khi field validation pass

NotificationManager.clearAll()

HighlightManager.show()

HighlightManager.clear()

AssistantBubble.show()

AssistantBubble.hide()

AssistantBubble.update()

AssistantBubble.clearField() - Remove error cho field cụ thể

AssistantBubble.onExplain()

SoundManager.play()

---

# UI

Bubble nằm:

Bottom Right

Không che menu của website.

Luôn nổi trên website.

Sử dụng Shadow DOM hoặc namespace CSS để tránh xung đột CSS.

---

# Performance

Không render nhiều Bubble.

Không tạo duplicate DOM.

Không bind event nhiều lần.

Không phát nhiều âm thanh liên tục.

Nếu nhiều Notification xuất hiện liên tiếp:

- Chỉ phát âm thanh một lần trong khoảng thời gian ngắn.
- Bubble cập nhật nội dung mới.

---

# Important Implementation Notes

## Focus State Tracking

Để tránh show notification cho validation result không liên quan (khi user đã rời khỏi field):

- Track field focus state (Set<fieldId>)
- Field được thêm vào focus state khi:
    - Có focus event
    - Hoặc có field change event (đang được edit)
- Chỉ show validation result nếu field còn trong focus state
- Khi blur → remove field khỏi focus state (nhưng KHÔNG clear notification)

## Notification Persistence

Notification phải ở lại trên Bubble cho đến khi:

- User sửa field sao cho validation pass (auto-remove)
- Hoặc user click dismiss button (✕) để xóa thủ công
- Hoặc user click close Bubble (clearAll)

**Quan trọng**: Blur event KHÔNG được clear notification. Notification chỉ clear khi:

1. Validation pass (`clearFieldError()`)
2. User click dismiss (✕)
3. Bubble close/hide

## Validation Debounce

Để tránh multiple validation trigger khi user typing:

- Sử dụng debounce 300ms
- Mỗi field có một debounce timer riêng
- Khi field change lần mới → clear timer cũ, set timer mới
- Khi blur → cancel pending timer

## Error List Update

Mỗi khi có error thay đổi (thêm/xóa/dismiss):

- Call `updateErrorList()` để re-render error list HTML
- Update badge với số lỗi hiện tại (`activeErrors.size`)
- Nếu hết error → hide Bubble (nếu không có confirm)

---

# Deliverables

Tạo:

src/content/notification/

NotificationManager.ts

HighlightManager.ts

AssistantBubble.ts

SoundManager.ts

notification.css

assets/sounds/

warning.mp3

error.mp3

success.mp3

---

# Integration

Task này chỉ tích hợp với Change Tracker.

Tạm thời tạo dữ liệu giả để kiểm tra.

Ví dụ:

NotificationManager.notify({

field,

level: "warning",

title: "ICD",

message: "ICD này đã ngừng sử dụng.",

suggestion: "Đề nghị chọn ICD khác."

})

Không gọi Backend.

---

# Debug

Console:

[Notification] Warning

[Highlight] Show

[Bubble] Show

[Sound] Play

---

# Acceptance Criteria

✓ Extension Build thành công.

✓ Load Unpacked thành công.

✓ Không lỗi TypeScript.

✓ Không lỗi Console.

✓ Highlight đúng Field.

✓ Bubble hiển thị đúng.

✓ Bubble tự động ẩn khi hết error.

✓ Hiển thị tất cả errors trong list (không chỉ error cuối cùng).

✓ Error list scrollable khi có nhiều errors.

✓ Mỗi error có nút dismiss (✕) để xóa thủ công.

✓ Badge hiển thị số lỗi hiện tại.

✓ Auto-remove error khi field validation pass.

✓ Error list tự động cập nhật khi có error mới hoặc error bị xóa.

✓ Có thể đóng Bubble.

✓ Âm thanh phát đúng.

✓ Không tạo duplicate Bubble.

✓ Không duplicate Highlight.

## Focus State & Notification Persistence

✓ Focus state tracking: Track field đang focus hay không.

✓ Notification hiển thị khi user typing/sửa field.

✓ Notification KHÔNG clear khi user blur (leave field).

✓ Notification CHỈ clear khi:

- User sửa field validation pass
- User click dismiss button (✕)
- User close Bubble

✓ Khi user refocus field + sửa đúng → error auto-remove.

## Validation Debounce

✓ Debounce 300ms: Tránh multiple validation trigger khi typing.

✓ Mỗi field có timer riêng.

✓ Blur event cancel pending timer (nhưng không clear notification).

✓ Không show multiple notification cho cùng một error.

---

# Không được làm

Không Validation.

Không Rule Engine.

Không Backend API.

Không AI.

Không Popup Settings.

---

# Coding Rules

Tuân thủ SOLID.

Không duplicate code.

Không hardcode.

Module độc lập.

Code dễ đọc.

Không sửa module ngoài phạm vi Task.

---

# Hoàn thành Task

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa lỗi compile nếu có.
- Đảm bảo Extension hoạt động trên VNPT HIS.
- Kiểm tra Bubble.
- Kiểm tra Highlight.
- Kiểm tra Sound.

Tóm tắt:

- File tạo mới.
- File sửa.
- Chức năng đã hoàn thành.

Không thực hiện Task tiếp theo.

# ui enhancement

## Mục tiêu

Assistant UX

- Khi xuất hiện ValidationResult mới:
  • Panel tự mở.
  • Sau 5~8 giây tự thu gọn.
  • Chỉ tự mở khi lỗi xuất hiện lần đầu.
  • Không tự mở lặp lại nếu lỗi vẫn tồn tại.
  • Nếu có nhiều lỗi cùng lúc, chỉ mở một lần và hiển thị danh sách.

---

## Implementation

### AssistantBubble.ts - show() method

**Logic**:

1. Kiểm tra `errorCountBefore = activeErrors.size`
2. Thêm error vào activeErrors map
3. Nếu `errorCountBefore === 0` (chưa có lỗi nào):
    - Mở panel: `this.togglePanel()`
    - Schedule auto-hide: `this.scheduleHide()` (8 giây)
4. Nếu `errorCountBefore > 0` (đã có lỗi):
    - Chỉ cập nhật error list UI, không mở panel lại

**Behavior**:

- Lỗi **đầu tiên** xuất hiện → Panel **auto-open**
- Lỗi **thứ 2, 3, ...** xuất hiện (trước khi panel đóng) → Cập nhật UI, **không mở lại**
- Panel được **mở 1 lần duy nhất** cho chuỗi lỗi liên tiếp
- Sau 8 giây → Panel **auto-collapse** (errors vẫn visible trong badge + button blink)
- User **click button** → Panel mở thủ công (cancel auto-hide)

### AssistantBubble.ts - togglePanel() method

**Sửa logic**:

- **Remove**: `if (this.currentNotification) { this.scheduleHide() }` khi collapse
- **Reason**: Không cần schedule hide khi collapse, vì scheduleHide() được gọi từ show()

**Result**:

- Khi expand: Cancel auto-hide timeout (user đang xem)
- Khi collapse: Không làm gì (errors vẫn tồn tại trong badge)

---

## Acceptance Criteria

✅ Panel tự mở khi lỗi xuất hiện lần đầu
✅ Panel tự thu gọn sau 8 giây (AUTO_HIDE_DURATION)
✅ Không tự mở lặp lại nếu lỗi vẫn tồn tại
✅ Nhiều lỗi cùng lúc chỉ mở panel một lần
✅ User click button → panel mở thủ công (xóa auto-hide timeout)
✅ Build success: 39.58 kB, 26 modules
✅ Không có TypeScript errors
✅ Không có runtime errors trên console

---

## Files Changed

- `extension/src/content/notification/AssistantBubble.ts`:
    - Updated `show()` method: Track errorCountBefore, auto-open only on first error
    - Updated `togglePanel()`: Remove scheduleHide() call when collapsing

## Tested Scenarios

1. ✓ User types wrong value → Error shows, panel auto-opens, auto-closes after 8s
2. ✓ User continues typing (before panel closes) → Error updates, panel stays open
3. ✓ User closes panel manually before timeout → Badge still shows error count
4. ✓ User clicks button after panel closes → Panel opens manually (stops auto-hide)
5. ✓ Multiple errors → Panel opens once, shows all errors in scrollable list
