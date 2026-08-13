# Kiến trúc hệ thống (v2)

## Tổng quan

```
┌─────────────────────────── Trình duyệt (HIS VNPT) ───────────────────────────┐
│  Chrome Extension (Manifest V3, TypeScript)                                  │
│  ├─ FormAnalyzer / ChangeTracker  → theo dõi nhập liệu thời gian thực        │
│  ├─ NotificationManager           → hiển thị cảnh báo trên form              │
│  └─ ChatPanel                     → upload XML130 / hỏi đáp nghiệp vụ        │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │ HTTPS/JSON (CORS)
┌──────────────────────────────────▼───────────────────────────────────────────┐
│  AI Validation API (.NET 10)                                                 │
│                                                                              │
│  ValidationController (v1 form)      Xml130Controller       AssistantController
│        │                                  │                        │         │
│  ValidationService              Xml130ValidationService     AssistantService  │
│        │                                  │                        │         │
│  RuleEngine (IRule×15)          ┌─ Xml130Parser              DocumentSearch  │
│  KnowledgeProvider              ├─ FieldSpecValidator ◄── field_specs.json   │
│  PromptBuilder                  └─ IXml130Rule×6      ◄── cross_field_rules  │
│        │                                  │                        │         │
│        └────────────┬─────────────────────┴────────────┬───────────┘         │
│                     ▼                                  ▼                     │
│              ILLMProvider (factory)              AppDbContext (EF Core)      │
│              ├─ OpenRouterProvider               ├─ knowledge_items (ICD…)   │
│              └─ OllamaProvider                   ├─ medical_documents        │
│                                                  └─ document_chunks (tsvector)│
└──────────────────────────────────────────────────────────────────────────────┘
                     │                                  │
              OpenRouter / Ollama                  PostgreSQL 14+
```

## Luồng 1 — Cảnh báo nhập liệu thời gian thực (v1)

1. Extension bắt sự kiện thay đổi trường trên form HIS (ChangeTracker + MutationWatcher).
2. Gửi Form Snapshot (`POST /api/validation`) gồm page, trigger, context, form data.
3. `RuleEngine` chạy tuần tự 15 rule cục bộ (nhân khẩu, liên hệ, ICD) — trả kết quả tức thời không cần AI.
4. Trường hợp cần suy luận sâu, `ValidationService` build prompt (PromptBuilder + Knowledge) và gọi LLM.
5. Extension hiển thị lỗi/cảnh báo/gợi ý ngay cạnh trường nhập.

## Luồng 2 — Kiểm tra hồ sơ XML 130 (v2, mới)

1. Người dùng upload file XML 130 vào khung chat (hoặc nhập mã BN → extension tải XML từ HIS qua endpoint cấu hình).
2. `Xml130Parser` đọc cấu trúc `GIAMDINHHS`, thuật toán generic nhận diện record: *element có toàn bộ con là leaf* → hỗ trợ đủ 15 bảng XML1–XML15 mà không cần model cứng cho ~455 trường.
3. `FieldSpecValidator` đối chiếu từng trường với `Knowledge/Xml130/field_specs.json` (sinh từ file Excel đặc tả QĐ 130 + QĐ 4750): bắt buộc, kiểu, độ dài, định dạng ngày, danh mục giá trị.
4. 6 rule liên trường/liên bảng chạy độc lập (lỗi 1 rule không chặn rule khác):
   | Rule | Kiểm tra |
   |---|---|
   | `BhytCardRule` | cấu trúc mã thẻ, hạn thẻ so với ngày vào/ra viện, mã ĐKBĐ |
   | `TimeSequenceRule` | ngày sinh/vào/ra/thanh toán, số ngày điều trị, khám < 5 phút, ngày y lệnh trong đợt |
   | `FinancialRule` | thành tiền = SL×ĐG×tỷ lệ, cơ cấu nguồn, T_THUOC/T_VTYT khớp chi tiết |
   | `DiagnosisRule` | định dạng ICD-10, trùng mã, mã bệnh dòng chi tiết ⊆ chẩn đoán, danh mục ICD (giới tính/tuổi/chẩn đoán chính) |
   | `LinkConsistencyRule` | MA_LK, MA_CSKCB, họ tên/mã thẻ giấy tờ kèm theo khớp XML1 |
   | `KcbLogicRule` | logic nội/ngoại trú, giấy chuyển tuyến XML13, hẹn khám lại XML14, kết quả điều trị |
5. Kết quả gộp theo nhóm (PatientInfo/Diagnosis/Service/Drug/Time/Finance/Link/Admin) kèm cờ `xuatToanRisk` từng vấn đề; tùy chọn `useAi=true` gọi LLM sinh nhận định tổng hợp.

## Luồng 3 — AI học văn bản y tế (RAG, mới)

1. **Nạp**: `POST /api/assistant/documents` (file .txt/.md hoặc JSON) → `DocumentIngestService` chia đoạn ~1200 ký tự (chồng lấn 200, cắt tại ranh giới đoạn/câu) → lưu `document_chunks`; PostgreSQL sinh cột `tsvector` (GIN index) tự động.
2. **Truy hồi + rerank**: `DocumentSearchService` lấy một *pool* ứng viên rộng (25–40 đoạn) từ 2 tầng — full-text (`plainto_tsquery`, config `simple`, xếp hạng `ts_rank`) và ILIKE theo **từ khóa hiếm nhất** trong câu hỏi (ưu tiên từ đặc trưng như "lao" thay vì từ phổ biến "điều trị"). Sau đó `DocumentReranker` chọn top-5 liên quan nhất: LLM chấm điểm độ liên quan từng đoạn (khi có key) + đa dạng hóa nguồn (tối đa 3 đoạn/văn bản). Không có rerank, một tài liệu lớn (vd QĐ25 có 1.852 đoạn) dễ lấn át toàn bộ top-k và che các văn bản nhỏ liên quan hơn.
3. **Sinh câu trả lời**: `AssistantService` đưa top-5 đoạn vào prompt, LLM bị ràng buộc *chỉ trả lời theo văn bản cung cấp, dẫn nguồn [Nguồn n], nói rõ khi không đủ căn cứ* → giảm bịa đặt. Không có API key → trả trích đoạn thô.

## Nguyên tắc thiết kế

Giữ nguyên từ v1 (xem `AIValidation.Api/docs/ARCHITECTURE.md`): SRP, DI, interface-first, async-first, provider pattern (đổi LLM không sửa business logic). Mọi thông báo người dùng bằng tiếng Việt.

## Quyết định thiết kế đáng chú ý (v2)

- **Parse generic thay vì model cứng**: đặc tả 455 trường nằm ở JSON data (sinh tự động từ Excel), engine không cần biên dịch lại khi QĐ mới điều chỉnh chỉ tiêu.
- **Rule catalog 2 lớp**: `cross_field_rules.json` là danh mục nghiệp vụ (100 rule, hiển thị cho người dùng qua `GET /api/xml130/rules`); C# rule là hiện thực máy chạy — tách phần "định nghĩa để đọc" khỏi phần "thực thi".
- **RAG thay vì fine-tune**: văn bản y tế thay đổi liên tục (công văn mới hằng tháng); RAG cập nhật tức thời bằng cách nạp văn bản, không tốn chi phí huấn luyện, câu trả lời truy vết được nguồn. Chi tiết: [AI-EVIDENCE.md](AI-EVIDENCE.md).
- **FTS `simple` + ILIKE**: tiếng Việt chưa có stemmer PostgreSQL chuẩn; cấu hình `simple` giữ nguyên từ, ILIKE bù biến thể — đủ tốt cho kho văn bản cỡ nghìn trang, không cần embedding service ngoài.
- **Rerank thay vì chỉ tăng top-k**: khi kho có văn bản kích thước rất chênh nhau (thông tư vài chục đoạn cạnh quy trình kỹ thuật vài nghìn đoạn), tăng top-k đơn thuần chỉ lấy thêm đoạn từ tài liệu lớn. Rerank (LLM chấm điểm + đa dạng nguồn) giải quyết đúng gốc: chọn theo độ liên quan thật, không theo tần suất từ khớp. Đây là dạng "truy hồi 2 bước" — lấy rộng rồi lọc tinh — hợp với dự án hơn hẳn fine-tune hay recursive self-improvement (xem [AI-EVIDENCE.md](AI-EVIDENCE.md)).
- **Cấu hình runtime lưu bền (không cần restart)**: các cấu hình vận hành — đặc tả trường XML130, ngưỡng chống spam, chế độ AI online/offline, lịch đồng bộ ICD — theo cùng một khuôn: một service singleton giữ trạng thái, ghi bền ra `Storage/*.json` (đi qua PVC nên sống sót khi pod restart), sửa từ web admin qua API có kiểm soát quyền `System.Admin`, áp dụng ngay trong bộ nhớ. Nhờ vậy đổi quy định nghiệp vụ (QĐ mới điều chỉnh chỉ tiêu) hay siết bảo mật không cần build lại image.
- **Chống spam request (rate limiting)**: middleware `UseRateLimiter` (đặt sau CORS, trước xác thực) phân vùng theo IP thật (ưu tiên `X-Forwarded-For` vì sau ingress/LB). Giới hạn chung 100 req/phút/IP + siết riêng các endpoint nhạy cảm; ngưỡng đọc động từ service cấu hình, gắn "số phiên bản" vào khóa phân vùng để admin đổi là áp ngay. Chi tiết: [PERFORMANCE-SECURITY.md](PERFORMANCE-SECURITY.md).
- **Khóa bản quyền theo cơ sở KCB là danh tính duy nhất dùng để tính tiền**: `MACSKCB` nằm bên trong file XML 130 do người dùng tự khai, sửa được tùy ý nên không bao giờ được dùng để xác định bên trả tiền. Đơn vị bị tính tiền luôn suy ra từ khóa gửi kèm request (`X-License-Key`), còn mã cơ sở trong XML chỉ dùng để **kiểm tra hồ sơ có nằm trong phạm vi hợp đồng hay không**. Ba lớp tách bạch: xác thực (khóa) - phân quyền/phạm vi (cây đơn vị) - đo đếm & tính tiền (sổ sản lượng → hóa đơn).
- **Khóa chỉ lưu bản băm**: CSDL giữ SHA-256 của khóa + `KeyPrefix` (đoạn đầu để nhận diện trên giao diện); chuỗi khóa gốc rời máy chủ đúng **một lần** ở phản hồi cấp mới / cấp lại. Mất khóa thì cấp lại (`rotate`) chứ không có đường tra ngược - đúng chuẩn lưu bí mật, và web admin phản ánh điều đó bằng hộp thoại chép khóa chỉ đóng được sau khi đã chép.
- **Ba chế độ bật khóa `Licensing:Mode` (Off / Warn / Enforce), mặc định Off**: các cơ sở đang chạy tiện ích bản cũ chưa có khóa; nếu nâng cấp API mà chặn ngay thì cả tỉnh mất dịch vụ trong lúc chưa kịp phát khóa. Off = không kiểm; Warn = vẫn phục vụ nhưng ghi log/ghi sổ để đối soát trước khi thu tiền; Enforce = chặn thật. Lộ trình bật dần từng nấc, không có "ngày N cắt sóng". Cờ `RecordBilling` tách riêng khỏi `Mode` vì hai việc độc lập: đo thử sản lượng thật trong lúc còn chạy `Off`/`Warn` là điều kiện để đàm phán hạn mức trước khi phát hành hóa đơn.
- **`CoversSubtree` (phạm vi thương mại) tách khỏi `InheritCatalogFromParent` (kế thừa danh mục)**: hai chuyện khác nhau về bản chất - một Trạm Y tế xã có thể dùng chung danh mục của Trung tâm Y tế huyện nhưng vẫn là một hợp đồng riêng, và ngược lại. Gộp hai cờ làm một thì mỗi lần đổi cách bán hàng lại phá cấu hình danh mục đang chạy.
- **`UsageRecorder` nuốt lỗi, `BillingRecorder` ném lỗi**: thống kê phục vụ hiển thị - hỏng thì không được làm chết request kiểm hồ sơ. Sổ sản lượng là căn cứ tính tiền - ghi hụt là mất doanh thu, nên lỗi phải nổi lên. Khử trùng theo `MA_LK` bằng `ON CONFLICT DO NOTHING`: một hồ sơ kiểm lại 5 lần vẫn chỉ tính 1 đơn vị, người dùng không bị phạt vì bấm kiểm lại.
- **Endpoint stream chỉ chặn được trước byte đầu tiên**: khi đã bắt đầu đẩy SSE thì không trả 402/403 được nữa. Vì vậy kiểm phạm vi hợp đồng ngay tại sự kiện `start`, còn ghi sổ đặt sau khi stream chạy xong - nếu kết nối đứt giữa chừng thì **cố ý tính thiếu chứ không tính thừa**, sai về phía có lợi cho khách hàng.
- **Bảng kê tính lại từ sổ, hóa đơn đóng băng số liệu**: `GET /api/billing/usage` luôn cộng lại từ sổ sản lượng nên phản ánh đúng hiện trạng kỳ đang chạy; khi chốt kỳ, `BillingInvoice` ghi cứng số hồ sơ, số vượt hạn mức và đơn giá tại thời điểm chốt. Sau này sửa giá gói cước không làm hóa đơn đã phát hành tự đổi số - điều kiện tiên quyết để đối soát với kế toán.
- **Kỳ tính tiền `yyyyMM` chốt theo giờ Việt Nam (UTC+7)** ở cả máy chủ (`IBillingRecorder.PeriodOf`) lẫn web admin: máy chủ chạy UTC, nếu lấy thẳng giờ UTC thì hồ sơ kiểm lúc 7 giờ sáng ngày 1 sẽ rơi nhầm vào kỳ tháng trước.
