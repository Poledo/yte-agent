/*
 * ================================================================
 *  PPT  ->  VIDEO (.mp4) + PHỤ ĐỀ (.srt)   — KHÔNG cần giọng đọc
 * ================================================================
 *
 * Cách dùng nhanh:
 *   node ppt2video.js "duong-dan\bai.pptx"
 *
 * Tool sẽ:
 *   1) Đọc ghi chú (Notes) của từng slide trong file PPT -> làm PHỤ ĐỀ.
 *      (slide nào không có ghi chú thì lấy chữ trên slide.)
 *   2) Lấy ẢNH từng slide:
 *        - Ưu tiên thư mục ảnh bạn chỉ định:  --images "duong-dan\thu-muc-anh"
 *        - Nếu không, tự tìm thư mục ảnh nằm cạnh file PPT.
 *        - Nếu máy có LibreOffice, tự render file PPT ra ảnh.
 *        - Nếu không có gì: hiện hướng dẫn xuất ảnh PNG từ PowerPoint rồi dừng.
 *   3) Ghép ảnh thành video, mỗi slide hiện đủ lâu để đọc hết phụ đề.
 *   4) Xuất  <tên>.mp4  và  <tên>.srt  nằm cạnh file PPT.
 *
 * Tuỳ chọn:
 *   --images "thu-muc"   thư mục chứa ảnh slide (Slide1.PNG, Slide2.PNG, ...)
 *   --sec 6              ép MỖI slide đúng 6 giây (mặc định: tự tính theo độ dài chữ)
 *   --out  "ten.mp4"     đổi tên/đường dẫn file video ra
 *
 * Cần có: Node + gói 'sharp' (đã có ở report\_ppt\node_modules — chạy kèm NODE_PATH),
 *         Python + gói python-pptx, và ffmpeg.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------- tìm ffmpeg / ffprobe ----------
function findBin(name, envKey) {
  if (process.env[envKey] && fs.existsSync(process.env[envKey])) return process.env[envKey];
  const guess = `D:/Thi/ffmpeg-8.1.1-essentials_build/bin/${name}.exe`;
  if (fs.existsSync(guess)) return guess;
  return name; // dựa vào PATH
}
const FFMPEG = findBin('ffmpeg', 'FFMPEG');
const FFPROBE = findBin('ffprobe', 'FFPROBE');
const PYTHON = process.env.PYTHON || 'python';

// ---------- đọc tham số dòng lệnh ----------
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--images') a.images = argv[++i];
    else if (t === '--sec') a.sec = parseFloat(argv[++i]);
    else if (t === '--out') a.out = argv[++i];
    else a._.push(t);
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const PPTX = args._[0];
if (!PPTX || !fs.existsSync(PPTX)) {
  console.error('Thiếu file PPT.\nDùng:  node ppt2video.js "duong-dan\\bai.pptx"  [--images "thu-muc-anh"] [--sec 6]');
  process.exit(1);
}
const BASE = PPTX.replace(/\.pptx?$/i, '');
const OUT_MP4 = args.out || (BASE + '.mp4');
const OUT_SRT = OUT_MP4.replace(/\.mp4$/i, '.srt');

// ---------- các thông số dễ chỉnh ----------
const READ_CPS = 13;     // số ký tự đọc/giây (nhỏ hơn = slide hiện lâu hơn)
const MIN_SEC = 3.5;     // mỗi slide tối thiểu (giây)
const MAX_SEC = 14;      // mỗi slide tối đa (giây)
const LEAD = 0.2;        // phụ đề hiện sau khi vào slide (giây)
const W = 1920, H = 1080, FPS = 30;

// ================= 1) đọc nội dung PPT =================
console.log('Đọc nội dung file PPT...');
let slides;
try {
  const raw = execFileSync(PYTHON, [path.join(__dirname, 'extract_pptx.py'), PPTX],
    { env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  slides = JSON.parse(raw);
} catch (e) {
  console.error('Không đọc được file PPT bằng python-pptx. Kiểm tra đã cài: pip install python-pptx');
  console.error(e.message);
  process.exit(1);
}
console.log(`  -> ${slides.length} slide.`);

// phụ đề mỗi slide = ghi chú, thiếu thì lấy chữ trên slide (bỏ dòng tiêu đề trùng lặp)
function subtitleOf(s) {
  const notes = (s.notes || '').trim();
  if (notes) return notes;
  // lấy chữ trên slide, gộp dòng ngắn
  return (s.text || '').split('\n').map((x) => x.trim()).filter(Boolean).join(' ').trim();
}

// ================= 2) lấy ảnh slide =================
const IMG_EXT = /\.(png|jpg|jpeg)$/i;
function naturalSort(a, b) {
  return a.replace(/\d+/g, (m) => m.padStart(8, '0'))
    .localeCompare(b.replace(/\d+/g, (m) => m.padStart(8, '0')));
}
function imagesIn(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => IMG_EXT.test(f)).sort(naturalSort).map((f) => path.join(dir, f));
}

function findImages() {
  // a) người dùng chỉ định
  if (args.images) {
    const imgs = imagesIn(args.images);
    if (imgs.length) return imgs;
    console.error(`Thư mục ảnh "${args.images}" không có ảnh PNG/JPG.`);
    process.exit(1);
  }
  // b) tự tìm thư mục ảnh cạnh file PPT
  const dir = path.dirname(PPTX);
  const name = path.basename(BASE);
  const candidates = [BASE, BASE + '_images', BASE + '-images', path.join(dir, name), path.join(dir, 'images')];
  for (const c of candidates) { const imgs = imagesIn(c); if (imgs.length) { console.log(`  -> dùng ảnh trong: ${c}`); return imgs; } }
  // c) thử LibreOffice tự render
  const soffice = trySoffice();
  if (soffice) return soffice;
  // d) chịu — hướng dẫn
  console.error(`
KHÔNG tìm thấy ảnh slide và máy không có LibreOffice để tự render.

Cách lấy ảnh (làm 1 lần, rất nhanh) — ngay trong PowerPoint:
  1. Mở file PPT.
  2. File -> Export (Xuất) -> Change File Type -> PNG.
  3. Bấm "Save As", chọn PNG, khi hỏi thì chọn "All Slides" (Tất cả slide).
  4. PowerPoint tạo một THƯ MỤC chứa Slide1.PNG, Slide2.PNG, ...
Rồi chạy lại kèm đường dẫn thư mục đó:
  node ppt2video.js "${PPTX}" --images "duong-dan\\thu-muc-anh"
`);
  process.exit(1);
}

function trySoffice() {
  let bin = null;
  for (const cand of ['soffice', 'C:/Program Files/LibreOffice/program/soffice.exe']) {
    try { execFileSync(cand, ['--version'], { stdio: 'ignore' }); bin = cand; break; } catch (e) {}
  }
  if (!bin) return null;
  console.log('  -> tìm thấy LibreOffice, tự render PPT ra ảnh...');
  const tmp = path.join(path.dirname(PPTX), '_ppt2video_render');
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  execFileSync(bin, ['--headless', '--convert-to', 'pdf', '--outdir', tmp, PPTX], { stdio: 'ignore' });
  const pdf = path.join(tmp, path.basename(BASE) + '.pdf');
  // cần pdftoppm
  try {
    execFileSync('pdftoppm', ['-png', '-r', '150', pdf, path.join(tmp, 'slide')], { stdio: 'ignore' });
  } catch (e) { console.error('Có LibreOffice nhưng thiếu pdftoppm (poppler). Hãy dùng cách xuất PNG từ PowerPoint.'); process.exit(1); }
  return imagesIn(tmp);
}

const images = findImages();
console.log(`  -> ${images.length} ảnh.`);

const N = Math.min(images.length, slides.length);
if (images.length !== slides.length)
  console.log(`  ! Lưu ý: ${slides.length} slide nhưng ${images.length} ảnh — dùng ${N} slide đầu.`);

// ================= 3) tính thời lượng + cắt câu phụ đề =================
function splitSentences(text) {
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/);
  // gộp câu ngắn để mỗi dòng ~ 40-95 ký tự
  const cues = []; let cur = '';
  for (const p of parts) {
    if (!cur) cur = p;
    else if ((cur + ' ' + p).length <= 95) cur += ' ' + p;
    else { cues.push(cur); cur = p; }
  }
  if (cur) cues.push(cur);
  return cues;
}

const plan = [];
for (let i = 0; i < N; i++) {
  const sub = subtitleOf(slides[i]);
  const cues = splitSentences(sub);
  const chars = sub.length;
  const dur = args.sec ? args.sec : Math.min(MAX_SEC, Math.max(MIN_SEC, chars / READ_CPS + 1.2));
  plan.push({ img: images[i], sub, cues, dur });
}
const totalSec = plan.reduce((a, p) => a + p.dur, 0);
console.log(`Tổng thời lượng dự kiến: ${Math.floor(totalSec / 60)}:${String(Math.round(totalSec % 60)).padStart(2, '0')}`);

// ================= 4) dựng phụ đề .srt =================
const fmt = (ms) => {
  ms = Math.max(0, Math.round(ms));
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const s = Math.floor(ms / 1000); ms -= s * 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
};
let srt = '', idx = 0, tCursor = 0;
for (const p of plan) {
  const winStart = tCursor + LEAD;
  const winEnd = tCursor + p.dur - 0.1;
  const totalCueChars = p.cues.reduce((a, c) => a + c.length, 0) || 1;
  let cStart = winStart;
  p.cues.forEach((c, k) => {
    const share = (winEnd - winStart) * (c.length / totalCueChars);
    let cEnd = (k === p.cues.length - 1) ? winEnd : cStart + share;
    if (cEnd - cStart < 0.8) cEnd = Math.min(winEnd, cStart + 0.8);
    idx++;
    srt += `${idx}\n${fmt(cStart * 1000)} --> ${fmt(cEnd * 1000)}\n${c}\n\n`;
    cStart = cEnd;
  });
  tCursor += p.dur;
}
fs.writeFileSync(OUT_SRT, srt, 'utf8');
console.log(`Phụ đề: ${OUT_SRT} (${idx} dòng)`);

// ================= 5) ghép video =================
const SEG_DIR = path.join(__dirname, '_segments');
if (!fs.existsSync(SEG_DIR)) fs.mkdirSync(SEG_DIR);
for (const f of fs.readdirSync(SEG_DIR)) fs.unlinkSync(path.join(SEG_DIR, f));

const segFiles = [];
plan.forEach((p, i) => {
  const seg = path.join(SEG_DIR, `seg-${String(i + 1).padStart(3, '0')}.mp4`);
  process.stdout.write(`Ghép slide ${i + 1}/${N}...\r`);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error',
    '-loop', '1', '-t', p.dur.toFixed(2), '-i', p.img,
    '-r', String(FPS),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:white`,
    seg]);
  segFiles.push(seg);
});
console.log('\nNối các đoạn...');
const listFile = path.join(SEG_DIR, 'concat.txt');
fs.writeFileSync(listFile, segFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', OUT_MP4]);

// dọn tạm
for (const f of fs.readdirSync(SEG_DIR)) fs.unlinkSync(path.join(SEG_DIR, f));
fs.rmdirSync(SEG_DIR);

const mb = (fs.statSync(OUT_MP4).size / 1048576).toFixed(1);
console.log(`\nXONG!\n  Video : ${OUT_MP4}  (${mb} MB, ${Math.floor(totalSec / 60)}:${String(Math.round(totalSec % 60)).padStart(2, '0')})\n  Phụ đề: ${OUT_SRT}\n(Để cùng thư mục, cùng tên — trình phát sẽ tự bật phụ đề.)`);
