// Sinh "Huong-dan-su-dung-web-admin.docx" — Node thuần (tự dựng OOXML + ZIP, không cần thư viện).
// Ảnh chụp màn hình đặt ở report/huong-dan-img/*.png theo tên trong SECTIONS; thiếu ảnh
// thì chèn khung ghi chú, bổ sung ảnh xong chạy lại script là file cập nhật.
// Chạy: node gen-huong-dan-docx.mjs
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const IMG_DIR = 'D:/VNPT/hackathon/report/huong-dan-img';
const OUT = 'D:/VNPT/hackathon/api-validation/docs/Huong-dan-su-dung-web-admin.docx';

// ============ NỘI DUNG ============
// step: chuỗi (bước đánh số) | {note} ghi chú | {img, caption} ảnh
const SECTIONS = [
  {
    h: '1. Đăng nhập hệ thống',
    intro: 'Web admin ZeroCheck AI chạy tại địa chỉ https://cbyts.vnpt.vn. Trang chủ là trang giới thiệu dự án; khu quản trị yêu cầu đăng nhập.',
    steps: [
      'Mở trình duyệt, truy cập https://cbyts.vnpt.vn — trang giới thiệu hiện ra.',
      { img: '02-gioi-thieu.png', caption: 'Trang giới thiệu (trang chủ) — menu Đăng nhập / Trang quản trị ở góc trên phải' },
      'Bấm nút "Đăng nhập" ở góc trên phải (hoặc "Trang quản trị" — hệ thống sẽ tự chuyển tới trang đăng nhập nếu chưa có phiên).',
      'Nhập email và mật khẩu được cấp, bấm "Đăng nhập".',
      { img: '01-dang-nhap.png', caption: 'Màn hình đăng nhập' },
      { note: 'Quên mật khẩu: bấm "Quên mật khẩu" ngay dưới nút đăng nhập, nhập email — hệ thống gửi liên kết đặt lại qua thư.' },
      'Đăng nhập thành công, hệ thống chuyển vào Trang tổng quan (Dashboard).',
    ],
  },
  {
    h: '2. Trang tổng quan (Dashboard)',
    intro: 'Nơi nhìn nhanh toàn hệ thống: số liệu kho tri thức, danh mục, người dùng, và biểu đồ hoạt động (lượt hỏi đáp AI, lượt kiểm tra hồ sơ XML 130).',
    steps: [
      { img: '03-dashboard.png', caption: 'Trang tổng quan với thẻ thống kê và biểu đồ hoạt động' },
      'Các thẻ trên cùng: Văn bản tri thức, Danh mục HIS, Người dùng, Vai trò — bấm vào thẻ để đi thẳng tới màn tương ứng.',
      'Khối "Hoạt động hệ thống": biểu đồ cột thể hiện lượt hỏi đáp AI (màu xanh cyan) và lượt kiểm tra XML 130 (màu tím) theo thời gian, kèm 5 số tổng: lượt hỏi, lượt kiểm tra, hồ sơ đã soát, lỗi phát hiện, lượt có nguy cơ xuất toán.',
      'Đổi khoảng thời gian: bấm nút có biểu tượng lịch (ví dụ "📅 7 ngày") → chọn nhanh Hôm nay / Hôm qua / Tuần này / Tháng này / Tháng trước / 30 ngày, hoặc "Tùy chọn khoảng ngày…" để chọn từ ngày – đến ngày trên lịch.',
      { img: '04-dashboard-thoi-gian.png', caption: 'Chọn khoảng thời gian xem thống kê' },
      { note: 'Chọn đúng 1 ngày, biểu đồ hiển thị theo từng giờ; chọn nhiều ngày, biểu đồ hiển thị theo từng ngày.' },
    ],
  },
  {
    h: '3. Kho tri thức (văn bản cho AI tra cứu)',
    intro: 'Quản lý các văn bản y tế (thông tư, quyết định, công văn...) mà trợ lý AI dùng để trả lời có trích dẫn nguồn. Nạp văn bản mới là AI dùng được ngay, không cần khởi động lại.',
    steps: [
      { img: '05-kho-tri-thuc.png', caption: 'Màn hình Kho tri thức' },
      'Bấm "Nạp văn bản" → kéo thả hoặc chọn file (.pdf, .doc/.docx, .xls/.xlsx, .txt, .md). PDF dạng ảnh scan sẽ tự nhận dạng chữ (OCR).',
      { img: '06-nap-van-ban.png', caption: 'Khung nạp văn bản' },
      'Dải trạng thái phía trên bảng cho biết tầng ngữ nghĩa (Ollama) và tiến độ chỉ mục; bấm "Chỉ mục ngữ nghĩa" để tạo chỉ mục cho các đoạn còn thiếu — giúp AI hiểu câu hỏi diễn đạt khác từ ngữ trong văn bản.',
      'Mỗi dòng có nút: xem nội dung, xem file gốc, gỡ bỏ (gỡ mềm — khôi phục được). Văn bản quá hạn hiệu lực sẽ được đánh dấu và AI tự ngừng trích dẫn.',
      { note: 'Nút "Gỡ hết hạn (N)" trên đầu trang gỡ nhanh toàn bộ văn bản đã quá ngày hết hiệu lực.' },
    ],
  },
  {
    h: '4. Tải văn bản pháp luật',
    intro: 'Tìm và tải văn bản từ nguồn vbpl.vn về hệ thống, sau đó nạp vào Kho tri thức bằng một nút bấm — không phải tự tìm file.',
    steps: [
      { img: '07-tai-van-ban.png', caption: 'Màn hình Tải văn bản' },
      'Nhập từ khóa (số hiệu, trích yếu...) và tìm kiếm.',
      'Bấm nút tải ở dòng kết quả để lưu thông tin + toàn văn về hệ thống; văn bản đã tải có thể "Nạp vào kho tri thức" ngay tại đây.',
    ],
  },
  {
    h: '5. Danh mục HIS (thuốc, dịch vụ, vật tư...)',
    intro: 'Danh mục dùng để đối chiếu khi kiểm tra hồ sơ XML 130. Hệ thống tự nhận diện 26 loại danh mục theo tên file và cấu trúc cột.',
    steps: [
      { img: '08-danh-muc-his.png', caption: 'Màn hình Danh mục HIS' },
      'Bấm "Nạp danh mục" → chọn file Excel (.xls, .xlsx) xuất từ HIS. Nạp file mới cùng loại + cùng cơ sở sẽ thay thế bản cũ.',
      'Import chỉ nạp vào bảng đối chiếu. Muốn trợ lý hỏi–đáp tra cứu được nội dung danh mục, bấm nút "Nạp vào kho tri thức" ở từng dòng (biểu tượng dấu cộng sách) — dòng đã nạp có huy hiệu "Kho tri thức" và nút chuyển thành "Gỡ khỏi kho tri thức".',
      'Nạp nhiều danh mục cùng lúc: tick chọn các dòng (ô vuông đầu dòng, tick ô trên tiêu đề cột để chọn tất cả) → bấm "Nạp N mục vào kho tri thức" trên đầu trang.',
      { img: '09-nap-kho-tri-thuc.png', caption: 'Chọn nhiều dòng và nạp vào kho tri thức' },
      { note: 'Chức năng nạp/gỡ kho tri thức yêu cầu quyền "Nạp danh mục vào kho tri thức" (Catalog.Knowledge) — không có quyền thì nút không hiển thị.' },
    ],
  },
  {
    h: '6. Người dùng',
    intro: 'Quản lý tài khoản đăng nhập web admin (cần quyền Quản lý người dùng).',
    steps: [
      { img: '10-nguoi-dung.png', caption: 'Màn hình Người dùng' },
      'Bấm "Thêm người dùng" → nhập họ tên, email, mật khẩu, chọn vai trò → "Tạo".',
      'Mỗi dòng có nút sửa thông tin, đổi vai trò, khóa/mở khóa tài khoản.',
    ],
  },
  {
    h: '7. Vai trò & quyền',
    intro: 'Phân quyền theo vai trò: mỗi vai trò gồm một tập quyền chi tiết đến từng chức năng; người dùng được gán vai trò.',
    steps: [
      { img: '11-vai-tro-quyen.png', caption: 'Màn hình Vai trò & quyền' },
      'Hệ thống có sẵn 3 vai trò: SystemAdmin (toàn quyền), Manager (nghiệp vụ), Viewer (chỉ xem). Bấm "Thêm vai trò" để tạo vai trò riêng.',
      'Chọn một vai trò → khung "Phân quyền" bên phải liệt kê quyền theo nhóm (Tài liệu, Tri thức, Danh mục, Kiểm tra, AI...). Tick chọn từng quyền hoặc tick cả nhóm.',
      { img: '12-phan-quyen-chi-tiet.png', caption: 'Tick chọn quyền theo nhóm cho vai trò' },
      'Bấm "Lưu quyền" ở cuối khung để áp dụng.',
    ],
  },
  {
    h: '8. Nhật ký kiểm toán',
    intro: 'Ghi vết ai-làm-gì-lúc-nào với các hành động quan trọng (thay đổi cấu hình, phân quyền, đăng nhập...). Chỉ xem, không sửa/xóa được.',
    steps: [
      { img: '13-nhat-ky.png', caption: 'Màn hình Nhật ký kiểm toán' },
      'Lọc theo người thao tác, loại hành động hoặc khoảng thời gian để truy vết sự cố.',
    ],
  },
  {
    h: '9. Cấu hình AI (online / offline)',
    intro: 'Chuyển đổi giữa AI đám mây (OpenRouter) và AI chạy tại chỗ (Ollama), đổi model — áp dụng ngay, không cần khởi động lại. Cần quyền quản trị hệ thống.',
    steps: [
      { img: '14-cau-hinh-ai.png', caption: 'Màn hình Cấu hình AI' },
      'Chọn chế độ Online (OpenRouter) hoặc Offline (Ollama); điền model và thông số tương ứng.',
      'Bấm "Kiểm tra kết nối" để thử trước khi áp dụng.',
      'Bấm "Lưu & áp dụng ngay" (góc phải dưới form).',
      { note: 'Cơ sở không cho dữ liệu ra ngoài nên dùng chế độ Offline — AI chạy ngay trong hạ tầng đơn vị.' },
    ],
  },
  {
    h: '10. Cấu hình Robot (trợ lý trên HIS)',
    intro: 'Tùy biến hình hài và "hệ sinh hoạt" của robot trợ lý hiển thị trên màn hình HIS (qua Chrome Extension).',
    steps: [
      { img: '15-cau-hinh-robot.png', caption: 'Màn hình Cấu hình Robot' },
      'Chỉnh màu sắc, logo, kích thước, các trạng thái cảm xúc... rồi bấm "Lưu & áp dụng".',
      { note: 'Thay đổi áp dụng cho lần tải trang HIS tiếp theo của extension. Nút "Khôi phục mặc định" đưa mọi thứ về ban đầu.' },
    ],
  },
  {
    h: '11. Cấu hình hệ thống',
    intro: 'Các cấu hình vận hành: đồng bộ danh mục ICD-10, nạp đặc tả cấu trúc XML 130, ngưỡng chống spam. Mọi thay đổi áp dụng ngay, lưu bền qua khởi động lại.',
    steps: [
      { img: '16-cau-hinh-he-thong.png', caption: 'Màn hình Cấu hình hệ thống' },
      'Đồng bộ danh mục ICD-10: đặt giờ tự chạy hằng ngày (chỉ tải khi nguồn công bố phiên bản mới) hoặc bấm "Đồng bộ ngay". Dòng trạng thái cho biết phiên bản local / nguồn và kết quả lần chạy gần nhất.',
      'Đặc tả cấu trúc XML 130: bấm "Nạp file đặc tả" → chọn file Excel chỉ tiêu của Bộ Y tế → điều kiện kiểm tra hồ sơ đổi theo file ngay lập tức.',
      'Ngưỡng chống spam: chỉnh số yêu cầu tối đa mỗi phút cho toàn API và từng chức năng nhạy cảm (đăng nhập, quên mật khẩu, hỏi AI, nạp đặc tả) → "Lưu ngưỡng".',
    ],
  },
  {
    h: '12. Tài khoản & giao diện',
    intro: 'Việc cá nhân: đổi thông tin, đổi mật khẩu, chọn giao diện sáng/tối.',
    steps: [
      'Bấm tên tài khoản ở góc trên phải → "Hồ sơ của tôi" để đổi họ tên, mật khẩu.',
      { img: '17-tai-khoan.png', caption: 'Trang tài khoản cá nhân' },
      'Đổi giao diện: bấm biểu tượng mặt trời/mặt trăng trên thanh trên cùng → chọn Sáng / Tối / Theo hệ thống. Lựa chọn được ghi nhớ cho lần sau.',
      { img: '18-doi-giao-dien.png', caption: 'Chuyển giao diện sáng / tối' },
      'Đăng xuất: bấm tên tài khoản → "Đăng xuất".',
      { note: 'Muốn xem lại trang giới thiệu dự án: bấm "Giới thiệu dự án" ở cuối thanh menu trái.' },
    ],
  },
];

// ============ TIỆN ÍCH OOXML ============
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function pngSize(buf) {
  // IHDR: width/height ở byte 16..23
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const media = []; // {name, buf}
let relIdSeq = 10; // rId1..9 dành cho styles/numbering...
let imgSeq = 0;

const run = (t, o = {}) =>
  `<w:r><w:rPr>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}${o.sz ? `<w:sz w:val="${o.sz * 2}"/><w:szCs w:val="${o.sz * 2}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;

const para = (runsXml, o = {}) =>
  `<w:p><w:pPr>${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${o.numId ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${o.numId}"/></w:numPr>` : ''}${o.center ? '<w:jc w:val="center"/>' : ''}${o.after !== undefined ? `<w:spacing w:after="${o.after}"/>` : ''}</w:pPr>${runsXml}</w:p>`;

const text = (t, o = {}) => para(run(t, o), o);

function imageParagraph(fileName, caption) {
  const full = path.join(IMG_DIR, fileName);
  if (!existsSync(full)) {
    // Khung ghi chú chờ ảnh
    return `<w:p><w:pPr><w:pBdr><w:top w:val="dashed" w:sz="6" w:color="8FA3C8"/><w:bottom w:val="dashed" w:sz="6" w:color="8FA3C8"/><w:left w:val="dashed" w:sz="6" w:color="8FA3C8"/><w:right w:val="dashed" w:sz="6" w:color="8FA3C8"/></w:pBdr><w:jc w:val="center"/><w:spacing w:before="80" w:after="80"/></w:pPr>${run(`(Chèn ảnh: ${fileName} — ${caption})`, { i: 1, color: '5B6B8C', sz: 10 })}</w:p>`;
  }
  const buf = readFileSync(full);
  const { w, h } = pngSize(buf);
  const maxW = 600; // px (~15.9cm)
  const scale = Math.min(1, maxW / w);
  const cx = Math.round(w * scale * 9525);
  const cy = Math.round(h * scale * 9525);
  imgSeq++;
  const rId = `rId${relIdSeq++}`;
  const name = `image${imgSeq}.png`;
  media.push({ name, buf, rId });
  const img = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="40"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${imgSeq}" name="${name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imgSeq}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  const cap = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>${run(`Hình: ${caption}`, { i: 1, color: '5B6B8C', sz: 10 })}</w:p>`;
  return img + cap;
}

// ============ DỰNG document.xml ============
let numIdSeq = 1;
const numInstances = []; // mỗi section một numId để đánh số lại từ 1
const body = [];

// Trang bìa
body.push(text('ZeroCheck AI — Chiến binh y tế số', { b: 1, sz: 28, center: 1, color: '0E7490', after: 120 }));
body.push(text('HƯỚNG DẪN SỬ DỤNG WEB ADMIN', { b: 1, sz: 22, center: 1, after: 120 }));
body.push(text('Hệ thống quản trị trợ lý AI kiểm tra hồ sơ khám chữa bệnh BHYT', { center: 1, color: '5B6B8C', after: 80 }));
body.push(text('Địa chỉ: https://cbyts.vnpt.vn', { center: 1, color: '5B6B8C', after: 400 }));

// Mục lục (Word sẽ hỏi cập nhật trường khi mở — chọn Yes)
body.push(text('MỤC LỤC', { b: 1, sz: 16, after: 120 }));
body.push(`<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run('(Mở file bằng Word, bấm chuột phải vào đây → Update Field để hiện mục lục)', { i: 1, color: '5B6B8C' })}<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`);
body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');

for (const sec of SECTIONS) {
  body.push(text(sec.h, { style: 'Heading1' }));
  if (sec.intro) body.push(text(sec.intro, { after: 120 }));
  const numId = ++numIdSeq;
  numInstances.push(numId);
  for (const st of sec.steps) {
    if (typeof st === 'string') {
      body.push(para(run(st), { numId, after: 60 }));
    } else if (st.note) {
      body.push(`<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="120"/></w:pPr>${run('Lưu ý: ', { b: 1, color: '0E7490' })}${run(st.note)}</w:p>`);
    } else if (st.img) {
      body.push(imageParagraph(st.img, st.caption || ''));
    }
  }
}

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="0E7490"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="7C3AED"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0E7490"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`;

const abstractNum = `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="Bước %1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="480" w:hanging="480"/></w:pPr><w:rPr><w:b/><w:color w:val="0E7490"/></w:rPr></w:lvl></w:abstractNum>`;
const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${abstractNum}${numInstances.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${media.map((m) => `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`;

// ============ ZIP ============
const crcTable = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function makeZip(entries) {
  const locals = [], centrals = []; let offset = 0;
  for (const [name, content] of entries) {
    const nameB = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameB.length, 26);
    locals.push(lh, nameB, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([ch, nameB]));
    offset += 30 + nameB.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const entries = [
  ['[Content_Types].xml', contentTypes],
  ['_rels/.rels', rootRels],
  ['word/document.xml', documentXml],
  ['word/_rels/document.xml.rels', docRels],
  ['word/styles.xml', stylesXml],
  ['word/numbering.xml', numberingXml],
];
for (const m of media) entries.push([`word/media/${m.name}`, m.buf]);

writeFileSync(OUT, makeZip(entries));
const missing = SECTIONS.flatMap((s) => s.steps).filter((st) => typeof st === 'object' && st.img && !existsSync(path.join(IMG_DIR, st.img))).map((st) => st.img);
console.log(`OK: đã ghi ${OUT} (${media.length} ảnh nhúng)`);
if (missing.length) console.log(`Còn thiếu ${missing.length} ảnh trong ${IMG_DIR}:\n  ` + missing.join('\n  '));
