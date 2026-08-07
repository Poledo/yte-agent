# Minh chứng sử dụng AI - web-admin

Tài liệu này trả lời hai câu hỏi tách bạch:

1. **AI nằm ở đâu trong sản phẩm web-admin** - và ranh giới quyền của nó.
2. **AI được dùng thế nào để làm ra web-admin** - kèm nhật ký prompt thật.

Tài liệu tương ứng của hai repo còn lại: `docs/AI-EVIDENCE.md` (hackathon-api-validation) và `PROMPTS.md` + `tasks/` (hackathon-extension-his).

## 1. Vị trí của web-admin trong hệ AI

web-admin là **bảng điều khiển** của tầng AI, không phải nơi chạy AI. Toàn bộ lời gọi mô hình nằm ở api-validation; web-admin chỉ đọc/ghi cấu hình và hiển thị trạng thái qua HTTP. Trong mã nguồn web-admin **không có** API key mô hình, không có prompt, không có lời gọi trực tiếp tới OpenRouter hay Ollama. Kiểm được bằng hai cách: tìm `https://` trong `src/app/core/api/` không ra kết quả nào (mọi client HTTP đều dựng URL từ `environment.apiBaseUrl`), và tìm `sk-` trong `src/` cũng không ra. Hai tên OpenRouter/Ollama có xuất hiện, nhưng chỉ ở nhãn hiển thị và tên trường cấu hình của màn hình Cấu hình AI.

| Màn hình | Việc nó điều khiển | Endpoint gọi |
|---|---|---|
| Cấu hình AI (`features/ai-config`) | Chọn chạy **online** (OpenRouter) hay **offline** (Ollama trong cụm), đổi model từng chế độ, bấm thử kết nối trước khi lưu | `GET/PUT /api/admin/llm-config`, `POST /api/admin/llm-config/test` |
| Kho tri thức (`features/documents`) | Nạp/gỡ văn bản khỏi kho RAG, xem số đoạn đã cắt, dựng lại chỉ mục ngữ nghĩa và theo dõi tiến độ | `/api/assistant/documents`, `POST /api/assistant/embeddings/rebuild`, `GET /api/assistant/embeddings/status` |
| Văn bản pháp quy (`features/legal`) | Quản lý hiệu lực văn bản - văn bản hết hiệu lực bị loại khỏi truy hồi RAG | `/api/legal` |
| Danh mục HIS (`features/catalog`) | Nạp danh mục dùng cho đối chiếu và cho kho tri thức | `/api/catalog` |
| Cấu hình ngưỡng (`features/system-config`) | Đổi hạn mức chống spam, trong đó có hạn mức riêng cho `/api/assistant/ask` để kiểm soát chi phí LLM | `/api/admin/rate-limit` |
| Cấu hình robot (`features/robot-config`) | Hình hài, màu sắc, hành vi robot trợ lý hiển thị trong extension | `/api/admin/extension-config` |

**Ranh giới quyền của AI, nhìn từ web-admin:** không màn hình nào cho phép AI kết luận hồ sơ đạt hay không đạt. Kết quả kiểm tra hiển thị trên dashboard đều do rule engine tính (455 đặc tả trường + bộ luật liên trường); phần AI chỉ là nhận định kèm theo và có thể tắt bằng cách chuyển sang chế độ offline hoặc bỏ cờ `useAi`.

## 2. AI trong quá trình phát triển web-admin

| Hạng mục | Cách làm |
|---|---|
| Khung dự án | `ng new` bằng **Angular CLI 22.0.7** (ghi trong `README.md`), không phải khung do AI bịa ra |
| Công cụ AI | Claude Code (Anthropic) chạy trong thư mục repo, có quyền đọc/ghi file và chạy lệnh |
| Cách ra lệnh | Người viết yêu cầu bằng tiếng Việt theo từng việc; AI đọc mã nguồn hiện có rồi sửa, không sinh lại toàn bộ |
| Ràng buộc đặt cho AI | Toàn bộ chữ hiển thị cho người dùng phải tiếng Việt; dùng Angular signals + standalone component + zoneless; không thêm thư viện ngoài nếu Angular Material đã có |
| Kiểm chứng | Mỗi thay đổi phải `ng build` sạch và `ng test` xanh; giao diện được xem tận mắt trên trình duyệt trước khi chốt |
| Chốt chặn tự động | CI chạy `npm test` + `npm audit --omit=dev --audit-level=high`, deploy chỉ chạy khi test xanh (`.github/workflows/deploy.yml`) |

## 3. Nhật ký prompt (trích nguyên văn)

Các prompt dưới đây trích **nguyên văn** từ nhật ký phiên làm việc với Claude Code, giữ nguyên lỗi chính tả và cách viết của người dùng. Sắp theo thời gian, chọn những prompt tạo ra thay đổi lớn - không phải toàn bộ hội thoại.

**17/07/2026 - dựng khung và giao diện đầu tiên**

> làm tiếp web admin angular. giao diện hiện đại, dễ sử dụng. với những chỗ cho import file, thì màn hình upload đẹp (kéo-thả nhiều file, loading, báo trạng thái từng file). phần tạo role, gắn quyền, nên làm hay ho xíu.

> dùng luôn angular 22, update node cho tương thích

Kết quả: khung Angular 22, component upload kéo-thả dùng lại được (`shared/file-upload`), màn hình phân quyền theo ma trận vai trò - quyền.

**17/07/2026 - sửa lỗi do người dùng phát hiện, không phải AI tự phát hiện**

> phần web admin, kiểm tra giùm tôi khi tạo tài khoản người dùng được rồi, nhưng ko load danh sách người dùng
> audit log hiện tại có ghi chi tiết không, và đang ko load dược audit log trên web admin
> danh mục his cũng không load được

**18/07/2026 - đưa lựa chọn mô hình lên giao diện**

> hoặc là bạn viết thêm chức năng cho chọn chạy model online hay offline, rồi trên webadmin cũng có chỗ để config chỗ này

Kết quả: màn hình `features/ai-config` - đây là gốc của mục 1 trong bảng trên.

> hiên tại web admin khi bấm vào nút thu gon sibar left thì màn hình bên phải ko to ra

**21/07/2026 - đưa lên hạ tầng**

> hiện tại web-admin chưa commit lên https://github.com/Poledo/hackathon-web-admin.git
> bạn biết vnpt cloud không, tôi muốn triển khi dự án này lên đó, có CI/CD

**23-24/07/2026 - tên miền, SSL, quy trình phát hành**

> nếu tôi muốn sử dung ssl thì làm gì / rồi địa chỉ web sau khi đã cicd thành công là gì / có cần 2 domain hay 1 domain, vì có 2 phần api và web admin mà

Kết quả: một tên miền `cbyts.vnpt.vn`, Ingress định tuyến `/api` sang api-validation và phần còn lại sang web-admin. Đây cũng là lý do web-admin gọi API **cùng origin** (`environment.ts` đặt `apiBaseUrl` rỗng).

**28/07/2026 - cấu hình chạy nóng và giao diện**

> nếu muốn cấu hình ngưỡng trên web admin có được ko, nó áp dụng ngay hay phải càn reset server

> bạn làm chỗ cấu hình limit trên web admin nha

> màn hình system-config cho các card cấu hình to ra luôn
> à, web admin để ý reponsive nhé, mình thấy chưa ổn cho mobile

> rồi cho trang html này thành trang index của web admin, vì hiện tại web admin chưa có index. thêm hàng menu ở trên bên phải, có nút login, trang quản trị,...
> và bạn kiếm 1 theme nào đẹp (gợi ý trước) để thay thế cho giao diện web admin hiện tại

**29/07/2026 - tài liệu người dùng**

> bạn làm giùm tôi file hướng dẫn sử dụng (word) có danh mục này nọ, từ web admin được ko

Kết quả: `huong-dan-su-dung-web-admin.docx` / `.pdf` (đặt trong repo api-validation, thư mục `docs/`).

### Điều đọc được từ nhật ký này

- Yêu cầu đi theo lối **thấy - sửa**: phần lớn prompt là người dùng chỉ ra một chỗ sai hoặc chưa vừa ý sau khi tự bấm thử, không phải mô tả sẵn đặc tả. AI làm phần viết mã; việc quyết định cái gì đúng vẫn ở người.
- Các quyết định kiến trúc (Angular 22, một tên miền, chạy model offline được) đều do người chốt, ghi rõ trong prompt - AI đề xuất phương án nhưng không tự đổi.
- Không có prompt nào yêu cầu AI tự sinh nghiệp vụ BHYT. Toàn bộ luật nghiệp vụ nằm ở api-validation và bắt nguồn từ văn bản của Bộ Y tế.

## 4. Những gì con người kiểm lại, không giao cho AI

- **Đúng/sai nghiệp vụ**: mọi ngưỡng, mọi mã ICD, mọi thông báo cho người dùng cuối đều được đọc lại bằng mắt trước khi chốt.
- **Giao diện**: AI không tự đánh giá được đẹp/xấu và bố cục trên màn hình thật - từng màn hình đều mở trình duyệt xem, kể cả chế độ mobile.
- **Bí mật**: không prompt nào chứa API key hay mật khẩu; giá trị thật nạp bằng biến môi trường lúc chạy (xem `PERFORMANCE-SECURITY.md` của repo api-validation).
