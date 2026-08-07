# Behaviour Tree (Cây hành vi)

Mã nguồn: `extension/src/content/robot/RobotMascot.ts` (`onEnter` switch + idle timers).

Trong v1, "cây hành vi" được hiện thực dạng **switch theo trạng thái** thay vì cây
BT đầy đủ — đủ cho số hành vi hiện tại và dễ đọc. Khi số nhánh tăng, có thể tách
sang BT thật (Selector/Sequence) mà không đổi State Machine.

## Nhánh gốc: chọn theo trạng thái hiện tại

```
Root (Selector theo RobotState)
├── Idle ─────────► breathe + gaze bật + hẹn: gesture rảnh ngẫu nhiên, →LongIdle
├── LongIdle ─────► ngồi thấp, Sleepy, hẹn →Sleeping
├── Sleeping ─────► sleepBob + Zzz (đánh thức khi có hoạt động/bấm)
├── WakeUp ───────► wake → Idle
├── Hover ────────► Happy + wave, mắt nhìn người dùng
├── Listening ────► Focused-pose + nod (chat mở)
├── Typing ───────► Curious + tiltCurious (người dùng gõ)
├── Thinking ─────► think (AI xử lý)
├── Explaining ───► nod → tự về Listening
├── Happy ────────► thumbsUp → tự về Idle
├── Celebrate ────► celebrate + hop + confetti → tự về Idle
├── Confused ─────► scratchHead + Embarrassed → tự về Idle
├── Sad ──────────► sad (ngồi xuống) → tự về Idle
├── PointError ───► chỉ tay vào lỗi → tự về Idle
├── Flying ───────► bay khỏi màn hình → Disabled          (Bật/Tắt)
├── Falling ──────► rơi xuống → Landing                    (Bật/Tắt)
├── Landing ──────► đáp nhún, u đầu → cười → Idle
├── Fell ─────────► té → chóng mặt → Idle                  (mất thăng bằng)
└── Disabled ─────► đứng im, không nhận sự kiện
```

## Cơ chế "tự về trạng thái sau"

Các trạng thái phản ứng (Happy/Celebrate/Confused/Sad/PointError/Explaining) dùng
`autoReturn(seq, to, ms)`; continuation được bảo vệ bằng `seq` để nếu người dùng
tương tác tiếp (đổi trạng thái) thì lần hẹn cũ bị vô hiệu.

## Điều kiện chuyển do sự kiện ngoài

| Sự kiện | Hàm | Đích |
|---|---|---|
| Bấm robot | `onClick` → `onActivate` | mở/đóng panel |
| Di chuột trong vùng | `MouseTracker.onHoverChange` | Hover |
| Chuột lên quá cao & lâu | `MouseTracker.onOffBalance` | Fell |
| Mở chat / gõ / AI xử lý | `notifyChatOpened/Typing/Thinking` | Listening/Typing/Thinking |
| Kết quả kiểm tra | `notifyResult` | Happy/Celebrate/Confused/PointError/Sad |
| Công tắc popup | `PopupController.onChange` | Falling / Flying |
