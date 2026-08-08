/*
 * Dựng các slide hướng dẫn sử dụng (1920x1080) theo phong cách viết tay/doodle,
 * và xuất kịch bản lời đọc ra narration.json để bước sau tạo giọng đọc + ghép video.
 * Chạy: node render-slides.js  → slides/slide-01.png ... + narration.json
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ---- màu ----
const INK = '2B2B2B', BLUE = '2F6FED', RED = 'E4572E', GREEN = '2E9E5B', YELLOW = 'FFE066', GRAY = '9AA0A6';

// ---- nhúng font viết tay (Comic Sans) để giữ nét đồng bộ với bản PPT ----
function fontFace() {
  try {
    const reg = fs.readFileSync('C:/Windows/Fonts/comic.ttf').toString('base64');
    const bold = fs.readFileSync('C:/Windows/Fonts/comicbd.ttf').toString('base64');
    return `<style>
      @font-face{font-family:'HandW';font-weight:normal;src:url(data:font/ttf;base64,${reg}) format('truetype');}
      @font-face{font-family:'HandW';font-weight:bold;src:url(data:font/ttf;base64,${bold}) format('truetype');}
    </style>`;
  } catch (e) { return ''; }
}
const FF = fontFace();
const FONT = "HandW, 'Comic Sans MS', Comic Neue, cursive";

// ================= doodle helpers (nét run tay) =================
let seed = 11;
function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function jitter(v, amt = 3) { return v + (rnd() - 0.5) * amt; }
function rline(x1, y1, x2, y2, amt = 4) {
  const mx = (x1 + x2) / 2 + (rnd() - 0.5) * amt * 2, my = (y1 + y2) / 2 + (rnd() - 0.5) * amt * 2;
  return `M${jitter(x1, amt)},${jitter(y1, amt)} Q${mx},${my} ${jitter(x2, amt)},${jitter(y2, amt)}`;
}
function rrect(x, y, w, h, amt = 4) {
  return [rline(x, y, x + w, y, amt), rline(x + w, y, x + w, y + h, amt),
    rline(x + w, y + h, x, y + h, amt), rline(x, y + h, x, y, amt)].join(' ');
}
function rellipse(cx, cy, rx, ry, amt = 3) {
  const k = 0.5523, j = () => (rnd() - 0.5) * amt;
  return `M${cx - rx + j()},${cy} C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx + j()},${cy - ry}`
    + ` C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx + j()},${cy}`
    + ` C${cx + rx},${cy + ry * k} ${cx + rx * k},${cy + ry} ${cx + j()},${cy + ry}`
    + ` C${cx - rx * k},${cy + ry} ${cx - rx},${cy + ry * k} ${cx - rx + j()},${cy}`;
}
function arrowHead(x, y, angleDeg, size = 16) {
  const a = (angleDeg * Math.PI) / 180, p = (da) => `${x - size * Math.cos(a + da)},${y - size * Math.sin(a + da)}`;
  return `M${p(0.5)} L${x},${y} L${p(-0.5)}`;
}
function rarrow(x1, y1, x2, y2, bend = 0.15) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const ang = Math.atan2(y2 - my, x2 - mx) * 180 / Math.PI;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2} ` + arrowHead(x2, y2, ang);
}
const S = (d, color = INK, w = 5, fill = 'none') =>
  `<path d="${d}" stroke="#${color}" stroke-width="${w}" fill="${fill === 'none' ? 'none' : '#' + fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
const DT = (x, y, size, text, color = INK, anchor = 'middle', bold = true) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="#${color}" text-anchor="${anchor}" font-weight="${bold ? 'bold' : 'normal'}">${esc(text)}</text>`;
function svg(w, h, inner) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${FF}${inner}</svg>`; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
async function toPng(svgStr, scale = 2) { return sharp(Buffer.from(svgStr), { density: 96 * scale }).png().toBuffer(); }

// robot: wave | read | search | think | point
function robot(mode = 'wave', accent = BLUE) {
  let extra = '';
  const armL = { wave: rline(120, 250, 55, 175, 5), read: rline(120, 250, 85, 300, 5), search: rline(120, 250, 70, 300, 5), think: rline(120, 250, 90, 165, 5), point: rline(120, 250, 70, 285, 5) }[mode];
  const armR = { wave: rline(240, 250, 300, 285, 5), read: rline(240, 250, 275, 300, 5), search: rline(240, 250, 305, 200, 5), think: rline(240, 250, 300, 285, 5), point: rline(240, 250, 320, 195, 5) }[mode];
  if (mode === 'wave') extra = S('M40,150 q-8,-14 4,-22 M28,168 q-12,-10 -2,-24 M52,140 q-2,-12 10,-16', accent, 4);
  if (mode === 'read') extra = S(rrect(120, 290, 120, 80, 3), INK, 4, 'FFF7D6') + S(rline(180, 292, 180, 368, 2), INK, 3)
    + S(rline(132, 310, 172, 310, 2), GRAY, 3) + S(rline(188, 310, 228, 310, 2), GRAY, 3);
  if (mode === 'search') extra = S(rellipse(330, 175, 34, 34), accent, 6) + S(rline(352, 200, 385, 235, 3), accent, 7);
  if (mode === 'think') extra = S(rellipse(300, 90, 10, 8), GRAY, 3) + S(rellipse(325, 65, 14, 11), GRAY, 3) + S(rellipse(360, 35, 20, 15), GRAY, 3);
  if (mode === 'point') extra = S(arrowHead(335, 188, 25, 14), accent, 5);
  return S(rline(180, 60, 180, 30, 2), INK, 4) + S(rellipse(180, 22, 8, 8), accent, 4, accent) +
    S(rrect(110, 60, 140, 100, 4), INK, 5, 'FFFFFF') +
    S(rellipse(150, 105, 11, 13), INK, 4, INK) + S(rellipse(210, 105, 11, 13), INK, 4, INK) +
    S('M150,135 Q180,152 210,135', INK, 4) +
    S(rline(103, 95, 88, 95, 2), INK, 5) + S(rline(257, 95, 272, 95, 2), INK, 5) +
    S(rrect(120, 175, 120, 105, 4), INK, 5, 'FFFFFF') +
    S('M132,225 L152,225 L160,205 L172,245 L182,225 L228,225', accent, 4) +
    S(armL, INK, 5) + S(armR, INK, 5) +
    S(rline(150, 285, 150, 330, 3), INK, 5) + S(rline(210, 285, 210, 330, 3), INK, 5) +
    S(rline(138, 332, 165, 332, 2), INK, 5) + S(rline(198, 332, 225, 332, 2), INK, 5) + extra;
}

// cửa sổ trình duyệt (web admin)
const browserWin = () => svg(420, 320,
  S(rrect(30, 30, 360, 250, 4), INK, 5, 'FFFFFF') + S(rline(30, 78, 390, 78, 3), INK, 4)
  + S(rellipse(52, 54, 8, 8), RED, 3, RED) + S(rellipse(80, 54, 8, 8), YELLOW, 3, YELLOW) + S(rellipse(108, 54, 8, 8), GREEN, 3, GREEN)
  + S(rrect(150, 44, 210, 22, 3), GRAY, 3)
  + S(rrect(48, 96, 90, 165, 3), BLUE, 4, 'EAF1FE') // sidebar
  + S(rline(60, 120, 122, 120, 3), GRAY, 4) + S(rline(60, 150, 122, 150, 3), GRAY, 4) + S(rline(60, 180, 122, 180, 3), GRAY, 4) + S(rline(60, 210, 122, 210, 3), GRAY, 4)
  + S(rline(165, 120, 360, 120, 3), GRAY, 4) + S(rline(165, 155, 340, 155, 3), GRAY, 4) + S(rline(165, 190, 355, 190, 3), GRAY, 4) + S(rline(165, 225, 330, 225, 3), GRAY, 4));

// bong bóng chat + trích dẫn
const chatBubble = () => svg(400, 320,
  S(rrect(40, 40, 250, 120, 5), BLUE, 5, 'EAF1FE') + S('M90,160 l0,40 l40,-40', BLUE, 5, 'EAF1FE')
  + S(rline(65, 78, 260, 78, 3), GRAY, 4) + S(rline(65, 108, 240, 108, 3), GRAY, 4) + S(rline(65, 138, 210, 138, 3), GRAY, 4)
  + S(rrect(110, 190, 250, 110, 5), GREEN, 5, 'FFFFFF') + S('M330,300 l0,36 l-38,-36', GREEN, 5, 'FFFFFF')
  + DT(235, 228, 22, 'Trả lời + trích dẫn', GREEN) + S(rline(135, 250, 340, 250, 3), GRAY, 4) + S(rline(135, 275, 300, 275, 3), GRAY, 4));

// hộp kéo thả file XML
const uploadBox = () => svg(400, 320,
  S('M60,110 L340,110 L340,280 L60,280 Z', INK, 5, 'FFFFFF').replace('path d', 'path stroke-dasharray="12 10" d')
  + S(rarrow(200, 250, 200, 150, 0), BLUE, 7) + S(rline(150, 175, 200, 140, 5), BLUE, 7) + S(rline(250, 175, 200, 140, 5), BLUE, 7)
  + S(rrect(120, 40, 70, 90, 3), GRAY, 4, 'FFFFFF') + S(rrect(150, 55, 70, 90, 3), INK, 4, 'FFFFFF')
  + DT(185, 105, 20, 'XML', RED)
  + DT(200, 308, 22, 'kéo thả file 130', INK));

// form cảnh báo nhập liệu
const formWarn = () => svg(400, 320,
  S(rrect(50, 40, 300, 240, 4), INK, 5, 'FFFFFF')
  + S(rline(75, 85, 200, 85, 4), GRAY, 4) + S(rrect(75, 100, 250, 34, 3), GRAY, 3)
  + S(rline(75, 165, 200, 165, 4), GRAY, 4) + S(rrect(75, 180, 250, 34, 3), RED, 4)
  + S('M300,150 l40,0 l-20,-34 Z', YELLOW, 4, 'FFF3B0') + DT(320, 148, 26, '!', RED)
  + DT(200, 250, 20, 'sai là cảnh báo NGAY', RED));

// đồng hồ hẹn giờ
const clock = () => svg(360, 320,
  S(rellipse(180, 150, 90, 90), INK, 5, 'FFFFFF') + S(rline(180, 150, 180, 90, 3), INK, 6)
  + S(rline(180, 150, 222, 168, 3), INK, 6) + S(rellipse(180, 150, 6, 6), INK, 4, INK)
  + DT(180, 48, 30, '00:00', BLUE) + DT(180, 285, 22, 'tự chạy mỗi đêm', INK));

// danh mục / bảng excel
const catalog = () => svg(400, 320,
  S(rrect(60, 50, 280, 220, 4), INK, 5, 'FFFFFF') + S(rline(60, 100, 340, 100, 3), INK, 4)
  + S(rline(150, 50, 150, 270, 3), GRAY, 3) + S(rline(245, 50, 245, 270, 3), GRAY, 3)
  + S(rline(60, 150, 340, 150, 3), GRAY, 3) + S(rline(60, 200, 340, 200, 3), GRAY, 3)
  + S('M95,168 l14,16 l24,-28', GREEN, 5) + S('M95,218 l14,16 l24,-28', GREEN, 5)
  + DT(200, 300, 22, 'danh mục theo cơ sở', INK));

// đám mây tải xuống (vbpl)
const cloud = () => svg(400, 320,
  S('M120,150 Q100,110 145,100 Q160,60 210,80 Q265,60 275,110 Q320,110 305,155 Z', INK, 5, 'F2F6FF')
  + S(rarrow(210, 150, 210, 250, 0), BLUE, 7) + S(rline(175, 220, 210, 255, 5), BLUE, 7) + S(rline(245, 220, 210, 255, 5), BLUE, 7)
  + DT(210, 300, 22, 'tải từ vbpl.vn', INK));

// khiên bảo mật
const shield = () => svg(360, 320,
  S('M180,40 L275,80 L275,170 Q275,250 180,290 Q85,250 85,170 L85,80 Z', INK, 5, 'FFFFFF')
  + S('M138,165 l28,30 l52,-64', GREEN, 8) + DT(180, 312, 20, 'dữ liệu không rời BV', INK));

const DOODLES = { browserWin, chatBubble, uploadBox, formWarn, clock, catalog, cloud, shield };
function doodleSvg(name) {
  if (name.startsWith('robot:')) { const m = name.split(':')[1]; return svg(400, 400, robot(m)); }
  return DOODLES[name] ? DOODLES[name]() : svg(400, 320, '');
}
function doodleDims(name) {
  if (name.startsWith('robot:')) return [400, 400];
  const m = doodleSvg(name).match(/width="(\d+)" height="(\d+)"/);
  return m ? [+m[1], +m[2]] : [400, 320];
}

// ---- gói chữ theo bề rộng (px) ----
function wrap(text, wPx, fsPx) {
  const chPx = fsPx * 0.55, cpl = Math.max(1, Math.floor((wPx) / chPx)), out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(' '); let line = '';
    for (const w of words) {
      const cand = line ? line + ' ' + w : w;
      if (cand.length > cpl && line) { out.push(line); line = w; } else line = cand;
    }
    out.push(line);
  }
  return out;
}

// ================= mẫu slide =================
const W = 1920, H = 1080, M = 96;
function scribble(x, y, w, color = BLUE) {
  return S(`M${x},${y} Q${x + w * 0.3},${jitter(y - 8, 6)} ${x + w * 0.55},${y - 1} T${x + w},${y - 2}`, color, 7);
}

async function renderSlide(sl, idx) {
  const kind = sl.kind || 'content';
  let inner = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
  inner += S(rrect(20, 20, W - 40, H - 40, 7), 'D8DCE3', 4);
  const composites = [];
  const place = async (name, x, y, boxW, boxH) => {
    const [dw, dh] = doodleDims(name); const s = Math.min(boxW / dw, boxH / dh);
    const tw = Math.round(dw * s), th = Math.round(dh * s);
    const buf = await toPng(doodleSvg(name), 2);
    const resized = await sharp(buf).resize(tw, th, { fit: 'fill' }).png().toBuffer();
    composites.push({ input: resized, left: Math.round(x + (boxW - tw) / 2), top: Math.round(y + (boxH - th) / 2) });
  };

  if (kind === 'cover' || kind === 'section' || kind === 'outro') {
    const accent = sl.accent || BLUE;
    // dải tag nhỏ trên cùng
    if (sl.tag) inner += `<text x="${M}" y="150" font-family="${FONT}" font-size="34" fill="#${GRAY}" font-weight="bold">${esc(sl.tag)}</text>`;
    const titleLines = wrap(sl.title, 1180, 92);
    let ty = kind === 'section' ? 470 : 360;
    // highlight sau tiêu đề dòng đầu
    inner += `<rect x="${M - 6}" y="${ty - 78}" width="${Math.min(titleLines[0].length * 46 + 40, 1180)}" height="96" rx="18" fill="#${YELLOW}" opacity="0.55" transform="rotate(-0.6 ${M} ${ty})"/>`;
    for (const ln of titleLines) { inner += `<text x="${M}" y="${ty}" font-family="${FONT}" font-size="92" fill="#${INK}" font-weight="bold">${esc(ln)}</text>`; ty += 118; }
    inner += scribble(M, ty - 40, Math.min(titleLines[titleLines.length - 1].length * 44 + 30, 1150), accent);
    if (sl.subtitle) { let sy = ty + 30; for (const ln of wrap(sl.subtitle, 1150, 44)) { inner += `<text x="${M}" y="${sy}" font-family="${FONT}" font-size="44" fill="#${INK}">${esc(ln)}</text>`; sy += 62; } }
    const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${FF}${inner}</svg>`;
    let canvas = sharp(Buffer.from(base));
    await place(sl.doodle || 'robot:wave', 1230, 300, 560, 560);
    const out = await canvas.composite(composites).png().toBuffer();
    fs.writeFileSync(path.join(SLIDES_DIR, `slide-${String(idx).padStart(2, '0')}.png`), out);
    return;
  }

  // ----- slide nội dung: badge số + tiêu đề, doodle trái, gạch đầu dòng phải -----
  const accent = sl.accent || BLUE;
  let titleX = M;
  if (sl.n) {
    inner += S(rellipse(M + 46, 120, 46, 46), accent, 6, 'FFFFFF') +
      `<text x="${M + 46}" y="138" font-family="${FONT}" font-size="52" fill="#${accent}" text-anchor="middle" font-weight="bold">${esc(sl.n)}</text>`;
    titleX = M + 120;
  }
  const tline = wrap(sl.title, W - titleX - M, 58)[0];
  inner += `<text x="${titleX}" y="138" font-family="${FONT}" font-size="58" fill="#${INK}" font-weight="bold">${esc(tline)}</text>`;
  inner += scribble(titleX, 168, Math.min(tline.length * 29 + 20, W - titleX - M), accent);

  // gạch đầu dòng
  const bx = 780, bw = W - bx - M; let by = 320;
  for (const b of sl.bullets) {
    const isHead = typeof b === 'object';
    const txt = isHead ? b.t : b;
    const col = isHead ? (b.c || accent) : INK;
    const fs2 = isHead ? 42 : 38;
    // dấu đầu dòng: check tay
    inner += S(`M${bx - 46},${by - 12} l14,16 l24,-30`, GREEN, 6);
    const lines = wrap(txt, bw, fs2);
    for (let i = 0; i < lines.length; i++) {
      inner += `<text x="${bx}" y="${by}" font-family="${FONT}" font-size="${fs2}" fill="#${col}" font-weight="${isHead ? 'bold' : 'normal'}">${esc(lines[i])}</text>`;
      by += fs2 * 1.28;
    }
    by += 26;
  }
  // chân trang
  inner += `<text x="${M}" y="${H - 54}" font-family="${FONT}" font-size="28" fill="#${GRAY}">Chiến binh Y tế số — Hướng dẫn sử dụng</text>`;
  if (sl.foot) inner += `<text x="${W - M}" y="${H - 54}" font-family="${FONT}" font-size="28" fill="#${accent}" text-anchor="end" font-weight="bold">${esc(sl.foot)}</text>`;

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${FF}${inner}</svg>`;
  let canvas = sharp(Buffer.from(base));
  await place(sl.doodle, 130, 300, 600, 560);
  const out = await canvas.composite(composites).png().toBuffer();
  fs.writeFileSync(path.join(SLIDES_DIR, `slide-${String(idx).padStart(2, '0')}.png`), out);
}

// ================= NỘI DUNG + KỊCH BẢN LỜI ĐỌC =================
const SLIDES = require('./slides.js');

const SLIDES_DIR = path.join(__dirname, 'slides');
(async () => {
  if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR);
  const narration = [];
  for (let i = 0; i < SLIDES.length; i++) {
    await renderSlide(SLIDES[i], i + 1);
    narration.push({ n: i + 1, file: `slide-${String(i + 1).padStart(2, '0')}.png`, text: SLIDES[i].narration });
    process.stdout.write(`slide ${i + 1}/${SLIDES.length}\r`);
  }
  fs.writeFileSync(path.join(__dirname, 'narration.json'), JSON.stringify(narration, null, 2));
  console.log(`\nĐã dựng ${SLIDES.length} slide → ${SLIDES_DIR}\nnarration.json đã ghi.`);
})().catch((e) => { console.error(e); process.exit(1); });
