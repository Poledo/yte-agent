# Mouse Tracking Animation

Xem mô hình chi tiết ở [15_RobotBrain/MouseTrackingModel.md](../15_RobotBrain/MouseTrackingModel.md).

Tóm tắt lớp animation: con ngươi (`#robot-pupils`) và đầu (`#robot-head`) được đặt
`transform` inline trực tiếp (không qua WAAPI) để bám chuột theo thời gian thực,
làm mượt bằng CSS `transition: transform 0.14s–0.18s` inject trong Shadow DOM
(`RobotMascot.getStyles()`).

Khi robot vào trạng thái "tập trung" (Thinking/Listening/…​), gaze tắt để nhường
`transform` cho gesture — xem [AnimationPriority.md](AnimationPriority.md).
