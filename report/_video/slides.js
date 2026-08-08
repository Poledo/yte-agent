/*
 * Nội dung + kịch bản lời đọc cho video hướng dẫn sử dụng.
 * Mỗi phần tử = 1 slide. `narration` là lời sẽ được đọc thành giọng nói.
 * Muốn sửa video: chỉ cần đổi chữ ở đây rồi chạy lại (xem HUONG-DAN-VIDEO.md).
 */
const INK = '2B2B2B', BLUE = '2F6FED', RED = 'E4572E', GREEN = '2E9E5B', YELLOW = 'FFE066';

module.exports = [
  // ---------- 0. MỞ ĐẦU ----------
  {
    kind: 'cover', accent: BLUE, doodle: 'robot:wave',
    tag: 'VNPT — Hackathon 2026',
    title: 'Chiến binh Y tế số',
    subtitle: 'Trợ lý AI giám định hồ sơ bảo hiểm y tế\nHướng dẫn sử dụng trong 4 phút',
    narration: 'Xin chào! Đây là Chiến binh Y tế số — trợ lý trí tuệ nhân tạo giúp giám định hồ sơ bảo hiểm y tế. Trong bốn phút, tôi sẽ hướng dẫn bạn dùng hai công cụ chính: tiện ích cài trên trình duyệt để kiểm tra hồ sơ ngay khi làm việc, và trang quản trị để nạp tri thức và cấu hình hệ thống. Chúng ta bắt đầu nhé.',
  },
  {
    kind: 'content', accent: BLUE, doodle: 'robot:think', n: '',
    title: 'Hệ thống gồm hai phần',
    bullets: [
      { t: '1) Tiện ích trên trình duyệt (Extension)', c: BLUE },
      'Gắn thẳng vào phần mềm HIS của bệnh viện. Cảnh báo sai sót ngay khi nhập liệu và kiểm tra file XML 130 trước khi gửi bảo hiểm.',
      { t: '2) Trang quản trị (Web Admin)', c: GREEN },
      'Nơi quản trị viên nạp văn bản, quy định vào kho tri thức, quản lý danh mục và cấu hình hệ thống.',
    ],
    narration: 'Hệ thống gồm hai phần. Thứ nhất là tiện ích cài trên trình duyệt, gắn thẳng vào phần mềm HIS của bệnh viện; nó cảnh báo sai sót ngay khi nhập liệu và kiểm tra file XML 130 trước khi gửi cho bảo hiểm. Thứ hai là trang quản trị, nơi quản trị viên nạp văn bản quy định vào kho tri thức, quản lý danh mục và cấu hình hệ thống. Trước tiên, cùng xem phần tiện ích.',
  },

  // ---------- PHẦN 1: EXTENSION ----------
  {
    kind: 'section', accent: RED, doodle: 'robot:point',
    tag: 'Phần 1',
    title: 'Tiện ích trên phần mềm HIS',
    subtitle: 'Cảnh báo tức thời • Kiểm tra XML 130 • Hỏi đáp nghiệp vụ',
    narration: 'Phần một: tiện ích chạy ngay trên phần mềm HIS. Đây là nơi nhân viên y tế làm việc hằng ngày.',
  },
  {
    kind: 'content', accent: RED, doodle: 'formWarn', n: '1',
    title: 'Cảnh báo ngay khi nhập liệu',
    foot: 'không cần thao tác thêm',
    bullets: [
      'Khi bạn nhập chẩn đoán, thuốc, dịch vụ vào HIS, tiện ích âm thầm đối chiếu với quy định.',
      'Phát hiện bất thường là hiện cảnh báo ngay tại chỗ — ví dụ chỉ định chưa hợp lý, thuốc cấp trùng, hay thiếu điều kiện thanh toán.',
      { t: 'Sửa đúng ngay từ đầu, không chờ tới lúc bị từ chối.', c: GREEN },
    ],
    narration: 'Tính năng đầu tiên: cảnh báo ngay khi nhập liệu. Khi bạn nhập chẩn đoán, thuốc hay dịch vụ vào HIS, tiện ích sẽ âm thầm đối chiếu với quy định. Nếu phát hiện bất thường — như chỉ định chưa hợp lý, thuốc cấp trùng, hay thiếu điều kiện thanh toán — nó hiện cảnh báo ngay tại chỗ. Nhờ vậy bạn sửa đúng ngay từ đầu, thay vì chờ đến khi bị bảo hiểm từ chối.',
  },
  {
    kind: 'content', accent: RED, doodle: 'uploadBox', n: '2',
    title: 'Kiểm tra file XML 130',
    foot: 'một hồ sơ hoặc cả lô',
    bullets: [
      'Mở khu kiểm tra XML 130 trên tiện ích, kéo thả file vào là xong.',
      { t: 'Một file:', c: BLUE }, 'kiểm tra cấu trúc và nội dung theo chuẩn của Bộ Y tế.',
      { t: 'Nhiều file cùng lúc:', c: BLUE }, 'đối chiếu chéo giữa các hồ sơ — trùng giường bệnh, một bác sĩ ở hai nơi cùng giờ, hay một bệnh nhân xuất hiện bất hợp lý.',
    ],
    narration: 'Tính năng thứ hai: kiểm tra file XML 130 — chính là bộ hồ sơ gửi cho bảo hiểm. Bạn mở khu kiểm tra trên tiện ích rồi kéo thả file vào. Với một file, hệ thống kiểm tra cấu trúc và nội dung theo chuẩn của Bộ Y tế. Với nhiều file cùng lúc, nó còn đối chiếu chéo giữa các hồ sơ — phát hiện trùng giường bệnh, một bác sĩ xuất hiện ở hai nơi cùng thời điểm, hay một bệnh nhân xuất hiện bất hợp lý. Đây là những lỗi mà xem từng hồ sơ riêng lẻ gần như không thể thấy.',
  },
  {
    kind: 'content', accent: RED, doodle: 'robot:read', n: '3',
    title: 'Đọc kết quả và sửa lỗi',
    foot: 'cảnh báo có dẫn nguồn',
    bullets: [
      'Kết quả gom theo ba mức: từng hồ sơ, từng bảng, và từng dòng dữ liệu.',
      'Mỗi cảnh báo nêu rõ lỗi gì, ở đâu, và trích dẫn quy định liên quan.',
      { t: 'Bấm vào cảnh báo để tới đúng dòng cần sửa.', c: GREEN },
    ],
    narration: 'Sau khi kiểm tra, kết quả được gom theo ba mức: từng hồ sơ, từng bảng, và từng dòng dữ liệu. Mỗi cảnh báo nêu rõ lỗi gì, nằm ở đâu, và trích dẫn quy định liên quan để bạn yên tâm. Bạn chỉ việc bấm vào cảnh báo là tới đúng dòng cần sửa.',
  },
  {
    kind: 'content', accent: BLUE, doodle: 'chatBubble', n: '4',
    title: 'Hỏi đáp nghiệp vụ ngay trong lúc làm',
    foot: 'trả lời kèm trích dẫn',
    bullets: [
      'Gõ câu hỏi bằng tiếng Việt: điều kiện thanh toán một dịch vụ, mức trần thuốc, thủ tục chuyển tuyến...',
      'AI trả lời dựa trên kho văn bản đã nạp, kèm trích dẫn điều khoản để bạn kiểm chứng.',
      { t: 'Không phải mở nhiều tài liệu để tra tay nữa.', c: GREEN },
    ],
    narration: 'Tính năng thứ tư: hỏi đáp nghiệp vụ ngay trong lúc làm. Bạn gõ câu hỏi bằng tiếng Việt — chẳng hạn điều kiện thanh toán một dịch vụ, mức trần của một loại thuốc, hay thủ tục chuyển tuyến. Trí tuệ nhân tạo trả lời dựa trên kho văn bản đã nạp, luôn kèm trích dẫn điều khoản để bạn kiểm chứng. Bạn không còn phải mở hàng loạt tài liệu để tra cứu thủ công nữa.',
  },

  // ---------- PHẦN 2: WEB ADMIN ----------
  {
    kind: 'section', accent: GREEN, doodle: 'robot:search',
    tag: 'Phần 2',
    title: 'Trang quản trị Web Admin',
    subtitle: 'Kho tri thức • Tải văn bản • Danh mục HIS • Cấu hình',
    narration: 'Phần hai: trang quản trị Web Admin. Đây là nơi quản trị viên chuẩn bị bộ não cho hệ thống và cấu hình vận hành.',
  },
  {
    kind: 'content', accent: GREEN, doodle: 'browserWin', n: '1',
    title: 'Đăng nhập và tổng quan',
    foot: 'phân quyền theo vai trò',
    bullets: [
      'Đăng nhập bằng tài khoản được cấp; mỗi vai trò chỉ thấy đúng phần việc của mình.',
      'Trang Tổng quan hiển thị nhanh tình trạng hệ thống và các số liệu chính.',
      'Menu bên trái dẫn tới: Người dùng, Vai trò và quyền, Kho tri thức, Danh mục HIS, Tải văn bản, Nhật ký kiểm toán và Cấu hình.',
    ],
    narration: 'Sau khi đăng nhập bằng tài khoản được cấp, mỗi vai trò chỉ nhìn thấy đúng phần việc của mình. Trang Tổng quan cho bạn cái nhìn nhanh về tình trạng hệ thống và các số liệu chính. Menu bên trái dẫn tới các mục: Người dùng, Vai trò và quyền, Kho tri thức, Danh mục HIS, Tải văn bản, Nhật ký kiểm toán và Cấu hình. Ta xem các mục quan trọng nhất.',
  },
  {
    kind: 'content', accent: GREEN, doodle: 'robot:read', n: '2',
    title: 'Kho tri thức',
    foot: 'nạp là AI học',
    bullets: [
      'Tải lên văn bản, thông tư, quy định ở nhiều định dạng — hệ thống tự đọc và tách thành các đoạn tri thức.',
      { t: 'Theo dõi trạng thái chỉ mục', c: BLUE }, 'của từng tài liệu: đang xử lý hay đã sẵn sàng để AI dùng.',
      'Gỡ tài liệu hết hiệu lực để AI không trả lời theo quy định cũ.',
    ],
    narration: 'Mục quan trọng nhất là Kho tri thức. Bạn tải lên văn bản, thông tư, quy định ở nhiều định dạng khác nhau; hệ thống tự đọc và tách thành các đoạn tri thức để tìm kiếm theo ngữ nghĩa. Bạn có thể theo dõi trạng thái chỉ mục của từng tài liệu — đang xử lý hay đã sẵn sàng cho AI sử dụng. Khi một quy định hết hiệu lực, chỉ cần gỡ tài liệu đó ra, để AI không trả lời theo quy định cũ.',
  },
  {
    kind: 'content', accent: GREEN, doodle: 'cloud', n: '3',
    title: 'Tải văn bản tự động',
    foot: 'luôn cập nhật',
    bullets: [
      'Kết nối cổng văn bản pháp luật để tải về các văn bản mới liên quan.',
      'Chọn văn bản cần dùng rồi đưa thẳng vào Kho tri thức, không phải tải tay từng file.',
      { t: 'Kho tri thức luôn theo kịp quy định mới nhất.', c: GREEN },
    ],
    narration: 'Mục Tải văn bản giúp kho tri thức luôn cập nhật. Hệ thống kết nối tới cổng văn bản pháp luật để tải về các văn bản mới liên quan. Bạn chỉ cần chọn văn bản cần dùng rồi đưa thẳng vào Kho tri thức, không phải tải thủ công từng file. Nhờ vậy, kho tri thức luôn theo kịp quy định mới nhất.',
  },
  {
    kind: 'content', accent: BLUE, doodle: 'catalog', n: '4',
    title: 'Danh mục HIS',
    foot: 'chuẩn theo từng cơ sở',
    bullets: [
      'Nạp danh mục thuốc, dịch vụ, vật tư theo từng cơ sở khám chữa bệnh, thường từ file Excel.',
      'Đây là căn cứ để tiện ích đối chiếu khi kiểm tra hồ sơ.',
      { t: 'Danh mục đúng thì cảnh báo mới chính xác.', c: GREEN },
    ],
    narration: 'Mục Danh mục HIS dùng để nạp danh mục thuốc, dịch vụ và vật tư theo từng cơ sở khám chữa bệnh, thường là từ file Excel. Đây chính là căn cứ để tiện ích đối chiếu khi kiểm tra hồ sơ. Danh mục càng đúng thì cảnh báo càng chính xác, nên hãy giữ cho phần này luôn khớp với thực tế của cơ sở.',
  },
  {
    kind: 'content', accent: BLUE, doodle: 'clock', n: '5',
    title: 'Cấu hình hệ thống',
    foot: 'đặt một lần, chạy đều',
    bullets: [
      'Cập nhật bộ mã bệnh ICD và hẹn giờ đồng bộ định kỳ để mã bệnh luôn mới.',
      'Tinh chỉnh cấu hình AI và các thông số vận hành khác.',
      { t: 'Chỉ vai trò quản trị hệ thống mới vào được mục này.', c: RED },
    ],
    narration: 'Cuối cùng là Cấu hình hệ thống. Tại đây bạn cập nhật bộ mã bệnh ICD và hẹn giờ đồng bộ định kỳ, để mã bệnh luôn mới mà không phải làm thủ công. Bạn cũng có thể tinh chỉnh cấu hình trí tuệ nhân tạo và các thông số vận hành khác. Lưu ý: chỉ vai trò quản trị hệ thống mới được vào mục này.',
  },

  // ---------- KẾT ----------
  {
    kind: 'content', accent: GREEN, doodle: 'shield', n: '',
    title: 'An toàn dữ liệu',
    foot: 'yên tâm sử dụng',
    bullets: [
      'Hệ thống chạy được trong mạng nội bộ của bệnh viện.',
      { t: 'Dữ liệu bệnh nhân không rời khỏi cơ sở.', c: GREEN },
      'Mọi thao tác quan trọng đều được ghi lại trong Nhật ký kiểm toán.',
    ],
    narration: 'Một điều quan trọng: an toàn dữ liệu. Hệ thống có thể chạy hoàn toàn trong mạng nội bộ của bệnh viện, nghĩa là dữ liệu bệnh nhân không rời khỏi cơ sở. Đồng thời, mọi thao tác quan trọng đều được ghi lại trong Nhật ký kiểm toán, để luôn có thể tra soát khi cần.',
  },
  {
    kind: 'outro', accent: BLUE, doodle: 'robot:wave',
    tag: 'Cảm ơn bạn đã theo dõi',
    title: 'Cùng nhau giữ hồ sơ sạch',
    subtitle: 'Chiến binh Y tế số — sai sót ít hơn, thanh toán nhanh hơn.\nMọi thắc mắc, liên hệ đội phát triển VNPT.',
    narration: 'Vậy là bạn đã nắm được cách dùng cả hai phần: tiện ích trên phần mềm HIS để kiểm tra và cảnh báo, cùng trang quản trị để nạp tri thức và cấu hình. Chiến binh Y tế số giúp hồ sơ sạch hơn, sai sót ít hơn và thanh toán nhanh hơn. Cảm ơn bạn đã theo dõi, và chúc bạn làm việc thật hiệu quả!',
  },
];
