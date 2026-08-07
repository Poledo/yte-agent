### API

Quyết định:

Extension chỉ gửi Form Snapshot.

API tự quyết định:

- Có cần Knowledge hay không.
- Có cần gọi AI Provider hay không.
- Prompt sẽ được xây dựng như thế nào.

Lý do:

Giữ Extension càng mỏng càng tốt.

Toàn bộ trí thông minh tập trung tại AI Validation API.

### AI Provider

Quyết định:

Không phụ thuộc vào một mô hình AI cụ thể.

Toàn bộ việc gọi AI phải thông qua LLM Provider.

Lý do:

Có thể thay đổi mô hình AI mà không ảnh hưởng đến Validation Service.
### Chỉ mục ngữ nghĩa (RAG): pgvector với fallback bộ nhớ

Quyết định:

Vector embedding (Ollama bge-m3, 1024 chiều) lưu gốc ở cột bytea `Embedding` của
`document_chunks` (EF ghi khi ingest). Tìm kiếm ngữ nghĩa ưu tiên chạy qua PGVECTOR:
cột `embedding_vec vector(1024)` + chỉ mục HNSW, truy vấn `ORDER BY embedding_vec <=> query`
(`PgVectorEmbeddingIndex`). PostgreSQL chưa cài extension pgvector thì tự rơi về chỉ mục
bộ nhớ brute-force (`EmbeddingIndex`) — hệ thống không lỗi, chỉ log hướng dẫn cài.

Hạ tầng pgvector (CREATE EXTENSION, ADD COLUMN, CREATE INDEX hnsw) do app tự tạo
best-effort ở lần dùng đầu, KHÔNG nằm trong EF migration — để thiếu binary pgvector
không làm kẹt chuỗi migration lúc khởi động.

Lý do:

- Kho ~105 nghìn đoạn: giữ toàn bộ vector trong RAM tốn ~430 MB và quét tuyến tính mỗi
  câu hỏi; pgvector + HNSW tra cứu xấp xỉ nhanh, RAM không phình theo kho.
- Cột bytea giữ làm nguồn gốc nên chuyển đổi KHÔNG phải embed lại: nút "Chỉ mục ngữ
  nghĩa" (POST /api/assistant/embeddings/rebuild) bước 0 chép bytea → embedding_vec
  theo lô trong ngân sách ~50 giây/request, client tự gọi lặp tới khi xong.
- Cấu hình: `Embedding:UsePgvector` (mặc định true), `Embedding:Dimensions` (mặc định 1024).

### Truy vấn full-text: tsquery tự dựng, KHÔNG dùng plainto_tsquery

Quyết định:

Tầng full-text của trợ lý hỏi–đáp (`DocumentSearchService.BuildTsQuery`) tự dựng chuỗi
cho `to_tsquery('simple', ...)` thay vì gọi thẳng `plainto_tsquery`:

1. Bỏ hư từ và từ để hỏi tiếng Việt ("là", "gì", "bao", "nhiêu", "phần", "trăm"...).
   CỐ Ý giữ "vào" và "ra" — "ngày vào viện"/"ngày ra viện" là chỉ tiêu XML 130.
2. Gộp cặp viết tắt ↔ dạng đầy đủ thành nhóm OR: hỏi "bảo hiểm y tế" hay "BHYT" đều
   sinh ra `('bhyt' | 'bảo' & 'hiểm' & 'y' & 'tế')`.
3. Nối các từ còn lại bằng AND. AND khớp 0 đoạn thì chạy LẠI bằng OR và để `ts_rank`
   + reranker lọc.
4. Chỉ giữ ký tự chữ/số khi tách từ, nên chuỗi dựng ra không thể sai cú pháp to_tsquery.

Lý do:

`plainto_tsquery` nối MỌI từ bằng AND, mà config `simple` không có từ điển tiếng Việt
nên không loại được hư từ nào. Đo trên chính dữ liệu production (19.925 đoạn):

| Câu hỏi | plainto_tsquery | tsquery tự dựng (AND) |
|---|---|---|
| `Mức hưởng bảo hiểm y tế đúng tuyến là bao nhiêu phần trăm?` | **0 đoạn** | **7 đoạn** (5,9 ms) |

Hỏi cụt lủn ("mức hưởng BHYT đúng tuyến") thì ra kết quả, hỏi đủ ý thì trả lời "không
tìm thấy căn cứ" — tức là trợ lý chạy tốt với người đã quen hệ thống và hỏng với người
lạ, đúng nhóm người dùng cần phục vụ nhất.

Giới hạn còn lại (chưa xử lý):

- `SearchVector` chỉ sinh từ `Content` của đoạn, KHÔNG gồm `Title`/`DocNumber` của văn
  bản, nên hỏi theo số hiệu ("Quyết định 130/QĐ-BYT") không khớp được ở tầng full-text —
  phải trông vào tầng ngữ nghĩa. Sửa được nhưng cần đổi cột generated + migration.
- Gõ không dấu ("ngay vao vien") không khớp gì: `simple` không chuẩn hóa dấu. Cần
  extension `unaccent` và cột tsvector thứ hai.

## Trộn ứng viên đa tầng bằng RRF, KHÔNG xếp theo điểm thô

`DocumentSearchService.SearchAsync` truy hồi qua 4 tầng độc lập (ngữ nghĩa vector,
full-text, ILIKE từ khóa, khớp nguyên cụm) rồi mới đưa pool cho reranker LLM. Pool
được hợp nhất bằng **RRF (Reciprocal Rank Fusion)**: điểm mỗi đoạn = tổng
`1/(60 + thứ hạng trong từng tầng)`, tầng nguyên cụm nhân trọng số 2.

Lý do:

Cách cũ xếp pool theo điểm thô của tầng sinh ra đoạn đó. Nhưng ba tầng dùng ba thang
đo không so sánh được với nhau:

| Tầng | Thang điểm | Giá trị thực đo |
|---|---|---|
| Ngữ nghĩa | cosine similarity | 0,54–0,59 **kể cả với đoạn chẳng liên quan** |
| Full-text | `ts_rank` | ~0,07 |
| Từ khóa | độ hiếm `1/(1+n)` | ~0,03 với biến thể khớp 29 đoạn |

Reranker LLM chỉ chấm điểm 20 ứng viên đầu (`DocumentReranker`, giới hạn cố ý để
khống chế chi phí và độ trễ). Khi nâng số hit vector từ 15 lên 30, cả 20 chỗ đó bị
đoạn danh mục HIS chiếm sạch — không phải vì chúng liên quan hơn, mà chỉ vì cosine
nằm ở thang cao hơn. Hỏi "Liệt kê ICD 10 bệnh đái tháo đường" quay ra "không tìm thấy
căn cứ" dù đoạn trả lời (Thông tư 26/2025) vẫn nằm trong pool, hạng ngoài 20.

RRF chỉ đọc THỨ HẠNG nên thang điểm gốc không còn ảnh hưởng gì: mỗi tầng luôn giành
được chỗ ở đầu pool theo đúng tỷ lệ, dù điểm nội bộ của nó to hay nhỏ. Đây cũng là
cách Elasticsearch, Azure AI Search, Weaviate và Qdrant hợp nhất tìm kiếm lai; hằng số
k = 60 lấy theo bài gốc của Cormack (2009) và cũng là mặc định của các hệ đó.

Hệ quả có lợi kèm theo: đoạn được nhiều tầng cùng trả về sẽ cộng dồn điểm và nổi lên
đầu — đồng thuận giữa ngữ nghĩa và từ khóa là tín hiệu mạnh hơn hẳn một tầng đơn lẻ.

Khóa lại bằng `AIValidation.Tests/Rag/TronPoolRrfTests.cs`, trong đó test
`MoiTangDeuCoMatTrongCuaSo20ChoDauTienCuaReranker` dựng đúng tình huống 30 hit vector
đã gây hồi quy.

## Danh mục HIS gắn với cơ sở KCB, kế thừa theo cây đơn vị

Quyết định:

Danh mục HIS không dùng chung toàn hệ thống mà gắn với từng cơ sở KCB (mã `DVTT` = `MACSKCB`).
Cơ sở chưa nạp một loại danh mục thì mượn của đơn vị cấp trên trong cây đơn vị, xét riêng
theo từng loại danh mục, và dừng tại đơn vị nào tắt cờ "được dùng danh mục cấp trên".

Lý do:

Một hệ thống phục vụ cả Sở Y tế lẫn hàng chục trạm y tế xã. Nếu trộn chung danh mục, hồ sơ của
cơ sở A bị đối chiếu bằng mã của cơ sở B và báo sai hàng loạt. Nếu bắt buộc mỗi cơ sở tự nạp
đủ mọi loại danh mục thì trạm y tế xã - vốn dùng nguyên danh mục tuyến trên ban hành - sẽ không
bao giờ đối chiếu được. Kế thừa theo cây giải quyết cả hai, và xét theo từng loại cho phép một
cơ sở có danh mục thuốc riêng nhưng vẫn mượn danh mục nhân viên của cấp trên.

Không tìm được danh mục nào trong chuỗi thì rule **bỏ qua**, không báo lỗi. Im lặng còn hơn báo
sai: người dùng mất niềm tin vào công cụ ngay lần đầu thấy một trang toàn lỗi giả.

## Bỏ qua file danh mục không đổi theo SHA-256

Quyết định:

`CatalogSource` lưu `ContentHash` = SHA-256 nội dung file. Luồng extension nạp cả bộ danh mục
truyền `skipUnchanged=true`; file trùng hash bản đang hiệu lực được bỏ qua, không nạp lại.

Lý do:

Nút "Nạp danh mục HIS" tải một lượt hàng chục file, trong đó danh mục thuốc/vật tư lên tới hàng
chục nghìn dòng và gần như không đổi giữa hai lần bấm. Nạp lại toàn bộ mỗi ngày là vô ích.

Hệ quả cần nhớ: sửa `ExcelCatalogReader` (đổi cách tách dòng) **không** làm danh mục cũ tự nạp
lại, vì file vẫn y hệt nên hash vẫn khớp. Phải gỡ danh mục đó rồi nạp lại thủ công.

## Nạp kho tri thức tách khỏi nạp danh mục

Quyết định:

Import danh mục chỉ ghi vào bảng đối chiếu. Đưa toàn văn danh mục vào kho tri thức RAG là thao
tác riêng, chọn từng dòng (hoặc nhiều dòng) trên màn hình Danh mục HIS.

Lý do:

Trước đây mọi danh mục đều bị nạp vào kho tri thức. Danh mục thuốc hàng chục nghìn dòng làm
nhiễu kết quả truy hồi của trợ lý hỏi - đáp và tốn embedding, trong khi người dùng không kiểm
soát được. Tách ra thì quản trị viên chọn đúng thứ trợ lý cần tra cứu.

Danh mục nạp từ trước khi hệ thống lưu file gốc thì báo lỗi tiếng Việt và dừng, KHÔNG dựng lại
nội dung từ bảng đối chiếu - dữ liệu đã qua chuẩn hóa không còn là văn bản gốc để trích dẫn.

## Gán vai trò người dùng phải chạy tuần tự và kiểm tra kết quả

Quyết định:

`UserAdminService` kiểm tra `IdentityResult` của `AddToRolesAsync`/`RemoveFromRolesAsync` và trả
lỗi tiếng Việt khi thất bại. Web admin gọi `update` xong mới gọi `assignRoles` (tuần tự, không
`forkJoin`).

Lý do:

ASP.NET Identity lưu vai trò kèm việc xoay `ConcurrencyStamp` của chính bản ghi người dùng trong
cùng một `SaveChanges`. Gọi song song thì lệnh về sau cầm stamp cũ, cả transaction bị hủy - bản
ghi vai trò cũng bị rollback - và trả về `ConcurrencyFailure`. Bỏ qua kết quả thì API báo "thành
công" trong khi vai trò không hề được lưu, đúng triệu chứng "sửa vai trò lưu lại không ăn".
