# Robot Mascot — Kho tài liệu

Bộ tài liệu thiết kế cho **trợ lý robot** của extension *ZeroCheck AI*.

> Cấu trúc thư mục theo `Behaviour Tree, Emotion Engine.md`. Đây là **scaffold để
> tái sử dụng** — không phải mọi file đều đã viết đủ. Các file có nội dung thật
> là những phần đã hiện thực trong code (`extension/src/content/robot/`); phần còn
> lại để trống hoặc chỉ có mục lục, điền dần khi phát triển.

## Đã có nội dung thật (bám sát code)

| Tài liệu | Mô tả | Code tương ứng |
|---|---|---|
| [04_AIBehavior/StateMachine.md](04_AIBehavior/StateMachine.md) | Máy trạng thái ưu tiên | `StateMachine.ts`, `RobotState.ts` |
| [04_AIBehavior/BehaviourTree.md](04_AIBehavior/BehaviourTree.md) | Cây hành vi idle/tương tác | `RobotMascot.ts` |
| [04_AIBehavior/EmotionEngine.md](04_AIBehavior/EmotionEngine.md) | Máy cảm xúc → biểu cảm | `EmotionEngine.ts` |
| [04_AIBehavior/IdleDirector.md](04_AIBehavior/IdleDirector.md) | Đạo diễn cử động rảnh | `RobotMascot.ts` (idle timers) |
| [03_AnimationBible/AnimationBible.md](03_AnimationBible/AnimationBible.md) | Thư viện animation | `animations.ts`, `AnimationController.ts` |
| [03_AnimationBible/AnimationPriority.md](03_AnimationBible/AnimationPriority.md) | Ưu tiên & hủy animation | `StateMachine.ts` |
| [05_Interaction/InteractionBible.md](05_Interaction/InteractionBible.md) | Tổng quan tương tác | `MouseTracker.ts`, `content/index.ts` |
| [05_Interaction/ValidationReaction.md](05_Interaction/ValidationReaction.md) | Phản ứng theo kết quả kiểm tra | `ChatPanel.ts` |
| [05_Interaction/PopupInteraction.md](05_Interaction/PopupInteraction.md) | Bật/tắt qua popup | `PopupController.ts` |
| [11_Architecture/Architecture.md](11_Architecture/Architecture.md) | Sơ đồ module robot | toàn bộ `robot/` |
| [15_RobotBrain/ReactionPriority.md](15_RobotBrain/ReactionPriority.md) | Bảng ưu tiên phản ứng | `RobotState.ts` |
| [15_RobotBrain/MouseTrackingModel.md](15_RobotBrain/MouseTrackingModel.md) | Mô hình nhìn theo chuột | `MouseTracker.ts` |
| [15_RobotBrain/EmotionTransition.md](15_RobotBrain/EmotionTransition.md) | Chuyển cảm xúc | `EmotionEngine.ts` |
| [15_RobotBrain/SleepSystem.md](15_RobotBrain/SleepSystem.md) | Hệ ngủ / năng lượng | `RobotMascot.ts` |
| [06_UX/ColorPalette.md](06_UX/ColorPalette.md) | Bảng màu VNPT | `RobotConfig.ts` |

## Tham chiếu gốc

- [../TASK-UI-ROBOT-AI-Assistant-Mascot-Full.md.md](../TASK-UI-ROBOT-AI-Assistant-Mascot-Full.md.md) — đặc tả nhiệm vụ.
- [../Robot-Design-Document-RDD.md](../Robot-Design-Document-RDD.md) — RDD v1.0.

Xem [INDEX.md](INDEX.md) để tra toàn bộ cây thư mục.
