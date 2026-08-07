# Reaction Priority (Ưu tiên phản ứng)

State Machine không dùng bảng transition tường minh mà dùng **ưu tiên**: một trạng
thái mới chỉ chiếm quyền khi `priority(nguồn) >= priority(đang giữ)`. Trạng thái
thấp hơn bị bỏ qua, cao hơn hoặc bằng thì cắt ngang.

## Thang ưu tiên (thấp → cao)

| Mức | Trạng thái | Nguồn |
|---|---|---|
| Ambient (0) | Idle, Sleeping | mặc định, hết idle |
| Idle-gesture (1) | Blink/LookAround/ScratchHead/Yawn | IdleDirector |
| Track (2) | Watching, OffBalance | MouseTracker |
| Hover (3) | Hover (nhìn + vẫy) | chuột vào vùng |
| Validation (4) | Listening, Typing, Thinking, Happy, Celebrate, Confused, PointError, Sad | ChatPanel |
| Physics (5) | Fell, Falling, Landing | mất thăng bằng / bật-tắt |
| Critical (6) | Flying, Disabled, Boot enable/disable | công tắc popup |

## Hệ quả

- Chuột **không** kéo robot ra khỏi Thinking (2 < 4).
- Kết quả kiểm tra **không** bị idle-gesture cắt (1 < 4).
- Bật/Tắt cắt được **mọi** thứ (6 ≥ tất cả) — kể cả đang té hay đang celebrate.
- `force(state)` bỏ qua so sánh ưu tiên (dùng cho các bước trong một chuỗi vật lý đã
  được Critical mở màn).

Cơ chế hủy khi chiếm quyền: xem
[03_AnimationBible/AnimationPriority.md](../03_AnimationBible/AnimationPriority.md).
