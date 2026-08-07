# ZeroCheck AI — Chrome Extension cho HIS VNPT

Extension cảnh báo lỗi nhập liệu và kiểm tra hồ sơ XML 130 ngay trên phần mềm khám chữa bệnh (HIS), kết nối AI Validation API (repo `hackathon-api-validation`).

## Tính năng

1. **Cảnh báo nhập liệu thời gian thực** — theo dõi form HIS (MutationObserver + input/change/blur), gửi snapshot về API, hiển thị lỗi/cảnh báo/gợi ý tiếng Việt cạnh trường nhập (nút 🤖 góc phải dưới).
2. **Chat kiểm tra hồ sơ XML 130** (nút 💬, phía trên nút 🤖):
    - Kéo-thả hoặc đính kèm file `.xml` (hồ sơ XML 130) → kết quả nhóm theo Thông tin BN / Chẩn đoán / Dịch vụ / Thuốc / Thời gian / Tài chính / Liên kết / Hành chính, banner đỏ "⚠ Hồ sơ có nguy cơ xuất toán" hoặc xanh "✔ Hồ sơ đạt".
    - Gõ `kiểm tra BN <mã>` → tự tải XML 130 từ HIS (cần cấu hình endpoint, xem dưới).
    - Gõ câu hỏi nghiệp vụ bất kỳ → trợ lý AI trả lời dựa trên văn bản y tế đã nạp, kèm nguồn trích dẫn.

## Build & cài đặt

```bash
cd extension
npm install
npm run build     # build 1 lần → dist/
npm run dev       # hoặc watch mode, tự build khi sửa source
npm run watch   # theo dõi build
```

Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn `extension/dist`.

## Cấu hình

Lưu trong `chrome.storage.local` (đặt qua console DevTools của trang HIS hoặc popup):

| Key              | Ý nghĩa                                                                            | Mặc định                                |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| `chatApiBaseUrl` | Base URL của AI Validation API                                                     | `http://localhost:5075`                 |
| `hisXmlEndpoint` | URL template tải XML 130 theo mã BN, chứa `{patientCode}` — điểm tích hợp HIS thật | (chưa cấu hình → hướng dẫn upload file) |

```js
chrome.storage.local.set({
    chatApiBaseUrl: 'http://localhost:5075',
    hisXmlEndpoint: 'https://his.example.vn/api/xml130?patient={patientCode}',
})
```

## Cấu trúc chính

```
extension/src/
├── content/
│   ├── analyzer/       # FormAnalyzer, FieldDiscovery, LabelResolver
│   ├── tracker/        # ChangeTracker, MutationWatcher, EventBinder
│   ├── validation/     # Rule engine cục bộ (required, regex, date...)
│   ├── pipeline/       # ValidationPipeline → gọi API
│   ├── notification/   # NotificationManager, AssistantBubble, Highlight
│   └── chat/           # ChatPanel (Shadow DOM), ChatApiClient,
│                       #   HisXmlDownloader, ChatMessageRenderer
├── background/         # service worker
└── popup/              # popup cấu hình
```

Tài liệu kiến trúc: [ARCHITECTURE.md](ARCHITECTURE.md), phạm vi dự án: [PROJECT.md](PROJECT.md).
