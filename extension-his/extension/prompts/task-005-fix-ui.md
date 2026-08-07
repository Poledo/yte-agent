Thiết kế lại giao diện AssistantBubble.

KHÔNG thay đổi business logic.

KHÔNG thay đổi NotificationManager.

KHÔNG thay đổi Public API.

KHÔNG thay đổi Explain Callback.

Chỉ được phép thay đổi giao diện và trải nghiệm người dùng (UI/UX).

========================
YÊU CẦU GIAO DIỆN
========================

Assistant gồm 2 trạng thái.

1. Trạng thái thu gọn

- Hiển thị một nút tròn nổi ở góc dưới bên phải.
- Kích thước khoảng 56~60px.
- Sử dụng logo của Extension làm icon.
- Có bóng đổ mềm.
- Có hiệu ứng hover phóng to nhẹ.
- Có hiệu ứng nhấp nháy nhẹ khi có cảnh báo mới.
- Có badge đỏ hiển thị số lượng cảnh báo.
- Click vào nút để mở/đóng Assistant Panel.

Không hiển thị hộp thông báo hình chữ nhật như hiện tại.

========================

2. Trạng thái mở

Khi click vào nút nổi sẽ mở Assistant Panel.

Yêu cầu:

- Panel rộng khoảng 360px.
- Bo góc khoảng 16px.
- Shadow hiện đại.
- Có animation mở/đóng.
- Khoảng cách giữa các thành phần đẹp.
- Font hiện đại.
- Không sử dụng giao diện popup trắng đơn giản.

Nội dung gồm:

- Logo
- Tiêu đề: "ZeroCheck AI"
- Badge mức độ cảnh báo
- Tiêu đề cảnh báo
- Nội dung
- Gợi ý (nếu có)

Phía dưới gồm:

- Nút "📖 Giải thích"
- Nút đóng

Nút "Giải thích" vẫn sử dụng callback hiện tại.

========================

TRẢI NGHIỆM

- Chỉ tồn tại duy nhất một Assistant.
- Chỉ tồn tại duy nhất một Panel.
- Click ra ngoài sẽ đóng Panel.
- Nhấn ESC sẽ đóng Panel.
- Khi Panel đang mở thì không tự động ẩn.
- Chỉ tự động ẩn khi Panel đang đóng.

========================

THIẾT KẾ

Phong cách hiện đại.

Nút trợ lý luôn nằm ở góc dưới bên phải.

Mặc định chỉ hiển thị nút tròn.

Khi có cảnh báo:

- Hiện badge đỏ.
- Không tự mở panel.

Khi người dùng click:

- Panel trượt lên từ nút.
- Panel neo vào nút trợ lý.
- Khi đóng panel, chỉ còn lại nút tròn.

Mọi thông báo đều hiển thị trong cùng một panel, không tạo nhiều popup.

Ưu tiên giao diện tối giản.

Không sử dụng thư viện UI.

CSS phải tách biệt để không ảnh hưởng website.

========================

GIỮ NGUYÊN

- Notification Object
- NotificationManager
- Business Logic
- Explain Callback
- Toàn bộ chức năng hiện tại

========================

Sau khi hoàn thành:

- Review toàn bộ code.
- Build project.
- Tự sửa lỗi compile nếu có.
- Đảm bảo Extension vẫn hoạt động trên VNPT HIS.

Chỉ thay đổi phần giao diện AssistantBubble.
