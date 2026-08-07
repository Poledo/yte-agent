/**
 * Màu chủ đạo của extension = NGUYÊN màu robot cấu hình trên web admin (1 màu
 * phẳng, không gradient, không pha phấn). Đặt các biến CSS --zc-* lên một phần
 * tử gốc (documentElement) để thấm vào mọi shadow root; style bên trong dùng
 * var(--zc-*, <mặc định>) nên thiếu cấu hình vẫn giữ nguyên màu cũ.
 *
 * Ba biến cùng trỏ về MỘT màu setting (các chỗ khai gradient hai đầu cùng màu
 * sẽ hiển thị thành màu phẳng — không phải sửa lại từng style):
 * - --zc-accent / --zc-accent-2 : nền nhấn (header, nút chính, nút gạt bật)
 * - --zc-accent-deep            : chữ/viền nhấn trên nền sáng
 * (--zc-pastel không đặt — nền nhạt giữ mặc định của từng component)
 */

const HEX = /^#?([0-9a-fA-F]{6})$/

/** Chuẩn hóa "#RRGGBB"; không hợp lệ → null. */
function normalizeHex(color: string): string | null {
    const m = HEX.exec(color.trim())
    return m ? `#${m[1].toLowerCase()}` : null
}

/**
 * Áp màu chủ đạo lên phần tử gốc. color null/không hợp lệ → xóa biến
 * (style rơi về màu mặc định trong var(..., fallback)).
 */
export function applyPastelTheme(root: HTMLElement, color: string | null): void {
    const hex = color ? normalizeHex(color) : null
    const vars = ['--zc-accent', '--zc-accent-2', '--zc-accent-deep']
    for (const name of vars) {
        if (hex) root.style.setProperty(name, hex)
        else root.style.removeProperty(name)
    }
    root.style.removeProperty('--zc-pastel')
}
