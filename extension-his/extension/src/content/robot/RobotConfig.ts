/**
 * Hằng số dùng chung cho robot mascot.
 * Gom về một chỗ để không hardcode rải rác (theo Coding Rules của dự án).
 */
export const RobotConfig = {
    /** Màu thương hiệu VNPT. */
    color: {
        vnptBlue: '#0068B3',
        vnptBlueDark: '#004E86',
        vnptBlueLight: '#3E9BE0',
        metal: '#DCE7F2',
        metalDark: '#B9CBDE',
        ink: '#173049',
        white: '#FFFFFF',
        happy: '#28C76F',
        sad: '#EA5455',
        think: '#FF9F43',
    },

    /** Kích thước khung robot (px) — bằng vùng chứa SVG. */
    size: {
        width: 96,
        height: 108,
    },

    /** Vị trí đậu mặc định: góc phải dưới, cách mép (px). */
    home: {
        right: 24,
        bottom: 20,
    },

    /**
     * Né vật cản: một số màn hình HIS có nút cố định ở đáy trang (vd nút "Ký số" ở
     * màn hình Kiểm tra bảng kê) đúng chỗ robot đậu. Robot phải tự nhận ra và tránh:
     * nhảy lên đứng trên nút, hoặc nép sang bên, thay vì che mất nút của người dùng.
     */
    obstacle: {
        /** Chỉ xét nút nằm trong dải này tính từ đáy khung nhìn (px). */
        bandHeight: 240,
        /** Bộ chọn CSS nhận diện "nút bấm" của trang (kể cả nút của các bộ UI hay gặp trong HIS). */
        selector: 'button, [role="button"], input[type="submit"], input[type="button"], .btn, .ui-button, .k-button, a.btn',
        /** Bỏ qua phần tử nhỏ hơn mức này (px) — chấm, đường kẻ... không phải nút. */
        minSize: 16,
        /** Nút mỏng hơn mức này thì không đứng lên được (px). */
        minStandThickness: 20,
        /** Bàn chân robot phải tì được ít nhất chừng này phần bề ngang lên nút mới đứng. */
        minFootShare: 0.45,
        /** Trúng thanh công cụ thì xét tối đa bấy nhiêu nút bên trong (chặn thanh quá nhiều nút). */
        maxCandidates: 40,
        /** Tên lớp/id có mấy chữ này thì coi như nút, dù không phải thẻ `<button>` (nút nổi Smart CA...). */
        clickableName: /\b(btn|button|fab)\b/i,
        /** Leo tối đa bấy nhiêu cấp cha để tìm khối bấm được ngoài cùng. */
        maxClimb: 6,
        /** Mặt nút phải cao hơn chỗ đậu ít nhất chừng này mới đáng trèo lên (px). */
        minStandRise: 6,
        /** Nhảy lên đứng được nếu mặt nút không cao hơn chỗ đậu quá mức này (px). */
        maxStandRise: 220,
        /** Khoảng hở khi nép sang trái nút (px). */
        dodgeGap: 12,
        /** Chừa mép khung nhìn (px) — không để robot lọt ra ngoài màn hình. */
        edgeGap: 8,
        /** Xê dịch nhỏ hơn mức này thì chuyển chỗ lặng lẽ, không diễn hoạt (px). */
        smallStep: 20,
        /** Chờ trang lặng bấy nhiêu mới quét lại (ms) — gộp nhiều thay đổi DOM làm một. */
        settleMs: 220,
    },

    /** Ngưỡng thời gian (ms) cho các hành vi tự động. */
    timing: {
        /** Không tương tác quá lâu → ngồi/nằm. */
        idleToLongIdle: 12_000,
        /** Long idle tiếp tục → ngủ. */
        longIdleToSleep: 22_000,
        /** Khoảng giữa hai vi-hành-vi idle (chớp mắt, ngáp...). */
        idleGestureMin: 2_600,
        idleGestureMax: 6_200,
    },

    /** Theo dõi chuột. */
    mouse: {
        /** Bán kính (px) quanh robot coi là "hover". */
        hoverRadius: 130,
        /** Góc xoay đầu tối đa theo chuột (độ). */
        headMaxDeg: 18,
        /** Dịch con ngươi tối đa (px). */
        pupilMaxShift: 3.4,
        /** Chuột cao hơn robot bao nhiêu (px) thì bắt đầu "ngửa đầu". */
        lookUpThreshold: 220,
        /** Ngửa đầu quá lâu liên tục (ms) → mất thăng bằng, té. */
        offBalanceMs: 1500,
    },

    /** Khóa cấu hình trong chrome.storage.local. */
    storageKey: {
        /** Bật/tắt robot (công tắc Enable/Disable ở popup). */
        enabled: 'robotEnabled',
        /** Tôn trọng prefers-reduced-motion / tắt chuyển động. */
        reduceMotion: 'robotReduceMotion',
    },
} as const
