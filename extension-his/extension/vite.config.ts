import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

/**
 * Đang chạy chế độ theo dõi (npm run watch / vite build --watch)?
 *
 * Ở chế độ này KHÔNG được xóa sạch dist mỗi lần rebuild: mỗi lần xóa tạo ra một
 * khoảng ~50ms không có file nào trong dist. Bấm Reload trên chrome://extensions
 * đúng lúc đó thì Chrome đọc phải thư mục dở dang và báo
 * "Không thể tải javascript ... / Không thể tải tệp kê khai" — dù code hoàn toàn đúng.
 * Vite ghi đè file theo tên cố định nên không xóa cũng không sót file cũ.
 */
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w')

/**
 * Chép public/ → dist/ nhưng CHỊU ĐƯỢC file đang bị khóa.
 * Khi Chrome đã nạp extension từ dist, nó giữ khóa các file icon; watch build chép
 * đè lên → copyfile UNKNOWN (Windows) làm hỏng cả build dù code đúng. Nếu file đích
 * đã tồn tại (bản cũ y hệt) thì bỏ qua lỗi khóa thay vì để build chết.
 */
function copyPublicResilient(srcDir: string, destDir: string): void {
    if (!fs.existsSync(srcDir)) return
    fs.mkdirSync(destDir, { recursive: true })
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const s = path.join(srcDir, entry.name)
        const d = path.join(destDir, entry.name)
        if (entry.isDirectory()) {
            copyPublicResilient(s, d)
        } else {
            try {
                fs.copyFileSync(s, d)
            } catch (err) {
                if (fs.existsSync(d)) {
                    console.warn(`⚠ Bỏ qua copy (file đang bị khóa, đã có sẵn trong dist): ${entry.name}`)
                } else {
                    throw err
                }
            }
        }
    }
}

/** Chép public/ (manifest, icon, asset...) vào dist, chịu được file đang bị khóa. */
const copyPublicPlugin = {
    name: 'copy-public-resilient',
    closeBundle() {
        copyPublicResilient(path.join(__dirname, 'public'), path.join(__dirname, 'dist'))
    },
}

/** Dời popup HTML về đúng dist/popup/index.html và dọn thư mục dist/src thừa. */
const movePopupPlugin = {
    name: 'move-popup-html',
    closeBundle() {
        const srcPath = path.join(__dirname, 'dist/src/popup/index.html')
        const destPath = path.join(__dirname, 'dist/popup/index.html')
        const srcDir = path.join(__dirname, 'dist/src')
        try {
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath)
                console.log('✓ Popup HTML moved to dist/popup/index.html')
            }
            if (fs.existsSync(srcDir)) {
                fs.rmSync(srcDir, { recursive: true, force: true })
                console.log('✓ Cleaned dist/src')
            }
        } catch (err) {
            console.error('Error in popup build:', (err as Error).message)
        }
    },
}

/**
 * Kiểm tra dist có đủ mọi file mà manifest tham chiếu.
 * Thiếu một file thôi là Chrome từ chối nạp cả extension ("Không thể tải tệp kê khai")
 * — lỗi này chỉ lộ ra lúc Load unpacked, bắt ngay tại build sẽ tiết kiệm thời gian dò.
 * Chạy ở LẦN BUILD CUỐI (content) khi mọi file đã có mặt trong dist.
 */
const verifyManifestPlugin = {
    name: 'verify-manifest-assets',
    closeBundle() {
        const distDir = path.join(__dirname, 'dist')
        const manifestPath = path.join(distDir, 'manifest.json')
        if (!fs.existsSync(manifestPath)) {
            console.error('✗ Thiếu dist/manifest.json')
            process.exitCode = 1
            return
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        const referenced = [
            ...(manifest.content_scripts ?? []).flatMap((cs: { js?: string[] }) => cs.js ?? []),
            ...(manifest.background?.service_worker ? [manifest.background.service_worker] : []),
            ...(manifest.action?.default_popup ? [manifest.action.default_popup] : []),
            ...(manifest.web_accessible_resources ?? []).flatMap((w: { resources?: string[] }) => w.resources ?? []),
            ...Object.values(manifest.icons ?? {}),
        ] as string[]
        const missing = referenced.filter((file) => !fs.existsSync(path.join(distDir, file)))
        if (missing.length > 0) {
            console.error(`✗ manifest tham chiếu file không có trong dist: ${missing.join(', ')}`)
            console.error('  → Chrome sẽ báo "Không thể tải tệp kê khai". Chạy lại: npm run build')
            process.exitCode = 1
            return
        }
        console.log(`✓ Đủ ${referenced.length} file manifest tham chiếu`)
    },
}

/**
 * Hai lượt build (một lệnh `npm run build` chạy tuần tự cả hai):
 *
 *  1) MẶC ĐỊNH — background + fieldSyncBridge + popup (ESM). Popup là trang riêng nên
 *     được phép là module + tách chunk; popup dùng chung mã robot/life với content.
 *  2) `--mode content` — CHỈ content, đóng gói IIFE TỰ-CHỨA.
 *
 * Vì sao tách? Content script MV3 là "classic script" — KHÔNG được chứa câu lệnh
 * `import`. Nếu build chung một đồ thị, Rollup thấy popup và content cùng import cây
 * `robot/`+`life/` nên tách thành chunk chia sẻ và chèn `import "../chunks/..."` vào
 * content/index.js → Chrome nạp content script sẽ lỗi "Cannot use import statement".
 * Build content riêng ở dạng IIFE bảo đảm content/index.js luôn tự-chứa, KHÔNG import,
 * mà mã nguồn vẫn dùng chung (DRY) với popup — chỉ tách ở khâu đóng gói.
 */
export default defineConfig(({ mode, command }) => {
    if (mode === 'robot3d') {
        // Robot 3D "Bi 3D": đóng gói ThreeJS thành MỘT file ESM tự-chứa, chạy ở page world
        // (web_accessible_resource). Tách riêng để KHÔNG làm nặng content script — chỉ tải
        // khi web-admin chọn "Bi 3D". emptyOutDir:false để giữ output của các lượt trước.
        return {
            build: {
                rollupOptions: {
                    input: { index: resolve(__dirname, 'src/content/robot/three/index.ts') },
                    output: {
                        format: 'es' as const,
                        entryFileNames: 'robot3d/index.js',
                        inlineDynamicImports: true,
                        assetFileNames: 'assets/[name]-[hash][extname]',
                    },
                },
                outDir: 'dist',
                emptyOutDir: false,
                target: 'es2020',
            },
            publicDir: false,
        }
    }

    if (mode === 'content') {
        return {
            build: {
                rollupOptions: {
                    input: { content: resolve(__dirname, 'src/content/index.ts') },
                    output: {
                        format: 'iife' as const,
                        entryFileNames: 'content/index.js',
                        chunkFileNames: 'chunks/[name]-[hash].js',
                        assetFileNames: 'assets/[name]-[hash][extname]',
                    },
                },
                outDir: 'dist',
                // Giữ nguyên output của lượt build chính (popup/background/...).
                emptyOutDir: false,
            },
            publicDir: false,
            // Verify ở lượt cuối cùng khi content/index.js đã có mặt.
            plugins: [verifyManifestPlugin],
        }
    }

    return {
        build: {
            rollupOptions: {
                input: {
                    background: resolve(__dirname, 'src/background/index.ts'),
                    // Chạy trong page context (world MAIN) — xem src/page/FieldSyncBridge.ts
                    fieldSyncBridge: resolve(__dirname, 'src/page/FieldSyncBridge.ts'),
                    // Bắt phản hồi danh sách phiếu thanh toán — xem src/page/PaymentListSniffer.ts
                    paymentListSniffer: resolve(__dirname, 'src/page/PaymentListSniffer.ts'),
                    popup: resolve(__dirname, 'src/popup/index.html'),
                },
                output: {
                    entryFileNames: (chunkInfo) => {
                        if (chunkInfo.name === 'background') return 'background/index.js'
                        if (chunkInfo.name === 'fieldSyncBridge') return 'page/FieldSyncBridge.js'
                        if (chunkInfo.name === 'paymentListSniffer') return 'page/PaymentListSniffer.js'
                        if (chunkInfo.name === 'popup') return 'popup/index.js'
                        return 'chunks/[name]-[hash].js'
                    },
                    chunkFileNames: 'chunks/[name]-[hash].js',
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name === 'index.html') return 'popup/index.html'
                        return 'assets/[name]-[hash][extname]'
                    },
                },
            },
            outDir: 'dist',
            // Build một lần: dọn sạch dist. Watch: giữ file cũ để extension luôn nạp được.
            emptyOutDir: !isWatchMode,
        },
        // Build: tự chép public/ bằng plugin chịu-được-khóa (copy mặc định của Vite gặp
        // file bị Chrome khóa là ném UNKNOWN, hỏng build). Dev serve (trang preview
        // robot): PHẢI bật publicDir để vite phục vụ /robot3d/*.glb, không thì 404.
        publicDir: command === 'serve' ? 'public' : false,
        plugins: [copyPublicPlugin, movePopupPlugin],
    }
})
