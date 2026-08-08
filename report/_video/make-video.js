/*
 * Tạo giọng đọc tiếng Việt cho từng slide (edge-tts) rồi ghép slide + tiếng thành MP4 (ffmpeg).
 * Yêu cầu: đã chạy render-slides.js trước (có slides/ + narration.json).
 * Chạy: node make-video.js
 * Kết quả: ../Video-huong-dan-Chien-binh-y-te-so.mp4
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const FFMPEG = 'D:/Thi/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe';
const FFPROBE = 'D:/Thi/ffmpeg-8.1.1-essentials_build/bin/ffprobe.exe';
const VOICE = 'vi-VN-HoaiMyNeural';  // giọng nữ miền Bắc, tự nhiên. Đổi 'vi-VN-NamMinhNeural' cho giọng nam.
const RATE = '-8%';                   // đọc chậm lại một chút cho dễ nghe
const OUT = path.join(DIR, '..', 'Video-huong-dan-Chien-binh-y-te-so.mp4');
const PAD_END = 0.9;                  // giây "thở" cuối mỗi slide
const PAD_START = 0.35;               // giây lặng đầu mỗi slide

const AUDIO_DIR = path.join(DIR, 'audio');
const SEG_DIR = path.join(DIR, 'segments');
for (const d of [AUDIO_DIR, SEG_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d);

const narration = JSON.parse(fs.readFileSync(path.join(DIR, 'narration.json'), 'utf8'));

function ffprobeDur(file) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim();
  return parseFloat(out);
}

(async () => {
  const segFiles = [];
  for (const s of narration) {
    const pad = String(s.n).padStart(2, '0');
    const mp3 = path.join(AUDIO_DIR, `voice-${pad}.mp3`);
    const png = path.join(DIR, 'slides', s.file);
    const seg = path.join(SEG_DIR, `seg-${pad}.mp4`);

    // 1) tạo giọng đọc
    console.log(`[${s.n}/${narration.length}] tạo giọng đọc...`);
    execFileSync('python', ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`, '--text', s.text, '--write-media', mp3],
      { stdio: 'ignore' });
    const voiceDur = ffprobeDur(mp3);
    const total = (PAD_START + voiceDur + PAD_END).toFixed(2);

    // 2) ghép ảnh tĩnh + tiếng thành 1 đoạn video (có đệm lặng đầu/cuối)
    // adelay đẩy tiếng trễ PAD_START; apad kéo dài audio tới hết total để ffmpeg không cắt sớm.
    console.log(`   ghép đoạn ${total}s (tiếng ${voiceDur.toFixed(1)}s)...`);
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error',
      '-loop', '1', '-i', png,
      '-i', mp3,
      '-filter_complex',
        `[1:a]adelay=${Math.round(PAD_START * 1000)}|${Math.round(PAD_START * 1000)},apad[a]`,
      '-map', '0:v', '-map', '[a]',
      '-t', total,
      '-r', '30',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:white',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
      '-shortest', seg]);
    segFiles.push(seg);
  }

  // 3) nối tất cả đoạn lại
  console.log('nối các đoạn thành video hoàn chỉnh...');
  const listFile = path.join(SEG_DIR, 'concat.txt');
  fs.writeFileSync(listFile, segFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', OUT]);

  const dur = ffprobeDur(OUT);
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`\nDONE: ${OUT}\nThời lượng: ${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')} — ${mb} MB`);
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
