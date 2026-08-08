/*
 * Sinh file PPTX "Chiến binh y tế số" — phong cách sổ tay phác thảo (doodle, chữ viết
 * tay, robot AI vẽ tay). Mọi hình đều là SVG nét run tự vẽ → PNG (sharp) → nhúng slide.
 * Chạy: node gen.js  → ../Bao-cao-hackathon-Chien-binh-y-te-so.pptx
 */
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const path = require('path');

// ----- bảng màu "bút mực + bút dạ" -----
const INK = '2B2B2B';      // mực đen
const BLUE = '2F6FED';     // bút bi xanh
const RED = 'E4572E';      // bút đỏ (cảnh báo)
const GREEN = '2E9E5B';    // xanh lá (đạt)
const YELLOW = 'FFE066';   // bút dạ vàng highlight
const GRAY = '9AA0A6';
const PAPER = 'FFFFFF';

const FONT = 'Segoe Print';        // chữ viết tay có sẵn trên Windows
const FONT_FALLBACK = 'Comic Sans MS';

// ================= SVG doodle helpers =================
let seed = 7;
function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function jitter(v, amt = 3) { return v + (rnd() - 0.5) * amt; }

/** Đường thẳng run tay: chia đoạn, lệch nhẹ điểm giữa. */
function rline(x1, y1, x2, y2, amt = 4) {
  const mx = (x1 + x2) / 2 + (rnd() - 0.5) * amt * 2;
  const my = (y1 + y2) / 2 + (rnd() - 0.5) * amt * 2;
  return `M${jitter(x1, amt)},${jitter(y1, amt)} Q${mx},${my} ${jitter(x2, amt)},${jitter(y2, amt)}`;
}
function rrect(x, y, w, h, amt = 4) {
  return [rline(x, y, x + w, y, amt), rline(x + w, y, x + w, y + h, amt),
    rline(x + w, y + h, x, y + h, amt), rline(x, y + h, x, y, amt)].join(' ');
}
function rellipse(cx, cy, rx, ry, amt = 3) {
  const k = 0.5523;
  const j = () => (rnd() - 0.5) * amt;
  return `M${cx - rx + j()},${cy} C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx + j()},${cy - ry}`
    + ` C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx + j()},${cy}`
    + ` C${cx + rx},${cy + ry * k} ${cx + rx * k},${cy + ry} ${cx + j()},${cy + ry}`
    + ` C${cx - rx * k},${cy + ry} ${cx - rx},${cy + ry * k} ${cx - rx + j()},${cy}`;
}
function arrowHead(x, y, angleDeg, size = 16) {
  const a = (angleDeg * Math.PI) / 180;
  const p = (da) => `${x - size * Math.cos(a + da)},${y - size * Math.sin(a + da)}`;
  return `M${p(0.5)} L${x},${y} L${p(-0.5)}`;
}
/** Mũi tên cong vẽ tay từ (x1,y1) tới (x2,y2). */
function rarrow(x1, y1, x2, y2, bend = 0.15) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const ang = Math.atan2(y2 - my, x2 - mx) * 180 / Math.PI;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2} ` + arrowHead(x2, y2, ang);
}
const S = (d, color = INK, w = 5, fill = 'none') =>
  `<path d="${d}" stroke="#${color}" stroke-width="${w}" fill="${fill === 'none' ? 'none' : '#' + fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
const HL = (x, y, w, h, color = YELLOW) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2.5}" fill="#${color}" opacity="0.85" transform="rotate(-1 ${x + w / 2} ${y + h / 2})"/>`;
const TXT = (x, y, size, text, color = INK, anchor = 'middle', bold = true) =>
  `<text x="${x}" y="${y}" font-family="Segoe Print, Comic Sans MS, cursive" font-size="${size}" fill="#${color}" text-anchor="${anchor}" font-weight="${bold ? 'bold' : 'normal'}">${text}</text>`;
function svg(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
}
async function png(svgStr, scale = 2) {
  const buf = await sharp(Buffer.from(svgStr), { density: 96 * scale }).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}

// ================= các hình doodle =================
/** Robot: mode = 'wave' | 'read' | 'search' | 'think' | 'point' */
function robot(mode = 'wave', accent = BLUE) {
  let extra = '';
  const armL = { wave: rline(120, 250, 55, 175, 5), read: rline(120, 250, 85, 300, 5), search: rline(120, 250, 70, 300, 5), think: rline(120, 250, 90, 165, 5), point: rline(120, 250, 70, 285, 5) }[mode];
  const armR = { wave: rline(240, 250, 300, 285, 5), read: rline(240, 250, 275, 300, 5), search: rline(240, 250, 305, 200, 5), think: rline(240, 250, 300, 285, 5), point: rline(240, 250, 320, 195, 5) }[mode];
  if (mode === 'wave') extra = S('M40,150 q-8,-14 4,-22 M28,168 q-12,-10 -2,-24 M52,140 q-2,-12 10,-16', accent, 4);
  if (mode === 'read') extra = S(rrect(120, 290, 120, 80, 3), INK, 4, 'FFF7D6') + S(rline(180, 292, 180, 368, 2), INK, 3)
    + S(rline(132, 310, 172, 310, 2), GRAY, 3) + S(rline(132, 328, 172, 328, 2), GRAY, 3)
    + S(rline(188, 310, 228, 310, 2), GRAY, 3) + S(rline(188, 328, 228, 328, 2), GRAY, 3);
  if (mode === 'search') extra = S(rellipse(330, 175, 34, 34), accent, 6) + S(rline(352, 200, 385, 235, 3), accent, 7);
  if (mode === 'think') extra = S(rellipse(300, 90, 10, 8), GRAY, 3) + S(rellipse(325, 65, 14, 11), GRAY, 3) + S(rellipse(360, 35, 20, 15), GRAY, 3);
  if (mode === 'point') extra = S(arrowHead(335, 188, 25, 14), accent, 5);
  return (
    // ăng-ten + đầu
    S(rline(180, 60, 180, 30, 2), INK, 4) + S(rellipse(180, 22, 8, 8), accent, 4, accent) +
    S(rrect(110, 60, 140, 100, 4), INK, 5, 'FFFFFF') +
    // mắt + miệng
    S(rellipse(150, 105, 11, 13), INK, 4, INK) + S(rellipse(210, 105, 11, 13), INK, 4, INK) +
    S('M150,135 Q180,152 210,135', INK, 4) +
    // tai
    S(rline(103, 95, 88, 95, 2), INK, 5) + S(rline(257, 95, 272, 95, 2), INK, 5) +
    // thân + tim mạch
    S(rrect(120, 175, 120, 105, 4), INK, 5, 'FFFFFF') +
    S('M132,225 L152,225 L160,205 L172,245 L182,225 L228,225', accent, 4) +
    // tay + chân
    S(armL, INK, 5) + S(armR, INK, 5) +
    S(rline(150, 285, 150, 330, 3), INK, 5) + S(rline(210, 285, 210, 330, 3), INK, 5) +
    S(rline(138, 332, 165, 332, 2), INK, 5) + S(rline(198, 332, 225, 332, 2), INK, 5) +
    extra
  );
}
const robotSVG = (mode, w = 400, h = 400) => svg(w, h, robot(mode));

// khung card phác thảo (đóng khung nội dung)
const frameSVG = (w, h, color = INK) => svg(w, h, S(rrect(8, 8, w - 16, h - 16, 5), color, 5));
// gạch chân tay
const scribbleSVG = (w, color = BLUE) => svg(w, 26, S(`M8,14 Q${w * 0.3},${jitter(6, 4)} ${w * 0.55},13 T${w - 8},12`, color, 6));

// tài liệu chồng
const docsSVG = () => svg(300, 300,
  S(rrect(70, 60, 150, 190, 4), GRAY, 4, 'FFFFFF') + S(rrect(55, 45, 150, 190, 4), INK, 5, 'FFFFFF')
  + S(rline(75, 90, 175, 90, 2), GRAY, 4) + S(rline(75, 120, 185, 120, 2), GRAY, 4)
  + S(rline(75, 150, 165, 150, 2), GRAY, 4) + S(rline(75, 180, 180, 180, 2), GRAY, 4)
  + S('M85,205 l14,16 l26,-30', GREEN, 6));
// bệnh viện
const hospitalSVG = () => svg(320, 300,
  S(rrect(50, 110, 220, 150, 5), INK, 5, 'FFFFFF') + S('M40,115 L160,45 L280,115', INK, 5)
  + S(rrect(140, 190, 46, 70, 3), INK, 4) + S(rrect(78, 140, 40, 36, 3), GRAY, 4) + S(rrect(202, 140, 40, 36, 3), GRAY, 4)
  + S(rline(160, 70, 160, 100, 2), RED, 7) + S(rline(145, 85, 175, 85, 2), RED, 7));
// tiền bay mất
const moneySVG = () => svg(300, 260,
  S(rrect(60, 90, 150, 90, 4), INK, 5, 'FFF7D6') + S(rellipse(135, 135, 26, 26), INK, 4)
  + TXT(135, 147, 30, '₫', INK) + S('M225,95 q30,-18 48,-40', RED, 5) + S(arrowHead(276, 52, -50, 14), RED, 5)
  + S('M235,140 q26,4 44,-8', RED, 4) + S('M228,170 q22,16 40,12', RED, 4)
  + TXT(150, 225, 26, 'xuất toán!', RED));
// giường 2 bệnh nhân
const bedSVG = () => svg(320, 240,
  S(rline(45, 90, 45, 190, 3), INK, 5) + S(rline(275, 120, 275, 190, 3), INK, 5)
  + S(rline(45, 150, 275, 150, 3), INK, 5) + S(rrect(60, 118, 90, 30, 3), GRAY, 4, 'FFFFFF')
  + S(rellipse(95, 100, 15, 15), INK, 4) + S(rellipse(150, 100, 15, 15), RED, 4)
  + TXT(215, 105, 40, '?!', RED) + TXT(160, 220, 24, '2 người / 1 giường', INK));
// bác sĩ 2 nơi
const doctorSVG = () => svg(320, 240,
  S(rellipse(90, 70, 20, 20), INK, 4) + S(rline(90, 92, 90, 150, 3), INK, 5)
  + S(rline(90, 105, 60, 135, 3), INK, 4) + S(rline(90, 105, 120, 135, 3), INK, 4)
  + S(rellipse(230, 70, 20, 20), GRAY, 4) + S(rline(230, 92, 230, 150, 3), GRAY, 5)
  + S('M120,70 q40,-25 88,-2', RED, 4) + S(arrowHead(206, 66, 15, 12), RED, 4)
  + TXT(160, 200, 24, '1 bác sĩ, 2 phòng,', INK) + TXT(160, 228, 24, 'CÙNG giờ ?!', RED));
// thuốc trùng
const pillSVG = () => svg(320, 240,
  S(rrect(70, 80, 60, 90, 4), INK, 5, 'FFFFFF') + S(rrect(70, 60, 60, 22, 3), BLUE, 4, 'FFFFFF')
  + S(rrect(180, 80, 60, 90, 4), INK, 5, 'FFFFFF') + S(rrect(180, 60, 60, 22, 3), BLUE, 4, 'FFFFFF')
  + TXT(100, 130, 22, '1-5/7', INK) + TXT(210, 130, 22, '4/7 ?!', RED)
  + TXT(160, 215, 18, 'liều cũ chưa hết đã cấp thêm', INK));
// sách + trích dẫn
const bookSVG = () => svg(320, 260,
  S('M60,200 L60,70 Q110,50 160,70 L160,200 Q110,182 60,200', INK, 5, 'FFFFFF')
  + S('M160,200 L160,70 Q210,50 260,70 L260,200 Q210,182 160,200', INK, 5, 'FFF7D6')
  + S(rline(80, 100, 140, 92, 2), GRAY, 3) + S(rline(80, 125, 140, 117, 2), GRAY, 3)
  + S(rline(180, 92, 240, 100, 2), GRAY, 3) + S(rline(180, 117, 240, 125, 2), GRAY, 3)
  + TXT(160, 240, 22, 'trả lời KÈM trích dẫn', INK));
// đồng hồ + lịch (tự học ban đêm)
const clockSVG = () => svg(300, 260,
  S(rellipse(150, 120, 75, 75), INK, 5, 'FFFFFF') + S(rline(150, 120, 150, 70, 2), INK, 5)
  + S(rline(150, 120, 185, 135, 2), INK, 5) + S(rellipse(150, 120, 5, 5), INK, 4, INK)
  + TXT(150, 33, 26, '00:00', BLUE) + TXT(150, 240, 22, 'tự chạy mỗi đêm', INK));
// database + vector
const dbSVG = () => svg(300, 270,
  S(rellipse(150, 60, 85, 26), INK, 5, 'FFFFFF') + S(rline(65, 60, 65, 180, 3), INK, 5)
  + S(rline(235, 60, 235, 180, 3), INK, 5) + S('M65,180 Q150,215 235,180', INK, 5)
  + S('M65,120 Q150,150 235,120', GRAY, 4)
  + TXT(150, 100, 22, '105.232', BLUE) + TXT(150, 165, 20, 'vector', BLUE)
  + TXT(150, 250, 22, 'pgvector + HNSW', INK));
// khiên bảo mật
const shieldSVG = () => svg(280, 260,
  S('M140,40 L215,70 L215,140 Q215,200 140,230 Q65,200 65,140 L65,70 Z', INK, 5, 'FFFFFF')
  + S('M108,135 l22,24 l42,-52', GREEN, 7) + TXT(140, 253, 20, 'dữ liệu không rời BV', INK));

// ================= dựng deck =================
(async () => {
  const p = new pptxgen();
  p.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  p.layout = 'WIDE';
  p.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const T = (opts) => ({ fontFace: FONT, color: INK, ...opts });
  const W = 13.33, H = 7.5;

  async function bg(slide) {
    slide.background = { color: PAPER };
    // lề sổ tay: khung nét run bao quanh slide
    slide.addImage({ data: await png(svg(1333, 750, S(rrect(14, 14, 1305, 722, 6), 'D8DCE3', 4))), x: 0, y: 0, w: W, h: H });
  }
  async function title(slide, text, x = 0.55, y = 0.28, size = 30, scribbleW = null) {
    slide.addText(text, T({ x, y, w: W - x - 0.6, h: 0.75, fontSize: size, bold: true }));
    const sw = scribbleW ?? Math.min(0.24 * text.length + 0.8, 8);
    slide.addImage({ data: await png(scribbleSVG(Math.round(sw * 100))), x, y: y + 0.72, w: sw, h: 0.26 });
  }
  async function card(slide, x, y, w, h, color = INK) {
    slide.addImage({ data: await png(frameSVG(Math.round(w * 100), Math.round(h * 100), color)), x, y, w, h });
  }

  // ---------- 1. TRANG BÌA ----------
  {
    const s = p.addSlide(); await bg(s);
    s.addImage({ data: await png(robotSVG('wave')), x: 8.65, y: 1.45, w: 4.1, h: 4.1 });
    s.addText('VNPT HACKATHON 2026 — "BUILD WITH AI"', T({ x: 0.8, y: 0.75, w: 8, h: 0.5, fontSize: 16, color: GRAY, bold: true }));
    s.addShape('roundRect', { x: 0.75, y: 1.55, w: 7.5, h: 0.02, fill: { color: PAPER } });
    s.addImage({ data: await png(svg(760, 130, HL(6, 30, 748, 80))), x: 0.72, y: 1.62, w: 7.6, h: 1.3 });
    s.addText('CHIẾN BINH Y TẾ SỐ', T({ x: 0.8, y: 1.5, w: 7.6, h: 1.5, fontSize: 44, bold: true }));
    s.addText('Trợ lý AI cảnh báo lỗi hồ sơ khám chữa bệnh trên VNPT HIS\n— chặn xuất toán BHYT TRƯỚC khi gửi cổng giám định —',
      T({ x: 0.8, y: 3.15, w: 7.7, h: 1.3, fontSize: 19 }));
    s.addText([
      { text: 'Đội: Chiến binh Y tế số  ·  Viễn thông Khánh Hòa\n', options: {} },
      { text: 'Đội trưởng: Hoàng Văn Quyền', options: {} },
    ], T({ x: 0.8, y: 5.35, w: 7.5, h: 1.1, fontSize: 17, color: GRAY }));
    s.addText('(bấm để robot bắt đầu kể chuyện...)', T({ x: 8.75, y: 5.75, w: 4, h: 0.4, fontSize: 12, color: GRAY, italic: true, align: 'center' }));
    s.addNotes('Chào Ban tổ chức. Đội Chiến binh Y tế số - Viễn thông Khánh Hòa. Sản phẩm: trợ lý AI gắn thẳng vào VNPT HIS, chặn lỗi hồ sơ BHYT trước khi bị xuất toán.');
  }

  // ---------- 2. VẤN ĐỀ ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Nỗi đau: bị TRỪ TIỀN mới biết hồ sơ sai');
    s.addImage({ data: await png(hospitalSVG()), x: 0.75, y: 1.7, w: 3.1, h: 2.9 });
    s.addImage({ data: await png(moneySVG()), x: 0.95, y: 4.55, w: 2.7, h: 2.35 });
    s.addImage({ data: await png(svg(180, 120, S(rarrow(20, 30, 160, 95, 0.25), RED, 6))), x: 3.5, y: 3.9, w: 1.5, h: 1.0 });
    const pains = [
      ['Phát hiện SAU', 'Cơ sở KCB chỉ biết hồ sơ lỗi khi giám định BHXH đã từ chối thanh toán — tiền đã mất, không sửa được nữa.'],
      ['Lỗi rất khó thấy', 'Sai sót nằm rải trong 455 trường dữ liệu / 15 bảng XML; nhiều lỗi chỉ lộ ra khi ĐỐI CHIẾU NHIỀU hồ sơ với nhau.'],
      ['Quy định đổi liên tục', 'Thông tư, danh mục, mức hưởng thay đổi thường xuyên — con người không kịp nhớ, phần mềm cứng không kịp sửa.'],
    ];
    let y = 1.75;
    for (const [head, body] of pains) {
      await card(s, 5.35, y, 7.3, 1.62);
      s.addText(head, T({ x: 5.6, y: y + 0.12, w: 6.9, h: 0.5, fontSize: 17, bold: true, color: RED }));
      s.addText(body, T({ x: 5.6, y: y + 0.6, w: 6.85, h: 0.95, fontSize: 13 }));
      y += 1.78;
    }
    s.addNotes('Bài toán: xuất toán BHYT phát hiện sau khi đã bị trừ tiền. Lỗi nằm rải trong 455 trường, nhiều lỗi chỉ thấy khi so nhiều hồ sơ. Quy định đổi liên tục.');
  }

  // ---------- 3. GIẢI PHÁP TỔNG QUAN ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Giải pháp: 3 mảnh ghép + 1 bộ não AI');
    const boxes = [
      ['Chrome Extension', 'gắn thẳng lên VNPT HIS\nđang chạy — KHÔNG sửa HIS,\ncảnh báo ngay lúc nhập liệu', BLUE, 0.8],
      ['AI Validation API', 'rule engine 100+ luật\n+ đối chiếu chéo hồ sơ\n+ RAG hỏi đáp có trích dẫn', RED, 5.0],
      ['Web Admin', 'quản trị kho tri thức,\ndanh mục HIS, tải văn bản,\nlịch tự học của AI', GREEN, 9.2],
    ];
    for (const [head, body, color, x] of boxes) {
      await card(s, x, 1.85, 3.35, 2.5, color);
      s.addText(head, T({ x: x + 0.2, y: 2.0, w: 3, h: 0.55, fontSize: 18, bold: true, color }));
      s.addText(body, T({ x: x + 0.2, y: 2.62, w: 3.0, h: 1.6, fontSize: 13 }));
    }
    s.addImage({ data: await png(svg(160, 90, S(rarrow(15, 45, 145, 45, 0.1), INK, 6))), x: 4.15, y: 2.85, w: 0.9, h: 0.55 });
    s.addImage({ data: await png(svg(160, 90, S(rarrow(15, 45, 145, 45, 0.1), INK, 6))), x: 8.35, y: 2.85, w: 0.9, h: 0.55 });
    s.addImage({ data: await png(robotSVG('point')), x: 5.35, y: 4.35, w: 2.7, h: 2.7 });
    s.addText('AI đứng giữa: hiểu nghiệp vụ BHYT, tự học văn bản mới,\nsuy luận trên dữ liệu — chạy được 100% OFFLINE trong bệnh viện',
      T({ x: 8.15, y: 5.1, w: 4.6, h: 1.5, fontSize: 14, italic: true }));
    s.addImage({ data: await png(svg(500, 60, HL(4, 8, 492, 44))), x: 8.1, y: 5.05, w: 5.0, h: 0.6 });
    s.addNotes('Ba mảnh ghép: Extension trên HIS (không sửa HIS), API AI ở giữa, Web Admin quản trị. AI chạy 100% offline được — dữ liệu y tế không rời bệnh viện.');
  }

  // ---------- 4. KIỂM TRA XML 130 ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Gác cổng 1: soi từng hồ sơ XML 130');
    s.addImage({ data: await png(robotSVG('search')), x: 0.7, y: 1.9, w: 3.4, h: 3.4 });
    s.addImage({ data: await png(docsSVG()), x: 1.5, y: 4.7, w: 2.2, h: 2.2 });
    const stats = [
      ['455', 'trường dữ liệu / 15 bảng\ntheo QĐ 130 & 4750/QĐ-BYT', BLUE],
      ['100+', 'luật liên trường, liên bảng:\nthời gian, tiền, ICD, thẻ BHYT...', RED],
      ['2.000+', 'hồ sơ/lô — cả THÁNG dữ liệu,\nkết quả chảy về từng hồ sơ (streaming)', GREEN],
    ];
    let x = 4.6;
    for (const [num, lbl, color] of stats) {
      await card(s, x, 1.95, 2.72, 2.5, color);
      s.addText(num, T({ x: x + 0.15, y: 2.15, w: 2.4, h: 0.9, fontSize: 40, bold: true, color, align: 'center' }));
      s.addText(lbl, T({ x: x + 0.18, y: 3.15, w: 2.38, h: 1.2, fontSize: 12, align: 'center' }));
      x += 2.88;
    }
    await card(s, 4.6, 4.85, 8.15, 1.9);
    s.addText('Mỗi cảnh báo chỉ RÕ: hồ sơ nào — bảng/dòng nào — vì sao sai — SỬA THẾ NÀO,\nkèm cờ "nguy cơ xuất toán" và căn cứ văn bản. Không phán chung chung.',
      T({ x: 4.85, y: 5.05, w: 7.7, h: 1.55, fontSize: 15 }));
    s.addNotes('Tầng 1: kiểm tra từng hồ sơ — 455 trường, hơn 100 luật liên trường. Cả tháng dữ liệu hơn 2000 hồ sơ vẫn chạy streaming. Cảnh báo chỉ rõ chỗ sai và cách sửa.');
  }

  // ---------- 5. ĐỐI CHIẾU CHÉO ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Gác cổng 2: AI suy luận CHÉO nhiều hồ sơ');
    s.addText('— những lỗi mà xem TỪNG hồ sơ không bao giờ thấy —', T({ x: 0.6, y: 1.32, w: 9, h: 0.4, fontSize: 14, italic: true, color: GRAY }));
    const imgs = [[bedSVG(), 'Trùng giường'], [doctorSVG(), 'Bác sĩ "phân thân"'], [pillSVG(), 'Thuốc cấp trùng']];
    let x = 0.85;
    for (const [im, cap] of imgs) {
      await card(s, x, 1.7, 3.7, 3.35);
      s.addImage({ data: await png(im), x: x + 0.35, y: 1.95, w: 3.0, h: 2.25 });
      s.addText(cap, T({ x: x + 0.2, y: 4.3, w: 3.3, h: 0.5, fontSize: 16, bold: true, align: 'center', color: RED }));
      x += 3.95;
    }
    await card(s, 0.85, 5.4, 11.8, 1.55, GREEN);
    s.addText([
      { text: 'Không chỉ BÁO — còn CHỈ CÁCH XỬ: ', options: { bold: true, color: GREEN } },
      { text: 'ví dụ trùng giường thì gợi ý chia tiền đúng TT 22/2023/TT-BYT (2 người: 50%, từ 3 người: 30%) và tính sẵn số tiền. Hồ sơ sớm nhất tự được chọn làm gốc — chỉ cảnh báo hồ sơ sau.', options: {} },
    ], T({ x: 1.1, y: 5.58, w: 11.3, h: 1.25, fontSize: 14 }));
    s.addNotes('Tầng 2 - điểm khác biệt lớn nhất: đối chiếu chéo giữa các hồ sơ. 2 người 1 giường, bác sĩ 2 nơi cùng giờ, thuốc cấp trùng, bệnh nhân 2 khoa đồng thời. Kèm cách xử lý theo đúng thông tư.');
  }

  // ---------- 6. RAG HỎI ĐÁP ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Bộ não tri thức: hỏi gì cũng có NGUỒN');
    s.addImage({ data: await png(robotSVG('read')), x: 0.75, y: 1.85, w: 3.3, h: 3.3 });
    s.addImage({ data: await png(bookSVG()), x: 1.15, y: 5.0, w: 2.6, h: 2.1 });
    const rows = [
      ['Nạp mọi định dạng', 'PDF (kể cả bản SCAN — OCR tiếng Việt 3 tầng), Word cũ/mới, Excel (tự ghép tiêu đề cột), TXT/MD.'],
      ['Chỉ nói khi có căn cứ', 'Trả lời DỰA TRÊN văn bản đã nạp + trích dẫn nguồn để đối chiếu — không bịa (chống hallucination).'],
      ['Hiểu "hiệu lực"', 'Văn bản hết hiệu lực hoặc CHƯA tới ngày hiệu lực: tự động không trích dẫn. Đúng ngày tự "mở khóa".'],
      ['Tìm theo NGHĨA', 'Hỏi khác từ ngữ trong văn bản vẫn ra — tìm kiếm ngữ nghĩa vector + từ khóa + full-text kết hợp.'],
    ];
    let y = 1.8;
    for (const [head, body] of rows) {
      await card(s, 4.45, y, 8.3, 1.22);
      s.addText(head, T({ x: 4.7, y: y + 0.08, w: 3.0, h: 1.0, fontSize: 14, bold: true, color: BLUE }));
      s.addText(body, T({ x: 7.6, y: y + 0.08, w: 5.0, h: 1.06, fontSize: 11.5 }));
      y += 1.36;
    }
    s.addNotes('Bộ não RAG: nạp mọi định dạng kể cả PDF scan (OCR 3 tầng), trả lời luôn kèm trích dẫn, tự hiểu hiệu lực văn bản, tìm theo ngữ nghĩa chứ không chỉ theo từ khóa.');
  }

  // ---------- 7. AI TỰ HỌC ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'AI TỰ HỌC — kho tri thức "sống"');
    s.addImage({ data: await png(robotSVG('think')), x: 9.4, y: 1.6, w: 3.3, h: 3.3 });
    const items = [
      [clockSVG(), 'Tự đồng bộ ICD-10', 'mỗi đêm theo lịch hẹn,\nchỉ tải khi có PHIÊN BẢN mới'],
      [docsSVG(), 'Tự tải văn bản pháp luật', 'tìm & tải toàn văn từ vbpl.vn,\nbản scan tự OCR'],
      [dbSVG(), 'Tự đánh chỉ mục ngữ nghĩa', '105.232 vector, PostgreSQL\npgvector + HNSW, embed local'],
    ];
    let x = 0.8;
    for (const [im, head, body] of items) {
      await card(s, x, 1.75, 2.75, 3.85);
      s.addImage({ data: await png(im), x: x + 0.35, y: 1.95, w: 2.05, h: 1.85 });
      s.addText(head, T({ x: x + 0.12, y: 3.9, w: 2.5, h: 0.8, fontSize: 14, bold: true, align: 'center', color: BLUE }));
      s.addText(body, T({ x: x + 0.12, y: 4.62, w: 2.5, h: 0.9, fontSize: 11, align: 'center' }));
      x += 2.92;
    }
    await card(s, 0.8, 5.85, 11.75, 1.15, GREEN);
    s.addText('Nạp văn bản hôm nay → AI biết ngay hôm nay. Gỡ bỏ → quên ngay. Không cần huấn luyện lại model, không cần đội bảo trì dữ liệu.',
      T({ x: 1.05, y: 6.0, w: 11.3, h: 0.9, fontSize: 14, italic: true }));
    s.addNotes('AI tự học 3 đường: đồng bộ ICD hằng đêm theo phiên bản, tự tải văn bản từ vbpl.vn kể cả bản scan, tự đánh chỉ mục ngữ nghĩa - hiện 105 nghìn vector trên pgvector. Tri thức sống, không cần train lại.');
  }

  // ---------- 8. LUỒNG HOẠT ĐỘNG ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Một vòng đời hồ sơ — từ bàn phím tới BHXH');
    const steps = [
      ['1. Nhập liệu trên HIS', 'extension theo dõi form,\ncảnh báo NGAY khi gõ sai', BLUE],
      ['2. Trước khi gửi', 'upload XML 130 (1 file\nhoặc cả lô) vào khung chat', BLUE],
      ['3. AI kiểm tra', 'rule engine + đối chiếu chéo\n+ AI nhận định nguy cơ', RED],
      ['4. Sửa theo gợi ý', 'lỗi chỉ đích danh dòng,\nkèm cách sửa & căn cứ', GREEN],
      ['5. Gửi BHXH', 'hồ sơ sạch — không còn\nbất ngờ khi giám định', GREEN],
    ];
    const y0 = 2.1; const wBox = 2.28;
    let x = 0.62;
    for (let i = 0; i < steps.length; i++) {
      const [head, body, color] = steps[i];
      const yy = y0 + (i % 2 === 0 ? 0 : 1.15);
      await card(s, x, yy, wBox, 2.05, color);
      s.addText(head, T({ x: x + 0.13, y: yy + 0.1, w: wBox - 0.26, h: 0.75, fontSize: 13, bold: true, color }));
      s.addText(body, T({ x: x + 0.13, y: yy + 0.82, w: wBox - 0.24, h: 1.1, fontSize: 10.5 }));
      if (i < steps.length - 1) {
        const ax = x + wBox - 0.06;
        const up = i % 2 === 0;
        s.addImage({ data: await png(svg(120, 110, S(rarrow(10, up ? 30 : 80, 110, up ? 80 : 30, 0.18), INK, 6))), x: ax, y: y0 + 0.75, w: 0.72, h: 0.7 });
      }
      x += wBox + 0.28;
    }
    s.addImage({ data: await png(shieldSVG()), x: 5.6, y: 5.15, w: 2.15, h: 2.0 });
    s.addText('Tùy chọn 100% offline: LLM + embedding chạy local (Ollama) — dữ liệu bệnh nhân KHÔNG rời bệnh viện, chi phí license AI = 0đ.',
      T({ x: 7.9, y: 5.5, w: 5.0, h: 1.4, fontSize: 13, italic: true }));
    s.addText('Hỏi đáp nghiệp vụ bất kỳ lúc nào ngay trong khung chat trên HIS.', T({ x: 0.7, y: 5.7, w: 4.6, h: 1.0, fontSize: 13, italic: true }));
    s.addNotes('Luồng: nhập liệu được cảnh báo ngay - trước khi gửi thì check cả lô - AI kiểm tra và chỉ đích danh chỗ sửa - hồ sơ sạch mới đi BHXH. Toàn bộ chạy offline được.');
  }

  // ---------- 9. CÔNG NGHỆ ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Dưới nắp capo — chọn gì và vì sao');
    const tech = [
      ['.NET 10 + PostgreSQL', 'rule engine, streaming NDJSON,\nEF Core — nền vững, dễ vận hành', BLUE],
      ['pgvector + HNSW', 'tìm ngữ nghĩa bằng SQL trên\n105 nghìn vector — không tốn RAM', BLUE],
      ['Ollama (LLM + bge-m3)', 'AI chạy LOCAL miễn phí; một nút\nchuyển online khi cần chất lượng cao', GREEN],
      ['Chrome Extension + Angular', 'gắn lên HIS không sửa code HIS;\nweb admin phân quyền đầy đủ', BLUE],
      ['OCR Tesseract 3 tầng', 'đọc được cả công văn scan mờ\n(tessdata_best tiếng Việt)', GREEN],
      ['Kiến trúc "tự lành"', 'thiếu pgvector → tự chạy chế độ dự phòng;\nvbpl đổi giao diện → chỉ sửa cấu hình', RED],
    ];
    let i = 0;
    for (const [head, body, color] of tech) {
      const x = 0.8 + (i % 3) * 4.0, y = 1.8 + Math.floor(i / 3) * 2.5;
      await card(s, x, y, 3.75, 2.2, color);
      s.addText(head, T({ x: x + 0.2, y: y + 0.12, w: 3.4, h: 0.85, fontSize: 15, bold: true, color }));
      s.addText(body, T({ x: x + 0.2, y: y + 1.0, w: 3.4, h: 1.1, fontSize: 11.5 }));
      i++;
    }
    s.addText('Triết lý: mọi thứ hỏng ĐƯỢC PHÉP hỏng lẻ — hệ thống vẫn chạy, chỉ giảm chất lượng dần.', T({ x: 0.85, y: 6.55, w: 11.6, h: 0.55, fontSize: 13, italic: true, color: GRAY }));
    s.addNotes('Công nghệ: .NET 10, PostgreSQL pgvector, Ollama chạy local 0 đồng, extension không đụng HIS, OCR 3 tầng. Triết lý thiết kế: degradation - hỏng lẻ vẫn chạy.');
  }

  // ---------- 10. KẾT QUẢ + LỘ TRÌNH ----------
  {
    const s = p.addSlide(); await bg(s);
    await title(s, 'Đã đi được 90% — và còn đi xa hơn');
    const nums = [['90%', 'khối lượng cam kết'], ['105.232', 'đoạn tri thức đã chỉ mục'], ['100+', 'luật kiểm tra'], ['5', 'nhóm đối chiếu chéo']];
    let x = 0.8;
    for (const [n, l] of nums) {
      await card(s, x, 1.7, 2.8, 1.75);
      s.addText(n, T({ x: x + 0.1, y: 1.82, w: 2.6, h: 0.85, fontSize: 30, bold: true, color: BLUE, align: 'center' }));
      s.addText(l, T({ x: x + 0.12, y: 2.72, w: 2.56, h: 0.6, fontSize: 11.5, align: 'center' }));
      x += 2.97;
    }
    await card(s, 0.8, 3.85, 7.3, 3.1, GREEN);
    s.addText('Lộ trình sau nghiệm thu', T({ x: 1.05, y: 4.0, w: 6.8, h: 0.5, fontSize: 17, bold: true, color: GREEN }));
    s.addText([
      { text: 'Nhân rộng toàn quốc: ', options: { bold: true } },
      { text: 'mọi cơ sở y tế có thanh quyết toán BHXH.\n', options: {} },
      { text: 'Bài toán Tập đoàn: ', options: { bold: true } },
      { text: 'áp mô hình lõi vào nhóm A, nhóm B&C.\n', options: {} },
      { text: 'Chính quyền số: ', options: { bold: true } },
      { text: 'hướng dẫn nhập liệu từng bước bằng giọng nói / highlight vị trí; AI tra cứu văn bản & gợi ý trích yếu cho ban ngành.', options: {} },
    ], T({ x: 1.05, y: 4.55, w: 6.85, h: 2.3, fontSize: 13.5 }));
    s.addImage({ data: await png(robotSVG('wave')), x: 8.7, y: 3.7, w: 3.2, h: 3.2 });
    s.addText('CẢM ƠN BAN TỔ CHỨC!', T({ x: 8.3, y: 6.85, w: 4.3, h: 0.5, fontSize: 16, bold: true, color: RED, align: 'center' }));
    s.addNotes('Kết quả: 90% khối lượng, 105 nghìn đoạn tri thức, 100+ luật, 5 nhóm check chéo. Lộ trình: toàn quốc, bài toán nhóm A/B&C của Tập đoàn, chính quyền số. Cảm ơn BTC.');
  }

  const out = path.join(__dirname, '..', 'Bao-cao-hackathon-Chien-binh-y-te-so.pptx');
  await p.writeFile({ fileName: out });
  console.log('DONE:', out);
})().catch((e) => { console.error(e); process.exit(1); });
