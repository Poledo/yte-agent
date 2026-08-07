import { RobotConfig } from './RobotConfig'
import { VNPT_LOGO_DATA_URI } from './RobotLogo'

/**
 * Markup SVG của robot — vẽ 100% bằng SVG/CSS, KHÔNG dùng ảnh/GIF (task §3, §13).
 *
 * Các bộ phận có id để AnimationController / EmotionEngine điều khiển:
 *  - robot-float : nhóm cả người (nhún thở, bob).
 *  - robot-head  : đầu (nghiêng theo chuột, ngửa đầu).
 *  - robot-eyes-open / -happy / -closed : ba bộ mắt, EmotionEngine bật/tắt.
 *  - robot-pupils : con ngươi (dịch theo chuột).
 *  - robot-mouth  : miệng (đổi thuộc tính d theo cảm xúc).
 *  - robot-arm-l / robot-arm-r : hai tay (vẫy, giơ ngón cái, ôm cằm...).
 *  - robot-antenna-tip : chóp ăng-ten phát sáng.
 *  - robot-cheeks / robot-sweat / robot-zzz : phụ trợ cảm xúc (ẩn mặc định).
 */
const C = RobotConfig.color

export function buildRobotSvg(): string {
    const { width, height } = RobotConfig.size
    return `
<svg class="robot-svg" viewBox="0 0 96 108" width="${width}" height="${height}"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="robotBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.vnptBlueLight}"/>
      <stop offset="0.5" stop-color="${C.vnptBlue}"/>
      <stop offset="1" stop-color="${C.vnptBlueDark}"/>
    </linearGradient>
    <linearGradient id="robotHead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.white}"/>
      <stop offset="1" stop-color="${C.metal}"/>
    </linearGradient>
    <radialGradient id="robotTip" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#BFF3FF"/>
      <stop offset="1" stop-color="${C.vnptBlueLight}"/>
    </radialGradient>
  </defs>

  <!-- Bóng đổ dưới chân -->
  <ellipse id="robot-shadow" cx="48" cy="104" rx="26" ry="4.5" fill="rgba(10,40,70,0.18)"/>

  <g id="robot-float">
    <!-- Chân -->
    <g id="robot-legs">
      <rect x="36" y="92" width="9" height="12" rx="4.5" fill="${C.vnptBlueDark}"/>
      <rect x="51" y="92" width="9" height="12" rx="4.5" fill="${C.vnptBlueDark}"/>
      <ellipse cx="40.5" cy="104" rx="7" ry="3.4" fill="${C.ink}"/>
      <ellipse cx="55.5" cy="104" rx="7" ry="3.4" fill="${C.ink}"/>
    </g>

    <!-- Tay trái (nhìn từ người xem là bên trái) -->
    <g id="robot-arm-l">
      <rect x="17" y="70" width="9" height="24" rx="4.5" fill="url(#robotBody)"/>
      <circle cx="21.5" cy="94" r="5.5" fill="${C.metal}"/>
    </g>
    <!-- Tay phải -->
    <g id="robot-arm-r">
      <rect x="70" y="70" width="9" height="24" rx="4.5" fill="url(#robotBody)"/>
      <circle cx="74.5" cy="94" r="5.5" fill="${C.metal}"/>
      <!-- Ngón cái (ẩn, dùng khi giơ thumbs up) -->
      <rect id="robot-thumb" x="72" y="62" width="5" height="8" rx="2.5" fill="${C.metal}" opacity="0"/>
    </g>

    <!-- Thân + ngực gắn logo VNPT chính thức (ảnh, KHÔNG phải chữ) -->
    <g id="robot-body">
      <rect x="26" y="64" width="44" height="34" rx="15" fill="url(#robotBody)"/>
      <circle cx="48" cy="80" r="12" fill="${C.white}" opacity="0.96"/>
      <image id="robot-chest-logo" href="${VNPT_LOGO_DATA_URI}"
             x="37" y="70" width="22" height="22" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- Đầu -->
    <g id="robot-head">
      <!-- Ăng-ten -->
      <line x1="48" y1="20" x2="48" y2="12" stroke="${C.metalDark}" stroke-width="2.4" stroke-linecap="round"/>
      <circle id="robot-antenna-tip" cx="48" cy="9" r="3.4" fill="url(#robotTip)"/>

      <!-- Vỏ đầu -->
      <rect x="20" y="20" width="56" height="42" rx="16" fill="url(#robotHead)" stroke="${C.metalDark}" stroke-width="1.2"/>
      <!-- Tai -->
      <rect x="16" y="34" width="5" height="14" rx="2.5" fill="${C.metalDark}"/>
      <rect x="75" y="34" width="5" height="14" rx="2.5" fill="${C.metalDark}"/>
      <!-- Màn hình mặt -->
      <rect x="25" y="26" width="46" height="30" rx="12" fill="${C.ink}"/>

      <!-- Má hồng (ẩn mặc định) -->
      <g id="robot-cheeks" opacity="0">
        <ellipse cx="34" cy="48" rx="4" ry="2.4" fill="#FF6B8B"/>
        <ellipse cx="62" cy="48" rx="4" ry="2.4" fill="#FF6B8B"/>
      </g>

      <!-- Mắt: bộ MỞ (mặc định) -->
      <g id="robot-eyes-open">
        <circle cx="40" cy="41" r="6.2" fill="${C.white}"/>
        <circle cx="56" cy="41" r="6.2" fill="${C.white}"/>
        <g id="robot-pupils">
          <circle cx="40" cy="41" r="3.1" fill="${C.vnptBlueDark}"/>
          <circle cx="56" cy="41" r="3.1" fill="${C.vnptBlueDark}"/>
          <circle cx="41.2" cy="39.8" r="1" fill="${C.white}"/>
          <circle cx="57.2" cy="39.8" r="1" fill="${C.white}"/>
        </g>
      </g>
      <!-- Mắt: bộ VUI (cong ^^) -->
      <g id="robot-eyes-happy" opacity="0" fill="none" stroke="${C.vnptBlueLight}" stroke-width="2.6" stroke-linecap="round">
        <path d="M34 43 Q40 36 46 43"/>
        <path d="M50 43 Q56 36 62 43"/>
      </g>
      <!-- Mắt: bộ NHẮM (lim dim/ngủ) -->
      <g id="robot-eyes-closed" opacity="0" stroke="${C.vnptBlueLight}" stroke-width="2.6" stroke-linecap="round">
        <line x1="34" y1="42" x2="46" y2="42"/>
        <line x1="50" y1="42" x2="62" y2="42"/>
      </g>

      <!-- Miệng -->
      <path id="robot-mouth" d="M42 51 Q48 55 54 51" fill="none"
            stroke="${C.vnptBlueLight}" stroke-width="2.4" stroke-linecap="round"/>

      <!-- Giọt mồ hôi (ẩn) -->
      <path id="robot-sweat" opacity="0" d="M66 30 q-3 4 0 6 a3 3 0 0 0 0 -6 z" fill="#7FD3FF"/>
    </g>

    <!-- Zzz khi ngủ (ẩn) -->
    <g id="robot-zzz" opacity="0" fill="${C.vnptBlue}" font-family="Arial" font-weight="800">
      <text x="70" y="24" font-size="8">z</text>
      <text x="76" y="18" font-size="10">z</text>
      <text x="83" y="11" font-size="13">Z</text>
    </g>
  </g>
</svg>`.trim()
}
