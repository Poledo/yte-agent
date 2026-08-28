// Cấu hình ESLint (flat config) cho extension.
//
// Phạm vi cố ý hẹp: chỉ bắt lỗi logic và mã chết, KHÔNG bắt định dạng
// (thụt lề, dấu chấm phẩy, nháy đơn/kép). Định dạng đã có .editorconfig lo;
// bật thêm rule định dạng ở đây sẽ tạo một lượt sửa hàng loạt không liên quan
// tới chất lượng code và làm nhiễu lịch sử git.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        // dist/ là kết quả build (đã commit để cài Load unpacked) — không lint.
        ignores: ['dist/**', 'node_modules/**', 'public/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },
        },
        rules: {
            // Biến/tham số thừa: đã bật noUnusedLocals trong tsconfig, nhưng tsc
            // không cho phép quy ước "_" để đánh dấu cố ý bỏ qua. ESLint thì có.
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            // any làm mất hết lợi ích của TypeScript, nhưng vài chỗ phải nói chuyện
            // với DOM của HIS (kiểu không kiểm soát được) nên để cảnh báo, không chặn.
            '@typescript-eslint/no-explicit-any': 'warn',
            // Bắt lỗi thật: gán nhầm biến chưa khai báo, so sánh lỏng, biến đổi hằng.
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error',
            // console.log rải rác làm lộ dữ liệu bệnh nhân ra devtools của máy trạm.
            // Chỉ cho phép warn/error/info.
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },
    {
        // File test được phép dùng any và console tự do.
        files: ['**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off',
        },
    },
    {
        // Script công cụ build (pack-crx.mjs) chạy trên Node, không phải trong extension.
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
)
