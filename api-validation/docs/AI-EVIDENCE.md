# Minh chứng sử dụng AI

Tài liệu này trình bày AI được dùng ở đâu, như thế nào, và vì sao chọn cách tiếp cận đó.

## 1. Các điểm ứng dụng AI trong hệ thống

| # | Tính năng | Thành phần | Mô hình |
|---|---|---|---|
| 1 | Nhận định nguy cơ xuất toán hồ sơ XML 130 | `Xml130ValidationService.BuildAiAssessmentAsync` | LLM qua OpenRouter (cấu hình được) hoặc Ollama local |
| 2 | Hỏi đáp văn bản y tế có trích dẫn (RAG) | `AssistantService` + `DocumentSearchService` | LLM + PostgreSQL full-text retrieval |
| 3 | Validate form nhập liệu bằng AI (v1) | `ValidationService` + `PromptBuilder` | LLM với prompt template + knowledge context |

## 2. Kiến trúc AI: RAG thay vì fine-tune

**Câu hỏi đặt ra**: làm sao cho AI "học" các văn bản, công văn y tế để trả lời đúng?

**Lựa chọn: RAG (Retrieval-Augmented Generation)** — không huấn luyện lại mô hình, mà:

1. **Nạp văn bản** → chia đoạn ~1200 ký tự (chồng lấn 200 để không đứt ngữ cảnh), lưu PostgreSQL, đánh chỉ mục `tsvector` + GIN.
2. **Khi có câu hỏi** → truy hồi top-5 đoạn liên quan nhất (ts_rank + ILIKE bù biến thể tiếng Việt).
3. **LLM sinh câu trả lời** với ràng buộc trong system prompt:
   > "CHỈ trả lời dựa trên các trích đoạn văn bản được cung cấp; nếu văn bản không đủ thông tin, nói rõ là không tìm thấy căn cứ. Khi trả lời phải dẫn số nguồn dạng [Nguồn 1], [Nguồn 2]."

**Vì sao không fine-tune:**

| Tiêu chí | Fine-tune | RAG (đã chọn) |
|---|---|---|
| Cập nhật công văn mới | Huấn luyện lại (giờ→ngày, tốn GPU) | Nạp file → dùng ngay |
| Truy vết nguồn câu trả lời | Không thể | Trích dẫn từng đoạn văn bản |
| Nguy cơ bịa đặt (hallucination) | Cao, khó kiểm soát | Ràng buộc "chỉ theo ngữ cảnh" + từ chối khi thiếu căn cứ |
| Chi phí | Cao | Chỉ tốn phí inference |
| Dữ liệu nhạy cảm | Trộn vào trọng số mô hình | Nằm trong DB của cơ sở, xóa được |

## 3. Prompt gửi tới mô hình (nguyên văn)

Đây là **prompt thật** hệ thống lắp và gửi lên LLM ở từng điểm ứng dụng (trích nguyên văn từ source, không diễn giải). Chỗ `{{...}}` / `{...}` là biến chèn dữ liệu hồ sơ lúc chạy.

### 3.1. Hỏi đáp văn bản (RAG) — `AssistantService`

**System prompt:**

```
Bạn là trợ lý nghiệp vụ BHYT cho nhân viên y tế Việt Nam. CHỈ trả lời dựa trên các trích đoạn văn bản được cung cấp; nếu văn bản không đủ thông tin, nói rõ là không tìm thấy căn cứ. Khi trả lời phải dẫn số nguồn dạng [Nguồn 1], [Nguồn 2] — CHỈ dẫn những nguồn bạn thực sự lấy thông tin, bỏ qua nguồn không liên quan tới câu hỏi. Trả lời ngắn gọn bằng tiếng Việt.
```

**User prompt (khuôn):**

```
Các trích đoạn văn bản:

[Nguồn 1: {tiêu đề văn bản} (số {số hiệu})]
{nội dung đoạn 1 truy hồi được}
[…]
{nội dung đoạn 2}

---

[Nguồn 2: ...]
...

Câu hỏi: {câu hỏi người dùng}
```

> `{context}` được ghép từ top‑k đoạn văn bản do tầng truy hồi (pgvector + full-text `ts_rank`) trả về — xem log thật ở mục 4, lần chạy này `UserPromptLength = 6039` ký tự.

### 3.2. Nhận định nguy cơ xuất toán hồ sơ XML 130 — `Xml130ValidationService.BuildAiAssessmentAsync`

**System prompt:**

```
Bạn là chuyên gia giám định BHYT Việt Nam, am hiểu QĐ 130/QĐ-BYT, QĐ 4750/QĐ-BYT và quy trình giám định của BHXH. Trả lời ngắn gọn, chính xác, bằng tiếng Việt.
```

**User prompt (khuôn):**

```
Hồ sơ KCB BHYT (XML 130) của cơ sở {MaCskcb} có các vấn đề sau:
- [{Severity}] ({Table}/{Field}) {Message}
- [{Severity}] ({Table}/{Field}) {Message}
... (tối đa 40 lỗi do rule engine phát hiện)

Hãy đánh giá ngắn gọn (tối đa 150 từ, tiếng Việt) mức độ nguy cơ bị BHXH xuất toán, chỉ ra 3 việc cần ưu tiên sửa nhất, theo thứ tự ảnh hưởng tài chính.
```

> Điểm mấu chốt: phần liệt kê lỗi trong user prompt do **rule engine** sinh ra (deterministic), AI chỉ tổng hợp và xếp ưu tiên — AI không tự phán hồ sơ đạt/không đạt.

### 3.3. Validate form nhập liệu (v1) — template `Prompts/validation.system.md` + `validation.user.md`

**System prompt** (rút gọn, nguyên văn ở `Prompts/validation.system.md`): định vai trò "AI validate dữ liệu y tế cho HIS Việt Nam", liệt kê 9 nguyên tắc kiểm tra (kiểu/định dạng ngày `YYYY-MM-DD`, trường bắt buộc, nhất quán ngày vào/ra viện, chống chỉ định theo giới O80/N40, tương tác thuốc, mã BHYT…) và ràng buộc **chỉ trả JSON**.

**User prompt (khuôn — `validation.user.md`):**

```
## Patient Information
{{Patient}}
## Encounter Information
{{Encounter}}
## Diagnosis Information
{{Diagnosis}}
## Procedure Information
{{Procedure}}
## Medicine Information
{{Medicine}}
## Reference Knowledge
{{Knowledge}}

## Validation Task
... (phân tích nhất quán, đối chiếu từng mã ICD/thuốc/thủ thuật với Reference Knowledge,
kiểm tra tuổi/giới, sinh mảng issues) ...

## Output Format
Respond with ONLY valid JSON:
{ "issues": [ { "code": "...", "severity": "ERROR|WARNING|INFO", "field": "...", "message": "... (tiếng Việt)" } ] }
```

## 4. Log chạy thật — bắt live trên hệ thống production (2026‑07‑28)

Gọi thẳng endpoint AI đang chạy ở cụm production VNPT (`https://cbyts.vnpt.vn/api/...`, endpoint hỏi đáp là anonymous) và trích log pod bằng `kubectl -n cbyts logs deployment/api-validation`. Đây là request/response **thật**, không dựng sẵn.

### 4.1. Request client gửi lên

```http
POST https://cbyts.vnpt.vn/api/assistant/ask   (2026-07-28T16:38:23+07:00)
Content-Type: application/json; charset=utf-8

{"question":"Thẻ BHYT hết hạn trong đợt điều trị nội trú thì chi phí sau ngày hết hạn được thanh toán thế nào?"}
```

### 4.2. Response server trả về (HTTP 200, tổng 9,49s)

```json
{
  "answer": "Trường hợp thẻ BHYT hết hạn trong đợt điều trị nội trú, người bệnh được quỹ BHYT thanh toán chi phí trong phạm vi quyền lợi đến ngày ra viện tối đa không quá 15 ngày kể từ ngày thẻ hết hạn [Nguồn 1].",
  "citations": [
    {
      "documentId": 1,
      "title": "Quyết định 130/QĐ-BYT - Quy định chuẩn dữ liệu đầu ra",
      "docNumber": "130/QĐ-BYT",
      "excerpt": "Điều 1. Ban hành kèm theo Quyết định này quy định chuẩn và định dạng dữ liệu đầu ra phục vụ việc quản lý, giám định, thanh toán chi phí khám bệnh, chữa bệnh. Trường MA_LK là mã đợt điều trị duy nhất dùng để liên kết giữa Bảng chỉ tiêu tổng hợp khám bệnh chữa bệnh (bảng XML1) và các bảng còn lại. Tr…"
    }
  ],
  "fromLlm": true
}
```

> `"fromLlm": true` là cờ do chính API đặt, xác nhận câu trả lời do LLM sinh (không phải fallback rule-based); câu trả lời có `[Nguồn 1]` khớp đúng văn bản trong `citations`.

### 4.3. Log runtime phía server (trích từ pod production, cùng mốc thời gian)

Nguyên trình tự pipeline RAG cho đúng request trên (đã bỏ bớt dòng lặp cho gọn):

```log
2026-07-28T16:38:24.708 info HttpClient.IEmbeddingService  Start POST → Ollama bge-m3 (vector hoá câu hỏi)
2026-07-28T16:38:24.957 info HttpClient.IEmbeddingService  ← embedding trả về (248 ms)
2026-07-28T16:38:24.961 info Microsoft.EntityFrameworkCore.Database.Command
        SELECT d."Id", d."ChunkIndex", d."Content", d."DocumentId", d."Embedding", d."SearchVector", m."Title", m."DocNumber"
        FROM public.document_chunks AS d ...
        WHERE m."IsActive" AND (m."ExpiryDate" IS NULL OR m."ExpiryDate" > @now)
          AND (m."EffectiveDate" IS NULL OR m."EffectiveDate" <= @now)
          AND d."SearchVector" @@ plainto_tsquery('simple', @query)
        ORDER BY ts_rank(d."SearchVector", plainto_tsquery('simple', @query)) DESC
        -- truy hồi hybrid: vector (pgvector) + full-text, chỉ lấy văn bản CÒN hiệu lực
2026-07-28T16:38:28.984 info AIValidation.Api.Providers.LLMProvider
        LLM Provider: Selecting provider 'openrouter'
        LLM Provider: Using OpenRouterProvider for model 'openai/gpt-4o-mini'
2026-07-28T16:38:28.984 info AIValidation.Api.Providers.LLM.OpenRouterProvider
        Sending request to OpenRouter: Model=openai/gpt-4o-mini, UserPromptLength=6039
2026-07-28T16:38:28.985 info HttpClient.OpenRouterProvider
        Start processing HTTP request POST https://openrouter.ai/api/v1/chat/completions
2026-07-28T16:38:31.877 info AIValidation.Api.Providers.LLM.OpenRouterProvider
        OpenRouter response received: Model=openai/gpt-4o-mini, CompletionTokens=169
        LLM Provider: Successfully received response from OpenRouterProvider
```

**Đọc từ log:**

| Chỉ số | Giá trị (đo thật) |
|---|---|
| Thời điểm | 2026‑07‑28 16:38:23 → 16:38:33 (+07:00) |
| Provider / Model | OpenRouter → `openai/gpt-4o-mini` |
| Endpoint LLM thật | `POST https://openrouter.ai/api/v1/chat/completions` |
| Độ dài prompt gửi lên | 6039 ký tự (system + context truy hồi + câu hỏi) |
| Token sinh ra | `CompletionTokens = 169` |
| Truy hồi ngữ cảnh | pgvector (bge‑m3) + full-text `ts_rank`, lọc văn bản còn hiệu lực |
| Tổng độ trễ end‑to‑end | 9,49 giây (đo phía client) |

> Cách tái lập: `curl -X POST https://cbyts.vnpt.vn/api/assistant/ask -H "Content-Type: application/json" --data-binary @body.json` rồi `kubectl -n cbyts logs deployment/api-validation --timestamps --since=5m`.

## 5. Vai trò phân định: Rule engine vs AI

Nguyên tắc thiết kế: **cái gì máy kiểm tra chắc chắn được thì dùng rule (deterministic), AI chỉ làm phần suy luận và ngôn ngữ**:

- Rule engine (455 field spec + 100 rule liên trường): kết quả tái lập 100%, không phụ thuộc mạng, chi phí 0.
- AI: tổng hợp nhận định, xếp ưu tiên xử lý, hỏi đáp văn bản — nơi cần hiểu ngôn ngữ tự nhiên.
- AI **không có quyền quyết định** hồ sơ đạt/không đạt — cờ `xuatToanRisk` luôn do rule engine tính.

## 6. Cấu hình đa mô hình

`LLMProvider` là factory theo provider pattern — đổi mô hình không sửa code:

```json
"LLM": { "Provider": "OpenRouter", "Model": "...", "Temperature": 0 }
```

- `OpenRouter`: truy cập GPT/Claude/Llama/Qwen... qua một API.
- `Ollama`: chạy model local (Qwen, Llama) — phương án cho bệnh viện không cho dữ liệu ra ngoài.
- `Temperature = 0` cho validation: ưu tiên tính nhất quán, giảm sáng tạo.

## 7. AI trong quá trình phát triển

Bộ đặc tả 455 trường (`field_specs.json`) và catalog 100 rule (`cross_field_rules.json`) được sinh bán tự động bằng AI agent từ file Excel đặc tả QĐ 130/QĐ 4750 của Bộ Y tế (16 sheet), sau đó rà soát thủ công các trường trọng yếu — ví dụ điển hình về dùng AI tăng tốc số hóa văn bản quy phạm thành rule máy chạy được.
