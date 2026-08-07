# Interaction Bible (Tổng quan tương tác)

Robot là **launcher** thay cho nút nổi 🤖 mặc định: bấm robot → mở/đóng panel trợ
lý. Điểm nối: `content/index.ts` (`robot.onActivate` → `assistantPanel.toggle`,
`assistantPanel.useExternalLauncher()`).

## Bản đồ tín hiệu vào → phản ứng

| Người dùng làm gì | Bắt ở đâu | Robot phản ứng |
|---|---|---|
| Di chuột quanh robot | `MouseTracker` | mắt/đầu nhìn theo; vào vùng → Hover (vẫy) |
| Đưa chuột lên rất cao & giữ | `MouseTracker.onOffBalance` | mất thăng bằng → té |
| Bấm robot | `onActivate` | mở/đóng panel; đánh thức nếu đang ngủ |
| Mở tab Trợ lý | `panel.onTabChange('chat')` | Listening (gật đầu chờ) |
| Gõ trong ô chat | `input` event | Typing (nghiêng đầu) |
| Hệ thống kiểm tra | `setBusy` → `notifyThinking` | Thinking (suy nghĩ) |
| Có kết quả | `notifyResult` | xem [ValidationReaction.md](ValidationReaction.md) |
| Gạt công tắc popup | `PopupController` | xem [PopupInteraction.md](PopupInteraction.md) |

## Nguyên tắc không gây phiền

- Phản ứng kết quả (Happy/Celebrate/…) chỉ ở luồng kiểm tra XML 130 chủ động —
  KHÔNG bắn theo từng phím ở kiểm tra realtime từng trường (tránh nhấp nháy).
- Trạng thái tương tác (Listening/Typing/Thinking) khoá ở mức Validation nên chuột/
  idle không kéo robot ra khi đang phục vụ người dùng.
