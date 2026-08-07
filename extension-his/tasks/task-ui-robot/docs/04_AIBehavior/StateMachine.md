# State Machine (Máy trạng thái)

Mã nguồn: `extension/src/content/robot/StateMachine.ts`, `RobotState.ts`.

## Ý tưởng cốt lõi — ưu tiên thay vì bảng chuyển tiếp

Không liệt kê từng cặp `from → to`. Mỗi trạng thái có một **mức khoá** (holding
priority). Một `dispatch(to, source)` chỉ thành công khi:

```
to !== trạng_thái_hiện_tại  VÀ  source >= HOLDING[trạng_thái_hiện_tại]
```

Nhờ đó: chuột không kéo robot ra khỏi lúc đang "suy nghĩ", nhưng Bật/Tắt (Critical)
thì cắt ngang mọi thứ. `force(to)` bỏ qua ưu tiên — dùng cho chuỗi vật lý nội bộ
(Falling → Landing → Idle).

## Thang ưu tiên (`StatePriority`)

| Mức | Giá trị | Nguồn |
|---|---|---|
| Idle | 0 | hẹn giờ rảnh |
| Mouse | 1 | di chuột, hover, mất thăng bằng |
| Validation | 2 | kết quả kiểm tra |
| UserClick | 3 | bấm robot, mở chat, gõ |
| Critical | 4 | Bật/Tắt, té — luôn ngắt được |

## Mức khoá của từng trạng thái (`HOLDING`)

| Nhóm trạng thái | Khoá ở mức |
|---|---|
| Idle, LongIdle, Watching, Hover, Sleeping | Idle (0) — mọi thứ ngắt được |
| Listening, Typing, Thinking, Explaining, Happy, Celebrate, Sad, Confused, PointError | Validation (2) |
| Boot, WakeUp, Landing | UserClick (3) |
| Flying, Falling, Fell, Disabled | Critical (4) — chỉ Critical ngắt được |

## Vòng đời

`onEnter(to, from)` được gọi mỗi lần đổi trạng thái. `RobotMascot.onEnter` sẽ:
1. tăng `seq` (chặn continuation async của trạng thái cũ);
2. hủy gesture cũ + timer cũ;
3. cấu hình base-anim + gesture + cảm xúc + gaze + vật lý cho trạng thái mới.

Xem thêm: [BehaviourTree.md](BehaviourTree.md), [AnimationPriority.md](../03_AnimationBible/AnimationPriority.md).
