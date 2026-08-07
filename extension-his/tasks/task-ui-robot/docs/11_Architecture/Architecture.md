# Architecture (Kiến trúc robot mascot)

Thư mục mã: `extension/src/content/robot/`. Thiết kế theo SRP + composition, mỗi lớp
một trách nhiệm; `RobotMascot` là facade lắp ráp và điều phối.

## Sơ đồ phụ thuộc

```
                 ┌────────────────────┐
                 │    RobotMascot      │  facade + State→hành vi (onEnter)
                 │  (RobotController)  │
                 └─────────┬──────────┘
      ┌───────────┬────────┼────────┬───────────┬────────────┐
      ▼           ▼        ▼        ▼           ▼            ▼
 RobotView   StateMachine EmotionEngine Animation  Physics   MouseTracker
 (SVG DOM)   (ưu tiên)    (mặt/mắt)   Controller  Controller (bám chuột)
      ▲                                   │           │          │
      └──────────── điều khiển DOM ────────┴───────────┴──────────┘
                                    ▲
                             PopupController
                       (storage → onEnabledChange)
```

## Trách nhiệm từng lớp

| Lớp | Trách nhiệm | File |
|---|---|---|
| RobotMascot | facade, ánh xạ State→hành vi, guard `seq`, idle/autoReturn timers, API công khai | `RobotMascot.ts` |
| RobotView | dựng SVG, expose setter bộ phận (pupil, head, eye, mouth, cheeks, sweat, zzz, thumb) | `RobotView.ts` |
| StateMachine | giữ state hiện tại, so ưu tiên, phát `onEnter` | `StateMachine.ts` |
| EmotionEngine | ánh xạ emotion → view setters | `EmotionEngine.ts` |
| AnimationController | base-anim + gesture (WAAPI), hủy, reduce-motion | `AnimationController.ts` |
| animations | thư viện gesture/base thuần | `animations.ts` |
| PhysicsController | animate toàn thân (té/bay/rơi/đáp/nhảy) | `PhysicsController.ts` |
| MouseTracker | pointermove → gaze + mất thăng bằng | `MouseTracker.ts` |
| PopupController | đọc storage + onChanged → bật/tắt | `PopupController.ts` |

## Ranh giới & tích hợp

- **DIP:** `ChatPanel` phụ thuộc interface `RobotNotifier` (`notifyThinking/notifyResult/notifyTyping`),
  không phụ thuộc lớp cụ thể `RobotMascot`.
- **Launcher:** `UnifiedAssistantPanel.useExternalLauncher()` ẩn nút 🤖 mặc định;
  robot thay vai trò mở/đóng panel (`content/index.ts`).
- **Cách ly CSS:** robot có Shadow DOM host riêng, z-index tối đa, chỉ animate
  transform/opacity.

## Máy trạng thái & ưu tiên

Xem [../04_AIBehavior/StateMachine.md](../04_AIBehavior/StateMachine.md) và
[../15_RobotBrain/ReactionPriority.md](../15_RobotBrain/ReactionPriority.md).

## Hoãn sang v2

SoundController (âm thanh), ThreeJS/3D, animation bằng GIF/PNG — xem
[../CHANGELOG.md](../CHANGELOG.md).
