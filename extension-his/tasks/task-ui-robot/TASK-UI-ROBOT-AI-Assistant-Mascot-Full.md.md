# TASK-UI-ROBOT - AI Assistant Robot UX Vision

## Mục tiêu

Biến extension và web admin thành một sản phẩm có cá tính riêng. Robot
không chỉ là icon mà là một trợ lý AI sống động, đồng hành với người
dùng trong nghiệp vụ y tế.

------------------------------------------------------------------------

# 1. Web Admin

-   Thiết kế theo phong cách AI/Robot.
-   Thay toàn bộ icon bằng icon mang hơi hướng AI nếu có thể đồng bộ.
-   Font hiện đại, công nghệ, vẫn hỗ trợ tiếng Việt.
-   Tông màu VNPT (xanh dương + trắng).

------------------------------------------------------------------------

# 2. Popup Extension

-   Font mang phong cách công nghệ, hỗ trợ tiếng Việt.
-   Giao diện tối giản.
-   Có công tắc Enable / Disable.

## Khi Disable

Robot bay lên Popup rồi nằm ngủ.

## Khi Enable

Robot nhảy khỏi Popup, rơi xuống góc phải của website, đáp hơi mạnh, nổi
cục u nhỏ rồi cười.

------------------------------------------------------------------------

# 3. Robot Assistant

Không dùng icon tròn.

Robot được vẽ bằng HTML/SVG/CSS.

Có:

-   đầu
-   mắt
-   thân
-   tay
-   chân
-   logo VNPT trên ngực

Màu chủ đạo:

-   VNPT Blue

Không cần quá cơ khí.

------------------------------------------------------------------------

# 4. Trạng thái

Idle

-   chớp mắt
-   nhìn quanh
-   gãi đầu
-   ngáp
-   lim dim

Long Idle

-   ngồi
-   nằm
-   ngủ
-   giật mình tỉnh giấc

Hover

-   nhìn người dùng
-   vẫy tay

Mouse Tracking

-   mắt nhìn theo chuột
-   đầu xoay theo chuột

Nếu chuột lên quá cao

-   robot ngửa đầu
-   mất thăng bằng
-   té
-   hiện đom đóm
-   lồm cồm đứng dậy

------------------------------------------------------------------------

# 5. Khi mở Chat

Robot:

-   vui vẻ
-   mắt sáng
-   đứng nghiêm
-   chờ lệnh

------------------------------------------------------------------------

# 6. Khi nhập câu hỏi

Robot:

-   nghiêng đầu
-   nhìn textbox
-   mong chờ

------------------------------------------------------------------------

# 7. Khi AI xử lý

Robot:

-   chống cằm
-   gật gù
-   suy nghĩ
-   mắt đảo nhẹ

------------------------------------------------------------------------

# 8. Khi có kết quả

Nếu thành công

-   cười
-   giơ ngón tay cái
-   đắc ý

Nếu toàn bộ hồ sơ hợp lệ

-   ăn mừng
-   nhảy
-   tung hoa giấy nhỏ

Nếu có lỗi hoặc xuất toán

-   buồn
-   chỉ tay vào nơi có lỗi
-   gãi đầu

------------------------------------------------------------------------

# 9. Không sử dụng lâu

Robot

-   ngồi xuống
-   nằm nghỉ
-   ngủ

Chuột di chuyển

-   chỉ mở mắt
-   nhìn theo

Hoặc

-   đứng dậy nếu người dùng thao tác nhiều.

------------------------------------------------------------------------

# 10. Enable / Disable Animation

Không khóa công tắc.

Người dùng có thể bật tắt bất kỳ lúc nào.

Ví dụ

Đang bay lên

→ bật

-   tắt động cơ
-   rơi xuống
-   gần chạm đất bật phản lực
-   đáp

Đang rơi

→ tắt

-   bật động cơ
-   bay ngược lên

Đang ngủ

→ bật

-   giật mình
-   dụi mắt
-   nhảy xuống, té, nổ đơm đóm

Đang làm việc

→ tắt

-   chào
-   bay về Popup

Điều này làm robot giống sinh vật sống.

------------------------------------------------------------------------

# 11. State Machine

Mọi animation đều thông qua State Machine.

Ví dụ

Idle

↓

Watching

↓

Thinking

↓

Happy

↓

Idle

Sleeping

↓

WakeUp

↓

Idle

Enable / Disable có thể xảy ra ở mọi state.

Animation đang chạy phải cancel và transition sang state mới.

------------------------------------------------------------------------

# 12. Kiến trúc đề xuất

RobotController

AnimationController

StateMachine

EmotionEngine

MouseTracker

PopupController

PhysicsController

SoundController (để dành)

------------------------------------------------------------------------

# 13. Công nghệ

Ưu tiên

-   HTML
-   SVG
-   CSS
-   TypeScript

Animation

-   CSS Animation
-   Web Animations API
-   GSAP (nếu cần)

Không dùng

-   GIF
-   PNG animation

Không dùng ThreeJS ở phiên bản đầu.

ThreeJS có thể nghiên cứu ở phiên bản sau nếu muốn robot 3D.

------------------------------------------------------------------------

# 14. Hiệu năng

-   chỉ animate transform
-   opacity
-   không repaint lớn
-   không block thao tác người dùng
-   animation tự giảm khi tab inactive

------------------------------------------------------------------------

# 15. Triết lý

Robot không chỉ là nút mở chat.

Robot là một đồng nghiệp AI.

Có cảm xúc.

Có hành vi.

Có cá tính.

Người dùng sẽ muốn tương tác với robot ngay cả khi không cần kiểm tra hồ
sơ.

Mục tiêu cuối cùng là tạo trải nghiệm vui vẻ nhưng chuyên nghiệp, khiến
extension khác biệt hoàn toàn so với các tiện ích kiểm tra biểu mẫu
thông thường.
