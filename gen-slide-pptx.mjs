// Sinh slide-bao-cao.pptx (16:9, nền tối ZeroCheck AI) — Node thuần, không cần thư viện.
// Chạy: node gen-slide-pptx.mjs  (file tạm — xóa sau khi chạy)
import { writeFileSync } from 'fs';

const OUT = 'D:/VNPT/hackathon/api-validation/docs/bao-cao.pptx';

// ---------- màu & font ----------
const BG = '05070F', CARD = '111A3A', CARD2 = '15204a', LINE = '2A3B66';
const TXT = 'E7ECF6', MUT = '9AA7C2', CYAN = '22D3EE', VIO = 'A78BFA',
      GRN = '34D399', AMB = 'FBBF24', RED = 'F87171';
const F = 'Segoe UI', FM = 'Consolas';

// ---------- tiện ích ----------
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const px = v => Math.round(v * 9525);           // 96dpi px -> EMU (slide 1280x720 px)
let _id = 1;
const nid = () => ++_id;

// run: {t, c=TXT, sz=14, b, i, f=F}
function runXml(r){
  const c = r.c || TXT, sz = Math.round((r.sz || 14) * 100), f = r.f || F;
  return `<a:r><a:rPr lang="vi-VN" sz="${sz}"${r.b?' b="1"':''}${r.i?' i="1"':''} dirty="0">`
    + `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`
    + `<a:latin typeface="${f}"/><a:cs typeface="${f}"/></a:rPr><a:t>${esc(r.t)}</a:t></a:r>`;
}
// para: {runs:[...], algn, spcAft(pt), lnSpc(%)}
function paraXml(p){
  const pr = `<a:pPr${p.algn?` algn="${p.algn}"`:''}>`
    + `<a:lnSpc><a:spcPct val="${(p.lnSpc||118)*1000}"/></a:lnSpc>`
    + `<a:spcAft><a:spcPts val="${(p.spcAft??4)*100}"/></a:spcAft></a:pPr>`;
  return `<a:p>${pr}${p.runs.map(runXml).join('')}</a:p>`;
}
// hộp chữ
function tx(x,y,w,h,paras,opts={}){
  const fill = opts.fill ? `<a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>` : '<a:noFill/>';
  const ln = opts.line ? `<a:ln w="12700"><a:solidFill><a:srgbClr val="${opts.line}"/></a:solidFill></a:ln>` : '';
  const geom = opts.round
    ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6500"/></a:avLst></a:prstGeom>`
    : `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`;
  const anchor = opts.anchor || 't';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${nid()}" name="tx${_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${px(x)}" y="${px(y)}"/><a:ext cx="${px(w)}" cy="${px(h)}"/></a:xfrm>${geom}${fill}${ln}</p:spPr>`
    + `<p:txBody><a:bodyPr wrap="square" lIns="${px(opts.pad??10)}" tIns="${px(opts.pad??8)}" rIns="${px(opts.pad??10)}" bIns="${px(opts.pad??8)}" anchor="${anchor}"><a:normAutofit/></a:bodyPr>`
    + `<a:lstStyle/>${paras.map(paraXml).join('')}</p:txBody></p:sp>`;
}
// thẻ nội dung: tiêu đề + các dòng bullet
function card(x,y,w,h,title,lines,accent=CYAN){
  const paras = [{runs:[{t:title, b:1, sz:14.5, c:TXT}], spcAft:6}];
  for(const l of lines){
    const rs = Array.isArray(l) ? l : [{t:l, c:MUT, sz:12.5}];
    paras.push({runs:[{t:'▸ ', c:accent, sz:12.5}, ...rs], spcAft:3, lnSpc:116});
  }
  return tx(x,y,w,h,paras,{fill:CARD, line:LINE, round:1, pad:12});
}
// khối tiêu đề slide
function head(kicker,title){
  const t = [{runs:[{t:'— ', c:CYAN, sz:12, f:FM},{t:kicker.toUpperCase(), c:CYAN, sz:12, f:FM}], spcAft:4}];
  const runs = [];
  for(const part of title) runs.push({t:part.t, b:1, sz:27, c:part.c||TXT});
  return tx(56,26,1170,92,[...t,{runs, spcAft:0, lnSpc:106}]);
}
const stat = (x,y,w,num,lbl,c=CYAN) => tx(x,y,w,86,[
  {runs:[{t:num, b:1, sz:26, c}], spcAft:2},
  {runs:[{t:lbl, c:MUT, sz:11.5}], lnSpc:112, spcAft:0}
],{fill:CARD, line:LINE, round:1, pad:12});

// ---------- dựng 16 slide ----------
const slides = [];

// S1 — Bìa
slides.push([
  tx(70,150,760,330,[
    {runs:[{t:'VNPT AI HACKATHON · BÁO CÁO CUỐI CÙNG', c:CYAN, sz:13, f:FM}], spcAft:14},
    {runs:[{t:'ZeroCheck AI', b:1, sz:48, c:TXT}], spcAft:2},
    {runs:[{t:'Chiến binh y tế số', b:1, sz:40, c:CYAN}], spcAft:14},
    {runs:[{t:'Trợ lý AI kiểm tra hồ sơ khám chữa bệnh BHYT ngay trên HIS — chặn lỗi nhập liệu theo thời gian thực, soát 455 chỉ tiêu XML 130 và hỏi–đáp văn bản y tế có trích dẫn nguồn.', c:MUT, sz:15}], lnSpc:130}
  ]),
  tx(70,500,860,40,[{runs:[{t:'Chrome Extension MV3 · .NET 10 API · Angular 22 Admin · PostgreSQL + pgvector · RAG + LLM', c:CYAN, sz:12.5, f:FM}]}]),
  tx(70,548,860,44,[{runs:[{t:'● ', c:GRN, sz:14},{t:'ĐANG CHẠY THẬT · https://cbyts.vnpt.vn · VNPT Cloud K8s', c:GRN, sz:13.5, f:FM}]}],{fill:'0B2018', line:'1F5B43', round:1}),
  tx(880,180,340,320,[{runs:[{t:'🤖', sz:150}], algn:'ctr'}]),
]);

// S2 — Bài toán
slides.push([
  head('01 · Bài toán', [{t:'Hồ sơ BHYT bị '},{t:'xuất toán',c:CYAN},{t:' vì những lỗi hoàn toàn có thể chặn từ đầu'}]),
  card(56,130,284,168,'⚠  Lỗi phát hiện muộn',[ 'Sai sót chỉ lộ ra khi BHXH giám định','Hồ sơ đã gửi — chịu xuất toán, mất nguồn thu']),
  card(352,130,284,168,'📋  455 chỉ tiêu, 15 bảng',[ 'XML 130 (QĐ 130 + QĐ 4750 + 2024)','Ràng buộc chéo — người soát không xuể']),
  card(648,130,284,168,'📜  Quy định đổi liên tục',[ 'Công văn, danh mục, giá đổi hằng tháng','Phần mềm cứng nhắc không theo kịp']),
  card(944,130,284,168,'🔎  Tra cứu thủ công',[ 'Lật từng văn bản để trả lời nghiệp vụ','Chậm và dễ nhầm']),
  card(56,318,1172,120,'🎯  Mục tiêu',[
    [{t:'Đưa AI vào ', c:MUT, sz:13},{t:'ngay màn hình nhập liệu HIS', b:1, sz:13, c:TXT},{t:': lỗi bị chặn ', c:MUT, sz:13},{t:'trước khi hồ sơ được gửi lên cổng giám định BHXH', b:1, sz:13, c:TXT}],
    [{t:'Mọi thắc mắc quy định được trả lời ', c:MUT, sz:13},{t:'kèm căn cứ văn bản', b:1, sz:13, c:TXT}]
  ],VIO),
]);

// S3 — Giải pháp
slides.push([
  head('02 · Giải pháp', [{t:'Một hệ sinh thái — '},{t:'ba mảnh ghép',c:CYAN}]),
  card(56,130,378,230,'🧩  Chrome Extension trên HIS',[
    'Chạy ngầm trên trang HIS VNPT (MV3, TypeScript)','Tự nhận diện form, cảnh báo tại chỗ khi nhập sai',
    'Khung chat: tải hồ sơ XML 130, hỏi đáp nghiệp vụ','Robot mascot tùy biến hình hài từ admin']),
  card(453,130,378,230,'🧠  AI Validation API (.NET 10)',[
    'Bộ máy luật: 455 đặc tả trường + 100 luật liên trường','RAG hỏi–đáp văn bản có trích dẫn nguồn',
    'AI nhận định nguy cơ xuất toán (bật mới chạy)','Đổi AI online (OpenRouter) ⇄ offline (Ollama)'],VIO),
  card(850,130,378,230,'🖥  Web Admin (Angular 22)',[
    'Kho tri thức, danh mục HIS, đặc tả XML 130','Cấu hình AI, robot, chống spam — áp dụng ngay',
    'Phân quyền chi tiết theo vai trò + kiểm toán','Không cần build lại khi quy định thay đổi']),
  stat(56,392,378,'< 50 ms','cảnh báo nhập liệu tại chỗ (luật cục bộ)'),
  stat(453,392,378,'173 ms','p95 kiểm tra trọn một hồ sơ XML 130 (không AI) — đo bằng k6, 341 lượt, 3 cỡ hồ sơ'),
  stat(850,392,378,'100%','kết quả kiểm tra lần nào cũng như lần nào — AI chỉ tư vấn, không quyết định thay',VIO),
]);

// S4 — Kiến trúc
const node = (x,y,w,h,t,d,ac=LINE)=> tx(x,y,w,h,[
  {runs:[{t, b:1, sz:13.5, c:TXT}], algn:'ctr', spcAft:3},
  {runs:[{t:d, c:MUT, sz:11}], algn:'ctr', lnSpc:112, spcAft:0}
],{fill:CARD2, line:ac, round:1, anchor:'ctr'});
slides.push([
  head('03 · Kiến trúc hệ thống', [{t:'Kiến trúc '},{t:'3 lớp',c:CYAN},{t:' — cần thêm sức tải, chỉ việc thêm máy chủ'}]),
  node(56,132,578,88,'🧩 Chrome Extension (HIS VNPT)','Phân tích biểu mẫu · Theo dõi thay đổi · Giám sát trang động · Quản lý cảnh báo · Khung chat',CYAN),
  node(650,132,578,88,'🖥 Web Admin (Angular 22)','Kho tri thức · Danh mục · Cấu hình AI/robot/chống spam · Phân quyền · Kiểm toán',CYAN),
  tx(56,222,1172,26,[{runs:[{t:'▼   HTTPS / JSON · CORS · JWT', c:CYAN, sz:11.5, f:FM}], algn:'ctr'}]),
  node(56,250,1172,96,'⚙️ AI Validation API — ASP.NET Core (.NET 10)','Phân tích XML 130 tổng quát · Kiểm tra đặc tả trường (field_specs.json) · 6 luật liên bảng · Bộ máy luật ×15 · Truy hồi + xếp hạng văn bản (RAG) · Bộ chuyển mô hình AI · Chống spam · Phân quyền · Xử lý lỗi toàn cục',VIO),
  tx(56,348,1172,26,[{runs:[{t:'▼   EF Core · truy vấn an toàn (chống SQL injection)', c:CYAN, sz:11.5, f:FM}], algn:'ctr'}]),
  node(56,376,378,96,'🐘 PostgreSQL 14+','danh mục tri thức (ICD ~15.000 mã) · văn bản y tế · đoạn văn bản — chỉ mục toàn văn GIN + vector HNSW'),
  node(453,376,378,96,'🤖 Nhà cung cấp mô hình AI','OpenRouter (GPT/Claude/Llama…) hoặc Ollama tại chỗ — đổi lúc vận hành, không sửa code',VIO),
  node(850,376,378,96,'☸️ VNPT Cloud K8s','vùng cbyts · cổng vào TLS · ổ lưu cấu hình bền · tự kiểm tra sức khỏe dịch vụ'),
]);

// S5 — Tính năng 1: realtime
slides.push([
  head('04 · Tính năng 1', [{t:'Cảnh báo nhập liệu '},{t:'thời gian thực',c:CYAN},{t:' trên HIS'}]),
  card(56,130,578,110,'🔍  Tự nhận diện form — không cấu hình cứng',[
    'Quét trang, nhận diện trường theo nhãn / gợi ý / thuộc tính','Dùng trên mọi màn hình HIS, không khai báo từng trang']),
  card(56,252,578,110,'👁  Bắt mọi thay đổi',[
    'Theo dõi mọi sự kiện nhập – sửa trên form','Kể cả trường do JavaScript sinh ra sau khi trang tải']),
  card(56,374,578,110,'⚡  Hai tầng kiểm tra',[
    'Luật cục bộ: phản hồi < 50 ms ngay trong trình duyệt','Luật sâu (ICD, danh mục, liên trường) gọi API','Việc nhập liệu không bao giờ phải dừng chờ AI']),
  card(650,130,578,206,'💬  Cảnh báo ngay tại ô nhập',[
    'Viền đỏ (lỗi) / vàng (cảnh báo) quanh trường sai','Tooltip tiếng Việt + gợi ý sửa cụ thể',
    'Âm báo tùy chọn, không che màn hình làm việc','Robot mascot cấu hình hình hài từ web admin'],VIO),
  tx(650,348,578,136,[
    {runs:[{t:'his.vnpt.vn — cảnh báo mẫu', c:MUT, sz:11, f:FM}], spcAft:6},
    {runs:[{t:'⚠ [Hạn thẻ BHYT] GT_THE_DEN 2026-03-01 < ngày vào viện', c:AMB, sz:12, f:FM}], spcAft:3},
    {runs:[{t:'→ Gợi ý: kiểm tra hạn thẻ hoặc quy tắc 15 ngày nội trú', c:GRN, sz:12, f:FM}], spcAft:0}
  ],{fill:'070B18', line:LINE, round:1, pad:14}),
]);

// S6 — Giao diện extension
slides.push([
  head('05 · Giao diện extension', [{t:'Trợ lý nổi '},{t:'một chạm',c:CYAN},{t:' — ngay trên màn hình HIS'}]),
  tx(56,130,700,352,[
    {runs:[{t:'🔒 his.vnpt.vn — Tiếp nhận khám chữa bệnh BHYT', c:MUT, sz:11.5, f:FM}], spcAft:8},
    {runs:[{t:'Họ và tên:  NGUYỄN VĂN AN ✓', c:GRN, sz:12.5, f:FM}], spcAft:4},
    {runs:[{t:'Mã thẻ BHYT:  DN489489300123', c:RED, sz:12.5, f:FM}], spcAft:2},
    {runs:[{t:'   ⚠ Mã thẻ thiếu 1 ký tự (14/15) — kiểm tra lại chuỗi mã trên thẻ', c:RED, sz:11.5, f:FM}], spcAft:4},
    {runs:[{t:'Hạn thẻ đến:  01/03/2026', c:RED, sz:12.5, f:FM}], spcAft:2},
    {runs:[{t:'   ⚠ Thẻ hết hạn trước ngày vào viện 15/07/2026 — nguy cơ xuất toán', c:RED, sz:11.5, f:FM}], spcAft:4},
    {runs:[{t:'Ngày vào viện:  15/07/2026 08:32 ✓', c:GRN, sz:12.5, f:FM}], spcAft:10},
    {runs:[{t:'┌ 🤖 ZeroCheck AI ─────────  ⚠️ Cảnh báo (2) | 💬 Trợ lý ┐', c:CYAN, sz:11.5, f:FM}], spcAft:4},
    {runs:[{t:'BẠN: Quốc hội ban hành luật bảo hiểm y tế?', c:CYAN, sz:11.5, f:FM}], spcAft:2},
    {runs:[{t:'BOT: Luật số 25/2008/QH12, thông qua 14/11/2008 [Nguồn 1]', c:TXT, sz:11.5, f:FM}], spcAft:2},
    {runs:[{t:'     📚 Nguồn: 25_2008__LUAT_BAO_HIEM_Y_TE — 3 trích đoạn', c:MUT, sz:11, f:FM}], spcAft:4},
    {runs:[{t:'BẠN: 📄 hoso_56006_072026.xml ▶', c:CYAN, sz:11.5, f:FM}], spcAft:2},
    {runs:[{t:'BOT: Đã kiểm 455 chỉ tiêu: 3 LỖI · 2 CẢNH BÁO', c:TXT, sz:11.5, f:FM}], spcAft:2},
    {runs:[{t:'     ⚠ Hồ sơ có nguy cơ xuất toán — ưu tiên sửa hạn thẻ BHYT', c:AMB, sz:11.5, f:FM}], spcAft:0},
  ],{fill:'0B1224', line:LINE, round:1, pad:16}),
  card(772,130,456,352,'🖱  Trải nghiệm',[
    [{t:'Một nút nổi 🤖', b:1, sz:12.5, c:TXT},{t:' — panel 2 tab: Cảnh báo & Trợ lý', c:MUT, sz:12.5}],
    'Có lỗi mới → tự bật tab Cảnh báo + badge đếm số',
    'Đang chat → chỉ hiện chấm đỏ, không làm phiền',
    'Kéo thả nhiều file XML — khay file có nút ▶ kiểm từng hồ sơ',
    'Từ 2 hồ sơ: đối chiếu chéo trùng giường, trùng giờ bác sĩ, trùng đợt điều trị',
    'Robot có cảm xúc: pháo giấy 🎉 khi hồ sơ sạch, lo lắng khi có lỗi'],VIO),
]);

// S7 — XML130
slides.push([
  head('06 · Tính năng 2', [{t:'Soát hồ sơ XML 130 — '},{t:'455 chỉ tiêu, 100 luật',c:CYAN},{t:', kết quả dạng cây'}]),
  tx(56,130,640,300,[
    {runs:[{t:'Kiểm tra hồ sơ', b:1, sz:12.5, c:CYAN, f:FM}], spcAft:3},
    ...[
      ['├─ Thông tin bệnh nhân','mã thẻ · hạn thẻ · ĐKBĐ · tuổi'],
      ['├─ Chẩn đoán','ICD chính/phụ · giới tính · độ tuổi'],
      ['├─ Dịch vụ kỹ thuật','SL×ĐG×tỷ lệ · thời gian y lệnh'],
      ['├─ Thuốc','phù hợp ICD · danh mục · tuổi'],
      ['├─ Thời gian','vào ≤ ra · khám < 5 phút → cảnh báo'],
      ['├─ Tài chính','cơ cấu nguồn · T_THUOC = Σ XML2'],
      ['├─ Liên kết','MA_LK khớp XML1 · giấy tờ khớp'],
      ['└─ Hành chính','chuyển tuyến XML13 · hẹn khám XML14'],
    ].map(([a,b])=>({runs:[{t:(a+'  ').padEnd(26,' '), c:TXT, sz:12, f:FM},{t:b, c:MUT, sz:12, f:FM}], spcAft:3})),
    {runs:[{t:'Mỗi vấn đề: mã luật · mức độ · vị trí · gợi ý sửa · cờ xuatToanRisk', c:AMB, sz:11.5, f:FM}], spcAft:0}
  ],{fill:CARD, line:LINE, round:1, pad:14}),
  card(712,130,516,132,'🧮  6 luật liên trường – liên bảng',[
    'Thẻ BHYT · Trình tự thời gian · Tài chính','Chẩn đoán · Liên kết hồ sơ · Logic nội/ngoại trú',
    'Độc lập, an toàn khi lỗi — một luật hỏng không chặn luật khác'],VIO),
  stat(712,274,250,'15','bảng XML1–XML15'),
  stat(974,274,254,'455','trường theo đặc tả QĐ 130 / 4750'),
  stat(712,372,250,'100','luật nghiệp vụ công khai qua API',VIO),
  stat(974,372,254,'2 cách nạp','tải file XML — hoặc gõ mã bệnh nhân',VIO),
]);

// S8 — RAG
const step=(x,t1,t2,d)=>tx(x,130,286,148,[
  {runs:[{t:t1, c:VIO, sz:10.5, f:FM}], spcAft:3},
  {runs:[{t:t2, b:1, sz:13.5, c:TXT}], spcAft:4},
  {runs:[{t:d, c:MUT, sz:11.5}], lnSpc:116, spcAft:0}
],{fill:CARD, line:LINE, round:1, pad:12});
slides.push([
  head('07 · Tính năng 3', [{t:'AI '},{t:'học văn bản y tế',c:CYAN},{t:' — hỏi đáp có trích dẫn nguồn (RAG)'}]),
  step(56,'B1 · NẠP VĂN BẢN','Chia đoạn thông minh','Cắt đoạn ~1.200 ký tự không đứt câu; đánh chỉ mục tìm được cả theo từ lẫn theo nghĩa'),
  step(351,'B2 · TÌM KIẾM','Tìm 2 chiều','Quét rộng 25–40 đoạn liên quan: hiểu theo nghĩa (diễn đạt khác vẫn tìm ra) + khớp từ khóa'),
  step(646,'B3 · CHỌN LỌC','Giữ 5 đoạn đúng nhất','AI chấm điểm mức liên quan, mỗi văn bản tối đa 3 đoạn — văn bản ngắn không bị lấn át'),
  step(941,'B4 · TRẢ LỜI','Trả lời có kiểm soát','Chỉ trả lời theo trích đoạn, dẫn [Nguồn n]; thiếu căn cứ thì nói thẳng "không tìm thấy"'),
  card(56,296,578,180,'💬  Ví dụ thật trên hệ thống đang chạy',[
    [{t:'Hỏi: ', b:1, sz:12.5, c:TXT},{t:'"Thẻ BHYT hết hạn trong đợt nội trú thì thanh toán thế nào?"', c:MUT, sz:12.5}],
    [{t:'Đáp: ', b:1, sz:12.5, c:TXT},{t:'"…thanh toán đến ngày ra viện, tối đa không quá 15 ngày kể từ ngày thẻ hết hạn [Nguồn 1]" — trích đúng QĐ 130/QĐ-BYT', c:MUT, sz:12.5}]]),
  card(650,296,578,180,'📚  Kho tri thức sống',[
    'Nạp .pdf / .doc / .xls / .txt / .md — PDF scan tự OCR',
    'Văn bản hết hiệu lực tự loại khỏi truy hồi','Danh mục HIS nạp vào kho theo lựa chọn từng dòng',
    'Công văn mới: nạp file → AI dùng ngay, không cần khởi động lại'],VIO),
]);

// S9 — Web admin
slides.push([
  head('08 · Tính năng 4', [{t:'Web Admin — '},{t:'quy định đổi, hệ thống đổi theo',c:CYAN}]),
  card(56,130,378,140,'📐  Nạp đặc tả XML 130',[ 'Upload Excel 15 bảng chỉ tiêu','Điều kiện kiểm đổi theo file ngay, ghi bền qua ổ lưu']),
  card(453,130,378,140,'📦  Danh mục HIS',[ 'Import Excel tự nhận diện 26 loại','Nạp/gỡ từng danh mục vào kho tri thức một nút']),
  card(850,130,378,140,'🔁  AI online ⇄ offline',[ 'OpenRouter ⇄ Ollama, đổi mô hình, kiểm tra kết nối','Không cần khởi động lại']),
  card(56,282,378,140,'🛡  Chống spam chỉnh ngay',[ 'Chỉnh số lần gọi tối đa/phút từng chức năng','Áp dụng tức thì trên giao diện']),
  card(453,282,378,140,'👥  Phân quyền + kiểm toán',[ 'Quyền chi tiết đến từng chức năng','Nhật ký kiểm toán ai-sửa-gì-lúc-nào']),
  card(850,282,378,140,'🤖  Cấu hình robot & ICD',[ 'Tùy biến hình hài, hệ sinh hoạt robot','Lịch đồng bộ ICD-10 mỗi ngày + Đồng bộ ngay']),
  card(56,434,1172,60,'💡  Một nguyên tắc chung',[
    [{t:'Mọi cấu hình sửa trên admin: áp dụng ngay · lưu bền qua khởi động lại · chỉ người có quyền sửa được · đều để lại vết nhật ký', c:MUT, sz:12.5}]],VIO),
]);

// S10 — Thuật toán
slides.push([
  head('09 · Thuật toán & cách làm', [{t:'Những lựa chọn kỹ thuật '},{t:'đáng giá',c:CYAN}]),
  card(56,130,578,166,'🧬  Bộ phân tích tổng quát — không khai báo cứng',[
    'Tự nhận ra từng dòng dữ liệu trong file XML','Đọc đủ 15 bảng ~455 trường, không viết mã riêng từng bảng',
    'Bộ Y tế điều chỉnh chỉ tiêu → không cần sửa code']),
  card(650,130,578,166,'📖  Danh mục luật 2 lớp',[
    'cross_field_rules.json: danh mục đọc được (100 luật, công khai)','Mã C# là máy thực thi',
    'Đặc tả sinh bán tự động bằng AI từ 16 sheet Excel Bộ Y tế']),
  card(56,308,578,178,'🎯  RAG thay vì huấn luyện lại (fine-tune)',[
    'Công văn mới: nạp file dùng ngay (huấn luyện: giờ→ngày)','Truy vết nguồn: trích dẫn từng đoạn (fine-tune: không thể)',
    'Bịa đặt: từ chối khi thiếu căn cứ','Dữ liệu nhạy cảm: nằm trong CSDL, xóa được'],VIO),
  card(650,308,578,178,'⚖️  Luật quyết định — AI tư vấn',[
    'Kiểm chắc chắn được → dùng luật: chạy lại luôn ra đúng một kết quả, không tốn phí AI',
    'AI tổng hợp, xếp việc cần sửa theo mức ảnh hưởng tài chính',
    'Kết luận "nguy cơ xuất toán" luôn do bộ máy luật tính','AI đặt chế độ trả lời ổn định nhất (temperature = 0)'],VIO),
]);

// S11 — Minh chứng AI
slides.push([
  head('10 · Minh chứng AI thật', [{t:'Nhật ký hệ thống thật — '},{t:'không dàn dựng',c:CYAN}]),
  tx(56,130,640,300,[
    {runs:[{t:'kubectl -n cbyts logs deployment/api-validation · 2026-07-28', c:MUT, sz:11, f:FM}], spcAft:7},
    {runs:[{t:'16:38:24.708  IEmbeddingService  POST → Ollama bge-m3', c:TXT, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'16:38:24.957  ← embedding trả về (248 ms)', c:GRN, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'16:38:24.961  EFCore SELECT … document_chunks', c:TXT, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'  WHERE "SearchVector" @@ plainto_tsquery(@q)', c:MUT, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'  -- lai: pgvector + toàn văn, chỉ văn bản còn hiệu lực', c:MUT, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:"16:38:28.984  LLMProvider → OpenRouter 'openai/gpt-4o-mini'", c:VIO, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'16:38:28.984  Sending: UserPromptLength=6039', c:AMB, sz:11.5, f:FM}], spcAft:3},
    {runs:[{t:'16:38:31.877  ✓ Response: CompletionTokens=169', c:GRN, sz:11.5, f:FM}], spcAft:0},
  ],{fill:'070B18', line:LINE, round:1, pad:16}),
  card(712,130,516,208,'📊  Chỉ số đo thật',[
    'Điểm gọi API: POST /api/assistant/ask @ cbyts.vnpt.vn','Tìm ngữ cảnh: theo nghĩa (pgvector) + theo từ khóa',
    'Nội dung gửi AI: 6.039 ký tự · sinh 169 token','Tổng độ trễ đầu–cuối: 9,49 giây',
    '"fromLlm": true + trích dẫn khớp [Nguồn 1]']),
  card(712,350,516,110,'🔍  Tự kiểm chứng được',[
    'Gọi API rồi mở nhật ký máy chủ — cả chuỗi xử lý (vector hóa → tìm đoạn → chọn lọc → AI trả lời) hiện nguyên trong log'],VIO),
]);

// S12 — Hiệu năng
slides.push([
  head('11 · Hiệu năng', [{t:'Kiểm tra tức thì — '},{t:'AI chỉ bật khi cần',c:CYAN}]),
  tx(56,130,640,200,[
    {runs:[{t:'Thao tác'.padEnd(38,' ')+'Thời gian', b:1, c:CYAN, sz:12, f:FM}], spcAft:6},
    {runs:[{t:'Kiểm tra XML 130 (bộ máy luật)'.padEnd(36,' '), c:TXT, sz:12, f:FM},{t:'p95 173 ms', c:GRN, b:1, sz:12, f:FM}], spcAft:4},
    {runs:[{t:'Kiểm tra + nhận định AI (bật mới chạy)'.padEnd(36,' '), c:TXT, sz:12, f:FM},{t:'2–8 giây', c:MUT, sz:12, f:FM}], spcAft:4},
    {runs:[{t:'Hỏi đáp có trích dẫn (tìm < 50 ms)'.padEnd(36,' '), c:TXT, sz:12, f:FM},{t:'2–6 giây', c:MUT, sz:12, f:FM}], spcAft:4},
    {runs:[{t:'Nạp văn bản 100 trang'.padEnd(36,' '), c:TXT, sz:12, f:FM},{t:'< 2 giây', c:GRN, b:1, sz:12, f:FM}], spcAft:0},
  ],{fill:CARD, line:LINE, round:1, pad:16}),
  card(56,344,640,140,'📈  Mở rộng',[
    'Cần thêm sức tải chỉ việc thêm máy chủ chạy song song','Cơ sở dữ liệu là điểm chung duy nhất',
    'File nhiều hồ sơ có thể xử lý song song khi kiểm cả lô'],VIO),
  card(712,130,516,354,'🚀  Thiết kế cho tốc độ',[
    '15.000 mã ICD + đặc tả trường đệm sẵn trong bộ nhớ','Tra tức thời — không truy vấn CSDL trong vòng lặp luật',
    'Tìm toàn văn qua chỉ mục tính sẵn lúc ghi — đọc nhanh','Nhập liệu không phải chờ AI — AI mặc định tắt, bật mới chạy',
    'Giới hạn tải lên: XML 50 MB, văn bản 20 MB']),
]);

// S13 — Bảo mật
slides.push([
  head('12 · Bảo mật', [{t:'Dữ liệu y tế nhạy cảm — '},{t:'phòng thủ nhiều lớp',c:CYAN}]),
  card(56,130,378,166,'🚫  Không lưu hồ sơ bệnh án',[ 'File XML 130 kiểm xong là bỏ','Không ghi đĩa, không lưu vào CSDL','Nhật ký chỉ ghi mã hồ sơ, không ghi nội dung']),
  card(453,130,378,166,'🏠  AI chạy ngay trong bệnh viện',[ 'Ollama tại chỗ — dữ liệu không rời cơ sở','Dùng AI đám mây: chỉ gửi mô tả lỗi, không gửi định danh bệnh nhân']),
  card(850,130,378,166,'🔐  Phân quyền + kiểm toán',[ 'Đăng nhập an toàn + quyền chi tiết từng chức năng','Nhật ký ai-sửa-gì-lúc-nào','Xóa chỉ là gỡ mềm, giữ vết']),
  card(56,308,378,178,'🧱  Chặn đầu vào',[ 'Chỉ nhận đúng kiểu file khai báo','XML không DTD, không thực thể ngoài (an toàn XXE)','Truy vấn tham số hóa 100% — không ghép chuỗi SQL']),
  card(453,308,378,178,'🤐  Không lộ bí mật',[ 'API key qua biến môi trường — repo không chứa key','Xử lý lỗi toàn cục trả mã truy vết','Không lộ chi tiết kỹ thuật ra ngoài']),
  card(850,308,378,178,'🛡  Chống spam (rate limit)',[ 'Chung 100 yêu cầu/phút/IP','Đăng nhập 5 · quên mật khẩu 3 · hỏi AI 10 · nạp file 5','Vượt ngưỡng bị chặn kèm thời gian chờ, báo tiếng Việt','Ngưỡng chỉnh được ngay trên admin'],VIO),
]);

// S14 — Triển khai
slides.push([
  head('13 · Triển khai & vận hành', [{t:'Đang chạy thật trên '},{t:'VNPT Cloud',c:CYAN}]),
  card(56,130,578,230,'☸️  Hạ tầng production',[
    'Kubernetes (vùng cbyts) — chạy thật tại https://cbyts.vnpt.vn','Cấu hình ghi bền — khởi động lại không mất',
    'Tự kiểm tra sức khỏe dịch vụ cho bộ cân bằng tải','Cập nhật lược đồ CSDL tự động, chạy lại an toàn',
    'Sao lưu định kỳ kho văn bản + danh mục (bệnh án không lưu nên không cần)']),
  card(650,130,578,230,'🔄  Vận hành không gián đoạn',[
    'Công văn mới: nạp file → AI dùng ngay','Danh mục thuốc/giá đổi: nạp Excel → luật đối chiếu tự cập nhật',
    'QĐ điều chỉnh chỉ tiêu: nạp Excel đặc tả → điều kiện kiểm đổi theo','Đổi mô hình AI / ngưỡng chống spam: vài giây trên admin',
    'Tất cả không cần nâng cấp phần mềm, không gián đoạn hệ thống'],VIO),
  tx(56,376,1172,44,[{runs:[{t:'.NET 10 · Angular 22 · PostgreSQL 14 + pgvector · Ollama bge-m3 · OpenRouter · K8s + TLS · Chrome Extension MV3', c:CYAN, sz:12.5, f:FM}], algn:'ctr'}],{fill:CARD, line:LINE, round:1, anchor:'ctr'}),
]);

// S15 — Hiệu quả
slides.push([
  head('14 · Hiệu quả mang lại', [{t:'Từ "phát hiện muộn – mất tiền" sang '},{t:'"chặn sớm – có căn cứ"',c:CYAN}]),
  card(56,130,578,196,'✗  Trước',[
    'Lỗi lộ ra khi BHXH giám định — đã gửi, chịu xuất toán','Soát tay 455 chỉ tiêu × hàng nghìn hồ sơ',
    'Tra văn bản thủ công, trả lời theo trí nhớ','Quy định mới → chờ nâng cấp phần mềm'],RED),
  card(650,130,578,196,'✓  Sau',[
    'Cảnh báo < 50 ms lúc gõ · soát trọn hồ sơ p95 173 ms trước gửi','100 luật + 455 đặc tả tự động — kết quả ổn định, không tốn phí AI',
    'Hỏi đáp có trích dẫn nguồn trong vài giây','Quy định mới = nạp file trên admin — hiệu lực tức thì'],GRN),
  stat(56,344,282,'13,4 triệu đ','chi BHYT của 6 hồ sơ lỗi trong bộ thử (hồ sơ thật, nhiều tỉnh) — chặn trước cổng giám định'),
  stat(352,344,282,'11,7 triệu đ','riêng 1 lỗi trùng lịch bác sĩ giữa 2 hồ sơ — chỉ lộ khi đối chiếu chéo lô'),
  stat(648,344,282,'~3.500×','nhanh hơn soát tay 455 chỉ tiêu (p95 173 ms vs ~10 phút) → soát 100% hồ sơ',VIO),
  stat(944,344,284,'0','hồ sơ bệnh án lưu trên hệ thống — an toàn dữ liệu tuyệt đối',VIO),
]);

// S15c — Quy đổi giá trị: từ số đo thật trên bộ thử → quy mô 1 bệnh viện / 1 năm.
// Nguyên tắc: cột trái là số ĐÃ ĐO, cột phải là quy đổi với giả định GHI RÕ —
// giám khảo tự kiểm được phép nhân, không có số "từ trên trời".
slides.push([
  head('15 · Quy đổi giá trị', [{t:'Nếu một bệnh viện dùng thật — '},{t:'con số là bao nhiêu?',c:CYAN}]),
  card(56,130,578,196,'📏  Số ĐÃ ĐO trên bộ hồ sơ thật',[
    '8 hồ sơ thật nhiều tỉnh → 6 hồ sơ lỗi, 13,4 triệu đ chi BHYT',
    'Trung bình ≈ 2,2 triệu đ nguy cơ xuất toán / hồ sơ lỗi',
    'Lỗi chéo lô (trùng lịch bác sĩ) 11,7 triệu đ — soát tay không thấy được',
    'Soát trọn hồ sơ p95 173 ms; 20 người cùng lúc p95 1,85 s · p99 2,12 s · 15,6 hồ sơ/giây · 0% lỗi (k6)'],CYAN),
  card(650,130,578,196,'🧮  Quy đổi THẬN TRỌNG (giả định ghi rõ)',[
    'Bệnh viện tuyến huyện ~5.000 hồ sơ BHYT/tháng (giả định)',
    'Chỉ 1% hồ sơ dính lỗi nguy cơ xuất toán (bộ thử chọn lọc cao hơn nhiều)',
    '→ 50 hồ sơ lỗi × 2,2 triệu ≈ 110 triệu đ/tháng được chặn sớm',
    'Soát tay ~10 phút/hồ sơ ≈ 833 giờ công/tháng → máy làm xong trong ~17 phút'],VIO),
  stat(56,344,282,'≈ 1,3 tỷ đ/năm','nguy cơ xuất toán được chặn sớm tại MỘT bệnh viện (theo giả định trên)'),
  stat(352,344,282,'≈ 5 nhân sự','giờ công soát thủ công được giải phóng mỗi tháng (833 giờ ÷ 168 giờ/người)'),
  stat(648,344,282,'×100 cơ sở','mỗi 100 cơ sở dùng ≈ 130 tỷ đ/năm — tính năng bán kèm nâng sức cạnh tranh VNPT HIS',VIO),
  stat(944,344,284,'~0 đ','chi phí biên: phần luật không tốn phí AI — stateless, thêm máy là tăng tải',VIO),
]);

// S15b — Đối chiếu tiêu chí chấm của BTC
const crit = (pts, name, evi) => [
  { runs: [{ t: `${pts}đ · `, b: 1, sz: 13.5, c: CYAN }, { t: name, b: 1, sz: 13.5, c: TXT }], spcAft: 1 },
  { runs: [{ t: evi, c: MUT, sz: 11.5 }], lnSpc: 112, spcAft: 8 },
];
slides.push([
  head('16 · Đối chiếu tiêu chí chấm', [{ t: 'ZeroCheck AI trả lời ' }, { t: 'từng tiêu chí', c: CYAN }, { t: ' của Ban tổ chức' }]),
  tx(56, 122, 1172, 570, [
    ...crit(20, 'Giải quyết bài toán & hoàn thiện', 'Chạy thật end-to-end trên production: extension trên HIS · 455 chỉ tiêu, 100 luật · hỏi–đáp trích dẫn nguồn · web admin đủ vòng đời vận hành'),
    ...crit(20, 'Ứng dụng công cụ AI trong phát triển', 'Toàn bộ dự án xây cùng AI agent (Claude Code): sinh đặc tả 455 trường + 100 luật từ 16 sheet Excel QĐ 130, viết code/migration/tài liệu — 3 lần deploy mỗi ngày'),
    ...crit(15, 'Kỹ thuật & kiến trúc (Cloud Native, CI/CD, ATTT)', 'K8s VNPT Cloud + pgvector + Ollama trong cụm · CI/CD 2 pipeline theo tag · không lưu bệnh án, RBAC từng endpoint, chống spam, an toàn XXE/SQL-injection'),
    ...crit(20, 'Giá trị thực tiễn với SXKD', 'Đo trên bộ hồ sơ thật nhiều tỉnh: 6 hồ sơ lỗi mang 13,4 triệu đ chi BHYT chặn trước cổng giám định (riêng lỗi chéo lô 11,7 triệu đ/2 hồ sơ) · soát 455 chỉ tiêu p95 173 ms (k6) ≈ 3.500× soát tay → soát 100% hồ sơ; quy định đổi = nạp file'),
    ...crit(10, 'Trải nghiệm người dùng (UI/UX)', 'Cảnh báo tại ô nhập < 50 ms không cắt luồng làm việc · robot 1 chạm 2 tab · admin sáng/tối hiện đại · 100% tiếng Việt, responsive'),
    ...crit(10, 'Khả thi kỹ thuật & mở rộng', 'Stateless — thêm máy chủ là tăng tải · parser tổng quát: QĐ mới không sửa code · đổi mô hình AI lúc vận hành · sẵn mã CSKCB cho đa cơ sở'),
    ...crit(5, 'Sáng tạo giải pháp kỹ thuật', 'Luật quyết định – AI tư vấn (AI không phán đạt/rớt) · truy hồi 2 bước + đa dạng nguồn tiếng Việt · tự nhận diện form · keepalive xuyên LB'),
  ], { fill: CARD, line: LINE, round: 1, pad: 16 }),
]);

// S16 — Kết
slides.push([
  tx(70,150,820,340,[
    {runs:[{t:'KẾT LUẬN', c:CYAN, sz:13, f:FM}], spcAft:12},
    {runs:[{t:'Chặn lỗi trước khi', b:1, sz:38, c:TXT}], spcAft:2},
    {runs:[{t:'hồ sơ lên cổng giám định', b:1, sz:38, c:CYAN}], spcAft:14},
    {runs:[{t:'Thay vì để BHXH phát hiện sai sót sau khi đã gửi, ZeroCheck AI soát ngay lúc nhập liệu và trước lúc đẩy hồ sơ lên cổng — luật quyết định, AI tư vấn, con người kiểm soát.', c:MUT, sz:15}], lnSpc:132, spcAft:16},
    {runs:[{t:'● DEMO TRỰC TIẾP · https://cbyts.vnpt.vn', c:GRN, sz:14, f:FM}], spcAft:10},
    {runs:[{t:'Đội Chiến binh y tế số · VNPT AI Hackathon 2026 · Trân trọng cảm ơn Ban giám khảo!', c:MUT, sz:13}]}
  ]),
  tx(900,200,300,260,[{runs:[{t:'🤖', sz:130}], algn:'ctr'}]),
]);

// ---------- lắp file PPTX ----------
const XMLH = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const treeHead = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const bgXml = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;

const slideXml = shapes => XMLH + `<p:sld ${NS}><p:cSld>${bgXml}<p:spTree>${treeHead}${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;

const theme = XMLH + `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="ZeroCheck"><a:themeElements><a:clrScheme name="ZC"><a:dk1><a:srgbClr val="0B1224"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="05070F"/></a:dk2><a:lt2><a:srgbClr val="E7ECF6"/></a:lt2><a:accent1><a:srgbClr val="${CYAN}"/></a:accent1><a:accent2><a:srgbClr val="${VIO}"/></a:accent2><a:accent3><a:srgbClr val="${GRN}"/></a:accent3><a:accent4><a:srgbClr val="${AMB}"/></a:accent4><a:accent5><a:srgbClr val="${RED}"/></a:accent5><a:accent6><a:srgbClr val="${LINE}"/></a:accent6><a:hlink><a:srgbClr val="${CYAN}"/></a:hlink><a:folHlink><a:srgbClr val="${VIO}"/></a:folHlink></a:clrScheme><a:fontScheme name="ZC"><a:majorFont><a:latin typeface="${F}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${F}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ZC"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const master = XMLH + `<p:sldMaster ${NS}><p:cSld>${bgXml}<p:spTree>${treeHead}</p:spTree></p:cSld><p:clrMap bg1="dk2" tx1="lt1" bg2="dk1" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;

const layout = XMLH + `<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${treeHead}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const n = slides.length;
const contentTypes = XMLH + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`;

const rootRels = XMLH + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;

const presentation = XMLH + `<p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${2+i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;

const presRels = XMLH + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_,i)=>`<Relationship Id="rId${2+i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('')}<Relationship Id="rId${2+n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`;

const masterRels = XMLH + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;

const layoutRels = XMLH + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;

const slideRels = XMLH + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;

// ---------- ZIP (stored, CRC32) ----------
const crcTable = (()=>{ const t=new Uint32Array(256); for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c = (c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[i]=c>>>0; } return t; })();
const crc32 = buf => { let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c = crcTable[(c^buf[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };

function makeZip(entries){
  const locals=[], centrals=[]; let offset=0;
  for(const [name,content] of entries){
    const nameB = Buffer.from(name,'utf8'), data = Buffer.from(content,'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0x0800,6);
    lh.writeUInt16LE(0,8); lh.writeUInt16LE(0,10); lh.writeUInt16LE(0,12);
    lh.writeUInt32LE(crc,14); lh.writeUInt32LE(data.length,18); lh.writeUInt32LE(data.length,22);
    lh.writeUInt16LE(nameB.length,26); lh.writeUInt16LE(0,28);
    locals.push(lh,nameB,data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(0x0800,8);
    ch.writeUInt16LE(0,10); ch.writeUInt16LE(0,12); ch.writeUInt16LE(0,14);
    ch.writeUInt32LE(crc,16); ch.writeUInt32LE(data.length,20); ch.writeUInt32LE(data.length,24);
    ch.writeUInt16LE(nameB.length,28); ch.writeUInt16LE(0,30); ch.writeUInt16LE(0,32);
    ch.writeUInt16LE(0,34); ch.writeUInt16LE(0,36); ch.writeUInt32LE(0,38); ch.writeUInt32LE(offset,42);
    centrals.push(Buffer.concat([ch,nameB]));
    offset += 30 + nameB.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(0,4); eocd.writeUInt16LE(0,6);
  eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10);
  eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(offset,16); eocd.writeUInt16LE(0,20);
  return Buffer.concat([...locals, cd, eocd]);
}

const entries = [
  ['[Content_Types].xml', contentTypes],
  ['_rels/.rels', rootRels],
  ['ppt/presentation.xml', presentation],
  ['ppt/_rels/presentation.xml.rels', presRels],
  ['ppt/slideMasters/slideMaster1.xml', master],
  ['ppt/slideMasters/_rels/slideMaster1.xml.rels', masterRels],
  ['ppt/slideLayouts/slideLayout1.xml', layout],
  ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', layoutRels],
  ['ppt/theme/theme1.xml', theme],
];
slides.forEach((shapes,i)=>{
  entries.push([`ppt/slides/slide${i+1}.xml`, slideXml(shapes)]);
  entries.push([`ppt/slides/_rels/slide${i+1}.xml.rels`, slideRels]);
});

const zip = makeZip(entries);
writeFileSync(OUT, zip);
console.log(`OK: đã ghi ${OUT} — ${slides.length} slide, ${(zip.length/1024).toFixed(0)} KB`);
