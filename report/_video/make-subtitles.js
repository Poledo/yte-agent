/*
 * Tạo phụ đề .srt khớp với video: sinh phụ đề từng slide bằng edge-tts (mốc thời gian theo giọng đọc thật),
 * rồi dời mốc theo đúng vị trí slide trong video (dựa trên độ dài audio ĐÃ ghi trong thư mục audio/).
 * Yêu cầu: đã chạy render-slides.js + make-video.js trước (có narration.json + audio/voice-NN.mp3).
 * Chạy: node make-subtitles.js
 * Kết quả: ../Video-huong-dan-Chien-binh-y-te-so.srt
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const FFPROBE = 'D:/Thi/ffmpeg-8.1.1-essentials_build/bin/ffprobe.exe';
const VOICE = 'vi-VN-HoaiMyNeural';
const RATE = '-8%';
// phải TRÙNG với make-video.js
const PAD_END = 0.9;
const PAD_START = 0.35;
const OUT = path.join(DIR, '..', 'Video-huong-dan-Chien-binh-y-te-so.srt');

const SUB_DIR = path.join(DIR, 'subs');
if (!fs.existsSync(SUB_DIR)) fs.mkdirSync(SUB_DIR);

const narration = JSON.parse(fs.readFileSync(path.join(DIR, 'narration.json'), 'utf8'));

function ffprobeDur(file) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim();
  return parseFloat(out);
}
const toMs = (ts) => { const m = ts.match(/(\d+):(\d+):(\d+),(\d+)/); return ((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])) * 1000 + (+m[4]); };
const fmt = (ms) => {
  ms = Math.max(0, Math.round(ms));
  const h = Math.floor(ms / 3600000); ms -= h * 3600000;
  const m = Math.floor(ms / 60000); ms -= m * 60000;
  const s = Math.floor(ms / 1000); ms -= s * 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
};
function parseSrt(txt) {
  const cues = [];
  for (const block of txt.replace(/\r/g, '').trim().split(/\n\n+/)) {
    const lines = block.split('\n');
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const [a, b] = timeLine.split('-->').map((x) => x.trim());
    const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n').trim();
    if (text) cues.push({ start: toMs(a), end: toMs(b), text });
  }
  return cues;
}

(async () => {
  const all = [];
  let offset = 0; // mốc bắt đầu slide hiện tại trong video (ms)
  for (const s of narration) {
    const pad = String(s.n).padStart(2, '0');
    const mp3 = path.join(DIR, 'audio', `voice-${pad}.mp3`);
    const srt = path.join(SUB_DIR, `sub-${pad}.srt`);

    console.log(`[${s.n}/${narration.length}] tạo phụ đề...`);
    execFileSync('python', ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`,
      '--text', s.text, '--write-media', path.join(SUB_DIR, `_tmp-${pad}.mp3`), '--write-subtitles', srt],
      { stdio: 'ignore' });

    const voiceDur = ffprobeDur(mp3);           // độ dài THẬT đã dùng trong video
    const total = PAD_START + voiceDur + PAD_END;
    const shift = offset + PAD_START * 1000;     // tiếng trong video trễ PAD_START so với đầu slide

    for (const c of parseSrt(fs.readFileSync(srt, 'utf8'))) {
      const start = shift + c.start;
      let end = shift + c.end;
      const segEnd = offset + total * 1000;      // không cho phụ đề tràn sang slide sau
      if (end > segEnd - 50) end = segEnd - 50;
      all.push({ start, end, text: c.text });
    }
    offset += total * 1000;
  }

  // dọn mp3 tạm
  for (const f of fs.readdirSync(SUB_DIR)) if (f.startsWith('_tmp-')) fs.unlinkSync(path.join(SUB_DIR, f));

  // ghi SRT tổng
  let out = '';
  all.forEach((c, i) => { out += `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n\n`; });
  fs.writeFileSync(OUT, out, 'utf8');
  console.log(`\nDONE: ${OUT}\n${all.length} dòng phụ đề.`);
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
