# Robot Design Document (RDD)

Version: 1.0

## 1. Mục tiêu

Robot là AI Mascot đồng hành với người dùng trong toàn bộ quá trình sử
dụng extension. Robot phải tạo cảm giác "đang sống", phản hồi theo hành
vi người dùng nhưng không gây phân tán.

## 2. Kiến trúc

-   RobotController: điều phối tổng thể.
-   StateMachine: quản lý trạng thái.
-   AnimationController: phát/cancel animation.
-   EmotionEngine: quyết định biểu cảm.
-   MouseTracker: theo dõi chuột.
-   InteractionManager: click, hover, drag.
-   ValidationBridge: nhận sự kiện validation.
-   AIBridge: nhận sự kiện gọi API/LLM.
-   PopupController: di chuyển giữa popup và trang.
-   PhysicsController: té, bật dậy, bay.

## 3. State Machine

### Core

Boot Idle Watching Thinking Happy Sad Sleeping WakeUp Flying Falling
Landing Disabled

### User Interaction

Hover Wave Listening Typing Checking Explaining Celebrate PointError

### Transition

-   Idle -\> Watching (mousemove)
-   Watching -\> Hover (cursor gần robot)
-   Idle -\> Sleeping (timeout)
-   Sleeping -\> WakeUp (mousemove/click)
-   Any -\> Flying (Disable)
-   Flying -\> Sleeping (đến Popup)
-   Sleeping -\> Falling (Enable)
-   Falling -\> Landing -\> Idle
-   Checking -\> Happy (không lỗi)
-   Checking -\> Sad (có lỗi)
-   Thinking -\> Explaining (AI trả lời)

Animation đang chạy phải hủy ngay khi state mới xuất hiện.

## 4. Emotion Engine

Emotion: - Happy - Curious - Focused - Sleepy - Proud - Embarrassed -
Sad - Surprised

Priority: Critical \> User Click \> Validation \> Mouse \> Idle

## 5. Mouse Tracking

-   Mắt luôn nhìn chuột.
-   Đầu xoay ±20°.
-   Chuột cao quá: ngửa đầu.
-   Cao liên tục: mất thăng bằng -\> té.

## 6. Validation Events

Local Pass: - gật đầu.

Local Error: - chỉ vào field. - hiện biểu tượng cảnh báo.

AI Checking: - chống cằm. - bánh răng quay.

AI Success: - cười. - thumbs up.

AI Warning: - gãi đầu.

AI Error: - buồn. - ngồi xuống.

## 7. Popup

Disable: - robot bật động cơ. - bay lên popup. - nằm ngủ.

Enable: - giật mình. - nhảy khỏi popup. - rơi. - đáp. - u đầu. - cười.

Có thể đảo chiều bất kỳ lúc nào.

## 8. Physics

Té: - quay 10-20° - ngã - đom đóm - đứng dậy

Landing: - squash & stretch nhẹ.

## 9. Animation Library

Idle: - Blink - Breath - LookAround - ScratchHead - Yawn

Working: - Nod - Think - Read - Type

Emotion: - Smile - Cry - Celebrate - FacePalm

Movement: - Jump - Fly - Fall - Sit - Sleep - Wake

## 10. Hiệu năng

-   requestAnimationFrame
-   transform/opacity
-   giảm FPS khi tab ẩn
-   không quá 60fps
-   preload animation

## 11. Accessibility

-   Reduce Motion
-   Tắt âm thanh
-   Điều chỉnh kích thước robot

## 12. Roadmap

Phase 1: Robot SVG + Idle + Mouse

Phase 2: StateMachine + Popup

Phase 3: Validation

Phase 4: AI

Phase 5: Physics

Phase 6: Emotion Engine

Phase 7: 3D (tùy chọn Three.js)

## 13. Coding Rules

-   Không gọi animation trực tiếp.
-   Luôn dispatch state.
-   Mọi module độc lập.
-   Có unit test cho StateMachine.

## 14. Success Metrics

-   FPS ổn định.
-   Không ảnh hưởng nhập liệu.
-   Robot phản hồi \<100ms.
-   Người dùng luôn hiểu robot đang làm gì.
