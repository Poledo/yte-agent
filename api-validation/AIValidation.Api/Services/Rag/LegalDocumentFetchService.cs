using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AIValidation.Api.Services.Rag;

/// <summary>Một văn bản tìm thấy trên CSDL quốc gia về văn bản pháp luật (vbpl.vn).</summary>
public record LegalDocSummary
{
    /// <summary>Định danh trên vbpl: văn bản cũ là số ("181847"), mới là GUID ("4fda4da0-...").</summary>
    public required string ItemId { get; init; }
    public required string Title { get; init; }
    public string? DocNumber { get; init; }
    public DateTime? IssuedDate { get; init; }

    /// <summary>Ngày có hiệu lực (nếu vbpl trả về).</summary>
    public DateTime? EffectiveDate { get; init; }

    /// <summary>Ngày hết hiệu lực (null = còn hiệu lực).</summary>
    public DateTime? ExpiryDate { get; init; }

    /// <summary>Link toàn văn trên vbpl.vn (mở xem trước khi quyết định nạp).</summary>
    public required string Url { get; init; }
}

/// <summary>
/// Tìm và tải TOÀN VĂN (dạng chữ, không phải scan) văn bản pháp luật từ vbpl.vn —
/// Cổng CSDL quốc gia về văn bản quy phạm pháp luật (công khai, miễn phí).
/// Người dùng chọn lĩnh vực/từ khóa + khoảng thời gian → danh sách → tự quyết nạp
/// văn bản nào vào kho tri thức.
///
/// Lưu ý: đây là đọc HTML của trang công khai — nếu vbpl.vn đổi giao diện thì
/// chỉnh lại các Regex trong file này.
/// </summary>
public interface ILegalDocumentFetchService
{
    /// <summary>
    /// Tìm văn bản theo từ khóa (tiêu đề), lọc thêm theo khoảng ngày ban hành nếu truyền.
    /// effStatus: "active" (còn hiệu lực) | "expired" (hết hiệu lực) | null/"all" (tất cả).
    /// </summary>
    Task<List<LegalDocSummary>> SearchAsync(
        string keyword, DateTime? from, DateTime? to, int page = 1,
        string? effStatus = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tải toàn văn một văn bản theo ItemID (số hoặc GUID). preferredUrl: URL trang chi
    /// tiết đã biết (từ kết quả tìm) — thử trước các mẫu đoán. Ném
    /// InvalidOperationException nếu không lấy được nội dung.
    /// </summary>
    Task<string> FetchFullTextAsync(string itemId, string? preferredUrl = null, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public partial class LegalDocumentFetchService : ILegalDocumentFetchService
{
    private const string BaseUrl = "https://vbpl.vn";

    /// <summary>
    /// Các mẫu URL tìm kiếm sẽ THỬ LẦN LƯỢT (site cơ quan hay đổi cấu trúc đường dẫn).
    /// Placeholder: {keyword}, {page}. Mẫu chạy được sẽ được nhớ lại cho các lần sau.
    /// Người dùng có thể ghi đè bằng cấu hình "Legal:SearchUrlTemplate" — mở vbpl.vn
    /// trên trình duyệt, tìm thử một lần, copy URL trên thanh địa chỉ và thay từ khóa
    /// bằng {keyword}.
    /// </summary>
    private static readonly string[] SearchUrlTemplates =
    {
        $"{BaseUrl}/TW/Pages/vbpq-timkiem.aspx?Keyword={{keyword}}&SearchIn=Title,Title1&IsRec=1&RowPerPage=50&Page={{page}}",
        $"{BaseUrl}/Pages/vbpq-timkiem.aspx?Keyword={{keyword}}&SearchIn=Title,Title1&IsRec=1&RowPerPage=50&Page={{page}}",
        $"{BaseUrl}/TW/Pages/vanban.aspx?Keyword={{keyword}}&RowPerPage=50&Page={{page}}",
        $"{BaseUrl}/tim-kiem?q={{keyword}}&page={{page}}",
    };

    /// <summary>
    /// Các mẫu URL toàn văn. Placeholder: {itemId}. Ghi đè bằng "Legal:FullTextUrlTemplate".
    /// Trang mới có dạng /van-ban/chi-tiet/{slug}--{ItemID} — nhiều framework chỉ route
    /// theo số ID ở đuôi nên thử với slug giả trước; các mẫu .aspx cũ để dự phòng.
    /// </summary>
    private static readonly string[] FullTextUrlTemplates =
    {
        $"{BaseUrl}/van-ban/chi-tiet/van-ban--{{itemId}}",
        $"{BaseUrl}/TW/Pages/vbpq-toanvan.aspx?ItemID={{itemId}}",
        $"{BaseUrl}/Pages/vbpq-toanvan.aspx?ItemID={{itemId}}",
    };

    /// <summary>Mẫu đã chạy được — nhớ lại để các lần sau không phải dò.</summary>
    private static string? _workingSearchTemplate;
    private static string? _workingFullTextTemplate;

    /// <summary>
    /// Mẫu URL đã trả 404 trong phiên chạy này — site bản mới không còn các trang .aspx
    /// cũ, nhớ lại để các lần tìm sau bỏ qua luôn (đỡ 3–4 request + exception vô ích
    /// mỗi lần). Reset khi restart app — phòng khi site đổi ngược lại.
    /// </summary>
    private static readonly HashSet<string> DeadTemplates = new();
    private static readonly object DeadTemplatesLock = new();

    private static bool IsDeadTemplate(string template)
    {
        lock (DeadTemplatesLock) return DeadTemplates.Contains(template);
    }

    private static void MarkTemplateIfDead(string template, HttpRequestException ex)
    {
        if (ex.Message.Contains("HTTP 404"))
        {
            lock (DeadTemplatesLock) DeadTemplates.Add(template);
        }
    }

    /// <summary>
    /// Mã Next.js server action trên vbpl.vn (bắt từ DevTools: header "next-action").
    /// Các mã này ĐỔI mỗi khi vbpl.vn redeploy — khi đó lấy mã mới từ DevTools và dán
    /// vào cấu hình "Legal:NextAction" / "Legal:DetailNextAction" / "Legal:FileNextAction",
    /// không cần sửa code.
    /// </summary>
    private const string DefaultNextAction = "c529d164f28418e5898a834422629e64c6816af1";

    /// <summary>Action lấy CHI TIẾT văn bản — body ["itemId"].</summary>
    private const string DefaultDetailNextAction = "ae8ddf86413544ad267f753f6b61a5f71dd260b2";

    /// <summary>Action xin link tải FILE GỐC — body [{bucketName, folderName, objectName}].</summary>
    private const string DefaultFileNextAction = "11972afaf856c3e135f5835fb529ce24ba23bee2";

    /// <summary>
    /// Action trả NỘI DUNG (HTML đẹp) của tab "Nội dung" — body ["itemId"], nhưng phải
    /// POST vào ĐÚNG URL trang chi tiết kèm header next-router-state-tree (chứa slug).
    /// Ghi đè bằng "Legal:ContentNextAction" khi vbpl.vn redeploy đổi mã.
    /// </summary>
    private const string DefaultContentNextAction = "94635012466e8fede44782d4237c10fe75501920";

    private const string BrowserUserAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly IDocumentTextExtractor _textExtractor;
    private readonly ILogger<LegalDocumentFetchService> _logger;

    public LegalDocumentFetchService(
        HttpClient http,
        IConfiguration config,
        IDocumentTextExtractor textExtractor,
        ILogger<LegalDocumentFetchService> logger)
    {
        _http = http ?? throw new ArgumentNullException(nameof(http));
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _textExtractor = textExtractor ?? throw new ArgumentNullException(nameof(textExtractor));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// POST một server action của vbpl.vn, trả về response dạng flight (text/x-component).
    /// actionUrl: URL để POST (mặc định trang chủ; action NỘI DUNG đòi đúng URL trang chi tiết).
    /// routerStateTree: giá trị header next-router-state-tree (action nội dung yêu cầu).
    /// </summary>
    private async Task<string> PostServerActionAsync(
        string nextAction, string body, CancellationToken cancellationToken,
        string? actionUrl = null, string? routerStateTree = null)
    {
        var url = actionUrl ?? BaseUrl + "/";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.TryAddWithoutValidation("next-action", nextAction);
        request.Headers.TryAddWithoutValidation("accept", "text/x-component");
        request.Headers.TryAddWithoutValidation("origin", BaseUrl);
        if (routerStateTree != null)
        {
            request.Headers.TryAddWithoutValidation("next-router-state-tree", routerStateTree);
        }
        request.Headers.Referrer = new Uri(url);
        request.Headers.UserAgent.ParseAdd(BrowserUserAgent);
        request.Content = new StringContent(body, Encoding.UTF8, "text/plain");

        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Server action {nextAction[..8]}… trả về HTTP {(int)response.StatusCode} ({response.StatusCode}).");
        }
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    [GeneratedRegex(@"vbpq-toanvan\.aspx\?ItemID=(\d+)[^""']*[""'][^>]*>(.*?)</a>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex ResultLinkRegex();

    [GeneratedRegex(@"Ban hành[^\d]{0,20}(\d{2}/\d{2}/\d{4})", RegexOptions.IgnoreCase)]
    private static partial Regex IssuedDateRegex();

    /// <summary>Số hiệu kiểu "75/2023/NĐ-CP", "4210/QĐ-BYT", "04/2021/TT-BYT".</summary>
    [GeneratedRegex(@"\b(\d+[A-Za-z]?/(?:\d{4}/)?[A-ZĐĂÂÊÔƠƯ][A-ZĐĂÂÊÔƠƯa-z]*(?:-[A-ZĐĂÂÊÔƠƯ][A-Za-zĐ]*)+)\b")]
    private static partial Regex DocNumberRegex();

    public async Task<List<LegalDocSummary>> SearchAsync(
        string keyword, DateTime? from, DateTime? to, int page = 1,
        string? effStatus = null, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(keyword);
        keyword = CleanKeyword(keyword);
        page = Math.Max(1, page);

        // Thứ tự thử: mẫu người dùng cấu hình → mẫu đã từng chạy được → các mẫu mặc định
        var templates = new List<string>();
        var configured = _config["Legal:SearchUrlTemplate"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            templates.Add(configured);
        }
        if (_workingSearchTemplate != null)
        {
            templates.Add(_workingSearchTemplate);
        }
        templates.AddRange(SearchUrlTemplates);
        templates = templates.Distinct().ToList();

        var attempts = new List<string>();

        // Cách 1 (site hiện tại): gọi Next.js server action của ô tìm kiếm.
        // Danh sách RỖNG cũng là kết quả hợp lệ ("không văn bản nào khớp") — chỉ khi
        // trả null (cơ chế hỏng) mới rơi xuống các mẫu URL dự phòng.
        var viaAction = await TrySearchViaServerActionAsync(keyword, page, from, to, attempts, cancellationToken);
        if (viaAction != null)
        {
            // Dán nguyên tiêu đề dài mà 0 kết quả? Thử lại bằng SỐ HIỆU trong từ khóa
            // ("87/2026/TT-BCA") — tìm theo số hiệu gần như luôn khớp trên vbpl.
            if (viaAction.Count == 0)
            {
                var docNum = Regex.Match(keyword, @"\b\d{1,4}/\d{4}/[A-ZĐ][A-ZĐ0-9\-]*");
                if (docNum.Success && docNum.Value.Length < keyword.Trim().Length)
                {
                    var retry = await TrySearchViaServerActionAsync(docNum.Value, page, from, to, attempts, cancellationToken);
                    if (retry is { Count: > 0 })
                    {
                        _logger.LogInformation(
                            "Từ khóa dài 0 kết quả — tìm lại bằng số hiệu \"{DocNum}\" ra {Count} văn bản",
                            docNum.Value, retry.Count);
                        return FilterByEffStatus(retry, effStatus);
                    }
                }
            }
            return FilterByEffStatus(viaAction, effStatus);
        }

        // Cách 2 (dự phòng giao diện cũ / cấu hình tay): các mẫu URL GET
        foreach (var template in templates)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (IsDeadTemplate(template))
            {
                continue; // đã 404 trong phiên này — khỏi gõ cửa lại
            }
            var url = template
                .Replace("{keyword}", Uri.EscapeDataString(keyword.Trim()))
                .Replace("{page}", page.ToString());

            string html;
            try
            {
                html = await GetHtmlAsync(url, cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                MarkTemplateIfDead(template, ex);
                attempts.Add(ex.Message);
                continue;
            }

            var parsed = ParseSearchResults(html, from, to);
            if (parsed.Count > 0)
            {
                _workingSearchTemplate = template;
                _logger.LogInformation("Tìm vbpl.vn \"{Keyword}\" (trang {Page}) qua mẫu {Template} → {Count} văn bản",
                    keyword, page, template, parsed.Count);
                return FilterByEffStatus(parsed, effStatus);
            }
            attempts.Add($"HTTP 200 nhưng không đọc được kết quả nào từ {url} (trang trả về {html.Length} ký tự — cấu trúc có thể đã đổi).");
            _logger.LogWarning("vbpl.vn {Url}: 200 nhưng parse được 0 kết quả. 500 ký tự đầu: {Head}",
                url, html.Length > 500 ? html[..500] : html);
        }

        // Chẩn đoán thêm: trang chủ có vào được không? Phân biệt "sai đường dẫn"
        // (trang chủ 200, trang tìm 404) với "site chặn request không phải trình duyệt"
        // (trang chủ cũng 404/403 dù trình duyệt mở bình thường).
        try
        {
            var home = await GetHtmlAsync(BaseUrl + "/", cancellationToken);
            attempts.Add($"[Chẩn đoán] Trang chủ {BaseUrl} vào ĐƯỢC (HTTP 200, {home.Length} ký tự) → các đường dẫn tìm kiếm ở trên sai/đã đổi.");
        }
        catch (HttpRequestException ex)
        {
            attempts.Add($"[Chẩn đoán] Trang chủ {BaseUrl} cũng lỗi: {ex.Message} → khả năng site chặn truy cập tự động (WAF) hoặc mạng máy chủ không ra được vbpl.vn.");
        }

        throw new HttpRequestException(
            "Không lấy được kết quả từ vbpl.vn sau khi thử các đường dẫn:\n- " + string.Join("\n- ", attempts)
            + "\nCách khắc phục nhanh: mở vbpl.vn trên trình duyệt, tìm thử một từ khóa, copy URL trên thanh địa chỉ, "
            + "thay từ khóa bằng {keyword} rồi dán vào cấu hình appsettings \"Legal:SearchUrlTemplate\" và khởi động lại API.");
    }

    /// <summary>
    /// Làm sạch từ khóa COPY từ trang web: đưa dấu tiếng Việt về dạng dựng sẵn (NFC —
    /// text copy hay ở dạng tổ hợp NFD, nhìn giống hệt nhưng khác byte nên server tìm
    /// không khớp), đổi các loại "dấu cách tàng hình" (NBSP, zero-width...) thành dấu
    /// cách thường, gộp dấu cách thừa.
    /// </summary>
    private static string CleanKeyword(string keyword)
    {
        var normalized = keyword.Normalize(NormalizationForm.FormC);
        var sb = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            sb.Append(c is ' ' or ' ' or ' ' or ' ' or ' ' or ' '
                or ' ' or ' ' or ' ' or ' ' or ' ' or ' ' or ' '
                or '​' or ' ' or ' ' or '　' or '﻿' or '\t'
                ? ' ' : c);
        }
        // Lưới an toàn: \s của .NET phủ mọi ký tự phân cách Unicode (\p{Z}) —
        // loại whitespace lạ nào chưa liệt kê ở trên cũng về dấu cách thường
        var flat = Regex.Replace(sb.ToString(), @"\s", " ");
        return Regex.Replace(flat, @" {2,}", " ").Trim();
    }

    /// <summary>
    /// Lọc theo trạng thái hiệu lực: "expired" = đã quá ngày hết hiệu lực;
    /// "active" = chưa hết (kể cả văn bản không rõ ngày hết hiệu lực); còn lại = tất cả.
    /// </summary>
    private static List<LegalDocSummary> FilterByEffStatus(List<LegalDocSummary> results, string? effStatus)
    {
        var now = DateTime.Now;
        return effStatus?.ToLowerInvariant() switch
        {
            "active" => results.Where(r => r.ExpiryDate == null || r.ExpiryDate > now).ToList(),
            "expired" => results.Where(r => r.ExpiryDate != null && r.ExpiryDate <= now).ToList(),
            _ => results
        };
    }

    /// <summary>
    /// Gọi ô tìm kiếm của vbpl.vn bản mới (Next.js server action):
    /// POST vào trang chủ với header "next-action" + body JSON bọc mảng
    /// (bắt được từ DevTools). Trả null nếu thất bại — sẽ rơi xuống cách dự phòng.
    /// </summary>
    private async Task<List<LegalDocSummary>?> TrySearchViaServerActionAsync(
        string keyword, int page, DateTime? from, DateTime? to,
        List<string> attempts, CancellationToken cancellationToken)
    {
        var actionUrl = _config["Legal:SearchActionUrl"];
        if (string.IsNullOrWhiteSpace(actionUrl))
        {
            actionUrl = BaseUrl + "/";
        }
        var nextAction = _config["Legal:NextAction"];
        if (string.IsNullOrWhiteSpace(nextAction))
        {
            nextAction = DefaultNextAction;
        }

        try
        {
            // Mồi cookie phiên/WAF bằng một lần GET trang chủ (lỗi thì bỏ qua)
            try
            {
                await GetHtmlAsync(BaseUrl + "/", cancellationToken);
            }
            catch (HttpRequestException)
            {
                // vẫn thử POST — có server không cần cookie
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, actionUrl);
            request.Headers.TryAddWithoutValidation("next-action", nextAction);
            request.Headers.TryAddWithoutValidation("accept", "text/x-component");
            request.Headers.TryAddWithoutValidation("origin", BaseUrl);
            request.Headers.Referrer = new Uri(BaseUrl + "/");
            request.Headers.UserAgent.ParseAdd(BrowserUserAgent);
            request.Content = new StringContent(BuildActionBody(keyword, page), Encoding.UTF8, "text/plain");

            using var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                attempts.Add($"Server action {actionUrl} trả về HTTP {(int)response.StatusCode} ({response.StatusCode}).");
                return null;
            }

            var flight = await response.Content.ReadAsStringAsync(cancellationToken);
            var results = ParseFlightResponse(flight, from, to);
            if (results.Count == 0)
            {
                // Phân biệt "tìm ĐÚNG nhưng không văn bản nào khớp" (flight hợp lệ, total = 0
                // / mảng rỗng) với "site đổi cấu trúc" — 0 kết quả thật thì trả danh sách
                // rỗng để UI hiện "Không tìm thấy" thay vì báo lỗi um sùm.
                if (Regex.IsMatch(flight, @"""total\w*""\s*:\s*0(?![\d.])", RegexOptions.IgnoreCase)
                    || Regex.IsMatch(flight, @"""(?:items|data|listData|results?|docs?)""\s*:\s*\[\s*\]", RegexOptions.IgnoreCase))
                {
                    _logger.LogInformation("Tìm vbpl.vn \"{Keyword}\" (trang {Page}): 0 văn bản khớp", keyword, page);
                    return results;
                }

                // Kèm trích đoạn response vào thông báo — lần lỗi sau nhìn là biết vbpl
                // trả về gì (0 kết quả kiểu mới? lỗi? đổi cấu trúc?) mà vá cho trúng.
                var snippet = (flight.Length > 1400 ? flight[..1400] + "…" : flight)
                    .Replace('\r', ' ').Replace('\n', ' ');
                attempts.Add(
                    $"Server action trả HTTP 200 nhưng không đọc được kết quả nào ({flight.Length} ký tự): {snippet} "
                    + "— nếu vbpl.vn vừa cập nhật, lấy lại mã next-action từ DevTools (F12 → Network → request tìm kiếm) "
                    + "và dán vào cấu hình \"Legal:NextAction\".");
                _logger.LogWarning("Flight response không parse được. 800 ký tự đầu: {Head}",
                    flight.Length > 800 ? flight[..800] : flight);
                return null;
            }

            _logger.LogInformation("Tìm vbpl.vn \"{Keyword}\" (trang {Page}) qua server action → {Count} văn bản",
                keyword, page, results.Count);
            return results;
        }
        catch (HttpRequestException ex)
        {
            attempts.Add("Server action lỗi kết nối: " + ex.Message);
            return null;
        }
    }

    /// <summary>Body của server action — đúng cấu trúc bắt được từ trình duyệt ("$undefined" là quy ước của Next.js).</summary>
    private static string BuildActionBody(string keyword, int page)
    {
        var payload = new Dictionary<string, object>
        {
            ["pageNumber"] = page,
            ["pageSize"] = 50,
            ["keyword"] = keyword.Trim(),
            ["groupVbpl"] = "$undefined",
            ["documentName"] = "$undefined",
            ["docNum"] = "$undefined",
            ["docType"] = "$undefined",
            ["majorTypeIds"] = "$undefined",
            ["fieldTypeIds"] = "$undefined",
            ["agencyIds"] = "$undefined",
            ["effStatus"] = "$undefined",
            ["status"] = "$undefined",
            ["issueDateFrom"] = "$undefined",
            ["issueDateTo"] = "$undefined",
            ["effToFrom"] = "$undefined",
            ["effToEnd"] = "$undefined",
            ["administrativeUnit"] = "$undefined",
            ["agencyLevel"] = "$undefined",
            ["documentType"] = "$undefined",
            ["optionDoc"] = "title",
            ["matchMode"] = "all_words",
            ["effFromBegin"] = "$undefined",
            ["effFromEnd"] = "$undefined"
        };
        return JsonSerializer.Serialize(new[] { payload });
    }

    /// <summary>
    /// Đọc response dạng "flight" của Next.js (từng dòng "n:{json}"): thử parse JSON
    /// từng dòng rồi quét ĐỆ QUY tìm các object trông như một văn bản (có id + tiêu đề)
    /// — không phụ thuộc tên field chính xác nên chịu được site đổi cấu trúc nhẹ.
    /// </summary>
    private static List<LegalDocSummary> ParseFlightResponse(string flight, DateTime? from, DateTime? to)
    {
        var results = new List<LegalDocSummary>();
        var seen = new HashSet<string>();

        foreach (var line in flight.Split('\n'))
        {
            var colon = line.IndexOf(':');
            if (colon <= 0 || colon >= line.Length - 1)
            {
                continue;
            }
            var payload = line[(colon + 1)..].Trim();
            if (payload.Length < 2 || (payload[0] != '{' && payload[0] != '['))
            {
                continue;
            }
            try
            {
                using var doc = JsonDocument.Parse(payload);
                CollectDocObjects(doc.RootElement, results, seen);
            }
            catch (JsonException)
            {
                // dòng không phải JSON thuần (metadata của flight) — bỏ qua
            }
        }

        if (from != null)
        {
            results = results.Where(r => r.IssuedDate == null || r.IssuedDate >= from).ToList();
        }
        if (to != null)
        {
            results = results.Where(r => r.IssuedDate == null || r.IssuedDate <= to).ToList();
        }
        return results;
    }

    private static readonly string[] IdFields = { "itemId", "itemID", "id", "documentId", "docId" };
    private static readonly string[] TitleFields = { "title", "documentName", "name", "tenVanBan", "docName", "subject" };
    private static readonly string[] DocNumFields = { "docNum", "documentNumber", "soHieu", "symbol", "number" };
    private static readonly string[] DateFields = { "issueDate", "ngayBanHanh", "publishDate", "issuedDate", "promulgationDate" };
    private static readonly string[] EffectiveDateFields = { "effDate", "effectiveDate", "ngayHieuLuc", "effFromDate", "effectDate", "effFrom" };
    private static readonly string[] ExpiryDateFields = { "expiryDate", "expiredDate", "ngayHetHieuLuc", "effToDate", "expireDate", "effTo" };
    private static readonly string[] UrlFields = { "url", "slug", "path", "link", "detailUrl" };

    /// <summary>Parse một chuỗi ngày (ISO hoặc dd/MM/yyyy).</summary>
    private static bool TryParseDate(string? raw, out DateTime date)
    {
        return DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out date)
            || DateTime.TryParseExact(raw, "dd/MM/yyyy", null,
                System.Globalization.DateTimeStyles.None, out date);
    }

    /// <summary>Đọc ngày từ danh sách field ứng viên.</summary>
    private static DateTime? TryReadDate(JsonElement obj, string[] fields)
    {
        foreach (var field in fields)
        {
            if (obj.TryGetProperty(field, out var v) && v.ValueKind == JsonValueKind.String
                && TryParseDate(v.GetString(), out var d))
            {
                return d;
            }
        }
        return null;
    }

    /// <summary>Quét đệ quy JSON, nhặt các object có (id + tiêu đề) làm một văn bản.</summary>
    private static void CollectDocObjects(JsonElement element, List<LegalDocSummary> results, HashSet<string> seen)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    CollectDocObjects(item, results, seen);
                }
                break;

            case JsonValueKind.Object:
                TryMapDocObject(element, results, seen);
                foreach (var property in element.EnumerateObject())
                {
                    CollectDocObjects(property.Value, results, seen);
                }
                break;
        }
    }

    private static void TryMapDocObject(JsonElement obj, List<LegalDocSummary> results, HashSet<string> seen)
    {
        // Định danh: văn bản cũ là SỐ (181847), bản mới là GUID ("4fda4da0-80ec-...") —
        // nhận cả hai; chuỗi phải trông như số dài hoặc GUID để không vớ nhầm id rác.
        string? id = null;
        foreach (var field in IdFields)
        {
            if (obj.TryGetProperty(field, out var v))
            {
                if (v.ValueKind == JsonValueKind.Number && v.TryGetInt64(out var n) && n > 0)
                {
                    id = n.ToString();
                    break;
                }
                if (v.ValueKind == JsonValueKind.String)
                {
                    var s = v.GetString()?.Trim() ?? "";
                    if (Regex.IsMatch(s, @"^\d{3,}$") || Regex.IsMatch(s, @"^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$"))
                    {
                        id = s;
                        break;
                    }
                }
            }
        }
        if (id == null)
        {
            // Không có field id dùng được — vớt từ slug/url ("...--181847" / "...--{guid}")
            foreach (var prop in obj.EnumerateObject())
            {
                if (prop.Value.ValueKind != JsonValueKind.String)
                {
                    continue;
                }
                var raw = prop.Value.GetString() ?? "";
                var slugMatch = Regex.Match(raw, @"--(\d{4,}|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\b");
                if (!slugMatch.Success)
                {
                    slugMatch = Regex.Match(raw, @"ItemID=(\d+)", RegexOptions.IgnoreCase);
                }
                if (slugMatch.Success)
                {
                    id = slugMatch.Groups[1].Value;
                    break;
                }
            }
        }
        if (string.IsNullOrEmpty(id))
        {
            return;
        }

        string? title = null;
        foreach (var field in TitleFields)
        {
            if (obj.TryGetProperty(field, out var v) && v.ValueKind == JsonValueKind.String)
            {
                var t = v.GetString()?.Trim();
                if (!string.IsNullOrEmpty(t) && t.Length >= 5) { title = t; break; }
            }
        }
        if (title == null || seen.Contains(id))
        {
            return;
        }

        string? docNum = null;
        foreach (var field in DocNumFields)
        {
            if (obj.TryGetProperty(field, out var v) && v.ValueKind == JsonValueKind.String)
            {
                docNum = v.GetString()?.Trim();
                if (!string.IsNullOrEmpty(docNum)) break;
            }
        }

        var issued = TryReadDate(obj, DateFields);
        var effective = TryReadDate(obj, EffectiveDateFields);
        var expiry = TryReadDate(obj, ExpiryDateFields);

        // Heuristic bổ sung: tên field của vbpl có thể khác danh sách đoán sẵn —
        // quét MỌI property dạng ngày và phân loại theo tên (bắt được mọi biến thể
        // "ngayHetHieuLuc", "effTo", "expireDate", "hieuLucTuNgay"...).
        // Thứ tự xét: HẾT hiệu lực trước ("hethieuluc" chứa cả "hieuluc").
        if (issued == null || effective == null || expiry == null)
        {
            foreach (var prop in obj.EnumerateObject())
            {
                if (prop.Value.ValueKind != JsonValueKind.String
                    || !TryParseDate(prop.Value.GetString(), out var d))
                {
                    continue;
                }
                var name = prop.Name.ToLowerInvariant();

                if (expiry == null
                    && (name.Contains("hethieuluc") || name.Contains("expir")
                        || (name.Contains("eff") && (name.Contains("to") || name.Contains("end")))))
                {
                    expiry = d;
                }
                else if (effective == null
                    && (name.Contains("hieuluc")
                        || (name.Contains("eff") && (name.Contains("from") || name.Contains("begin") || name.Contains("start")))
                        || name is "effdate" or "effectdate"))
                {
                    effective = d;
                }
                else if (issued == null
                    && (name.Contains("banhanh") || name.Contains("issue")
                        || name.Contains("publish") || name.Contains("promulgat")))
                {
                    issued = d;
                }
            }
        }

        string? url = null;
        foreach (var field in UrlFields)
        {
            if (obj.TryGetProperty(field, out var v) && v.ValueKind == JsonValueKind.String)
            {
                var u = v.GetString()?.Trim();
                if (!string.IsNullOrEmpty(u))
                {
                    url = u.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                        ? u
                        : BaseUrl + (u.StartsWith('/') ? u : "/" + u);
                    break;
                }
            }
        }

        // Chặn object metadata "nhìn giống văn bản": response còn chứa loại văn bản
        // ("Thông tư"), trạng thái ("Còn hiệu lực")... cũng có id GUID + tên. Văn bản
        // THẬT luôn có thêm ít nhất một dấu hiệu: ngày, số hiệu (kể cả trong tiêu đề),
        // hoặc đường dẫn chi tiết.
        var docNumFromTitle = DocNumberRegex().Match(title) is { Success: true } m ? m.Groups[1].Value : null;
        if (docNum == null && docNumFromTitle == null
            && issued == null && effective == null && expiry == null && url == null)
        {
            return;
        }

        seen.Add(id);
        results.Add(new LegalDocSummary
        {
            ItemId = id,
            Title = title,
            DocNumber = docNum ?? docNumFromTitle,
            IssuedDate = issued,
            EffectiveDate = effective,
            ExpiryDate = expiry,
            Url = url ?? $"{BaseUrl}/van-ban/chi-tiet/van-ban--{id}"
        });
    }

    /// <summary>Bóc danh sách văn bản từ HTML trang kết quả tìm kiếm.</summary>
    private List<LegalDocSummary> ParseSearchResults(string html, DateTime? from, DateTime? to)
    {
        var results = new List<LegalDocSummary>();
        var seen = new HashSet<string>();

        foreach (Match match in ResultLinkRegex().Matches(html))
        {
            var itemId = match.Groups[1].Value;
            if (!seen.Add(itemId))
            {
                continue;
            }

            var title = HtmlToText(match.Groups[2].Value).Trim();
            if (title.Length < 5)
            {
                continue; // link icon/ảnh, không phải tiêu đề
            }

            // Ngày ban hành thường nằm trong khối mô tả ngay sau tiêu đề
            DateTime? issued = null;
            var tail = html[match.Index..Math.Min(html.Length, match.Index + 1200)];
            var dateMatch = IssuedDateRegex().Match(tail);
            if (dateMatch.Success
                && DateTime.TryParseExact(dateMatch.Groups[1].Value, "dd/MM/yyyy", null,
                    System.Globalization.DateTimeStyles.None, out var parsed))
            {
                issued = parsed;
            }

            var docNumber = DocNumberRegex().Match(title) is { Success: true } dn ? dn.Groups[1].Value : null;

            results.Add(new LegalDocSummary
            {
                ItemId = itemId,
                Title = title,
                DocNumber = docNumber,
                IssuedDate = issued,
                Url = $"{BaseUrl}/TW/Pages/vbpq-toanvan.aspx?ItemID={itemId}"
            });
        }

        // Lọc theo khoảng ngày ban hành — văn bản KHÔNG đọc được ngày vẫn giữ lại
        // (để người dùng tự xem), chỉ loại những cái chắc chắn ngoài khoảng.
        if (from != null)
        {
            results = results.Where(r => r.IssuedDate == null || r.IssuedDate >= from).ToList();
        }
        if (to != null)
        {
            results = results.Where(r => r.IssuedDate == null || r.IssuedDate <= to).ToList();
        }

        return results;
    }

    public async Task<string> FetchFullTextAsync(string itemId, string? preferredUrl = null, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(itemId);
        var actionAttempts = new List<string>();

        // Cách 0 (nhanh nhất với site hiện tại): GET trang chi tiết kèm "?tabs=toan-van" —
        // Next.js nhúng sẵn dữ liệu của tab (kể cả toàn văn) vào HTML trong các khối
        // <script>self.__next_f.push([1,"..."])</script>, dù DOM hiển thị chỉ là khung.
        var viaPage = await TryFetchViaToanVanPageAsync(itemId, preferredUrl, actionAttempts, cancellationToken);
        if (viaPage != null)
        {
            return viaPage;
        }

        // Cách 1: server action chi tiết văn bản; không có text thì
        // xin link file gốc (PDF/DOC) tải về và trích text/OCR
        var viaAction = await TryFetchViaDetailActionAsync(itemId, actionAttempts, cancellationToken);
        if (viaAction != null)
        {
            return viaAction;
        }

        // Cách 2 (dự phòng): URL chi tiết đã biết → mẫu cấu hình → mẫu đã chạy được → mẫu mặc định
        var templates = new List<string>();
        if (!string.IsNullOrWhiteSpace(preferredUrl))
        {
            templates.Add(preferredUrl);
        }
        var configured = _config["Legal:FullTextUrlTemplate"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            templates.Add(configured);
        }
        if (_workingFullTextTemplate != null)
        {
            templates.Add(_workingFullTextTemplate);
        }
        templates.AddRange(FullTextUrlTemplates);
        templates = templates.Distinct().ToList();

        var attempts = new List<string>(actionAttempts);
        foreach (var template in templates)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (IsDeadTemplate(template))
            {
                continue; // đã 404 trong phiên này — khỏi gõ cửa lại
            }
            var url = template.Replace("{itemId}", itemId);

            string html;
            try
            {
                html = await GetHtmlAsync(url, cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                MarkTemplateIfDead(template, ex);
                attempts.Add(ex.Message);
                continue;
            }

            // Toàn văn nằm trong khối "toanvancontent"/"fulltext" (tùy phiên bản trang);
            // không thấy thì lấy cả trang — RAG chịu được ít nhiễu menu.
            var content = ExtractBlock(html, "toanvancontent")
                ?? ExtractBlock(html, "fulltext")
                ?? html;
            var text = HtmlToText(content);

            // Trang Next.js trả KHUNG giao diện (nội dung nạp bằng JS sau) — nhận diện
            // placeholder để không lưu nhầm rác "Đang tải dữ liệu..." làm toàn văn.
            var isShell = text.Contains("Đang tải dữ liệu") || text.Contains("Đang tải nội dung");
            if (!isShell && text.Length >= 1000)
            {
                _workingFullTextTemplate = template;
                return text;
            }
            attempts.Add(isShell
                ? $"Trang {url} chỉ trả khung giao diện (nội dung nạp bằng JavaScript) — bỏ qua."
                : $"Trang {url} trả về nội dung quá ngắn ({text.Length} ký tự) — có thể văn bản chỉ có bản PDF scan.");
        }

        throw new InvalidOperationException(
            $"Không lấy được toàn văn ItemID {itemId} từ vbpl.vn:\n- " + string.Join("\n- ", attempts));
    }

    /// <summary>
    /// Lấy toàn văn qua server action chi tiết của vbpl.vn bản mới:
    /// 1. POST action chi tiết với body ["itemId"] → tìm khối text/HTML dài trong response;
    /// 2. Không có text → nhặt danh sách file đính kèm (objectName/.pdf/.docx),
    ///    POST action file để xin link tải, tải file về và trích text (PDF scan tự OCR).
    /// Trả null nếu mọi đường đều thất bại (rơi xuống cách dự phòng GET).
    /// </summary>
    private async Task<string?> TryFetchViaDetailActionAsync(
        string itemId, List<string> attempts, CancellationToken cancellationToken)
    {
        var detailAction = _config["Legal:DetailNextAction"];
        if (string.IsNullOrWhiteSpace(detailAction))
        {
            detailAction = DefaultDetailNextAction;
        }
        var fileAction = _config["Legal:FileNextAction"];
        if (string.IsNullOrWhiteSpace(fileAction))
        {
            fileAction = DefaultFileNextAction;
        }

        string flight;
        try
        {
            // Mồi cookie phiên/WAF (lỗi thì bỏ qua)
            try { await GetHtmlAsync(BaseUrl + "/", cancellationToken); } catch (HttpRequestException) { }

            flight = await PostServerActionAsync(
                detailAction,
                JsonSerializer.Serialize(new[] { itemId }),
                cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            attempts.Add("Action chi tiết lỗi: " + ex.Message
                + " (site đổi bản build thì lấy lại mã next-action của request chi tiết, dán vào \"Legal:DetailNextAction\").");
            return null;
        }

        // 1) Tìm khối VĂN BẢN trong response: quét cả chuỗi trong JSON LẪN các
        //    text-block dạng "id:Thexlen,<văn bản thô>" — chỉ nhận khối trông như
        //    văn bản pháp luật thật (không nhận script/layout).
        var files = new List<(string Bucket, string Folder, string Name)>();
        var candidates = MineFlightCandidates(flight, itemId, files);
        var text = SelectLegalText(candidates);
        if (text != null)
        {
            _logger.LogInformation("Toàn văn ItemID {ItemId} lấy từ action chi tiết ({Length} ký tự)", itemId, text.Length);
            return text;
        }
        attempts.Add($"Action chi tiết trả về {candidates.Count} khối dữ liệu nhưng không khối nào là văn bản ({files.Count} file đính kèm).");

        // 2) Tải file gốc đính kèm
        return await TryDownloadFilesAsync(itemId, files, fileAction, attempts, cancellationToken);
    }

    /// <summary>
    /// Tải các file gốc đính kèm và trích text (PDF scan tự OCR) — ưu tiên định dạng
    /// có chữ (.docx/.doc) trước PDF. Trả null nếu không file nào ra được text đủ dài.
    /// </summary>
    private async Task<string?> TryDownloadFilesAsync(
        string itemId,
        List<(string Bucket, string Folder, string Name)> files,
        string fileAction,
        List<string> attempts,
        CancellationToken cancellationToken)
    {
        foreach (var file in files
            .OrderBy(f => Path.GetExtension(f.Name).ToLowerInvariant() switch
            {
                ".docx" => 0, ".doc" => 1, ".pdf" => 2, _ => 3
            }))
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var fileFlight = await PostServerActionAsync(
                    fileAction,
                    JsonSerializer.Serialize(new[]
                    {
                        new { bucketName = file.Bucket, folderName = file.Folder, objectName = file.Name }
                    }),
                    cancellationToken);

                // vbpl trả THẲNG nội dung file dạng BASE64 trong text-block của flight
                // ("JVBERi..." = "%PDF-"), không phải link — giải mã trực tiếp trước.
                var bytes = TryDecodeBase64File(fileFlight);
                if (bytes == null)
                {
                    var fileUrl = FindUrl(fileFlight);
                    if (fileUrl == null)
                    {
                        // Kèm trích đoạn response để lần lỗi sau tự lộ định dạng (mã action
                        // đổi sau redeploy? URL nằm ở field lạ?) — nhìn là biết cần vá gì.
                        var snippet = (fileFlight.Length > 500 ? fileFlight[..500] + "…" : fileFlight)
                            .Replace('\r', ' ').Replace('\n', ' ');
                        attempts.Add($"Action file không trả về link tải cho \"{file.Name}\" — response ({fileFlight.Length} ký tự): {snippet}");
                        continue;
                    }
                    bytes = await _http.GetByteArrayAsync(fileUrl, cancellationToken);
                }
                var text = await _textExtractor.ExtractAsync(file.Name, new MemoryStream(bytes), cancellationToken);
                if (text.Length >= 200)
                {
                    _logger.LogInformation("Toàn văn ItemID {ItemId} trích từ file gốc \"{File}\" ({Length} ký tự)",
                        itemId, file.Name, text.Length);
                    return text;
                }
                attempts.Add($"File \"{file.Name}\" trích được quá ít text ({text.Length} ký tự).");
            }
            catch (Exception ex) when (ex is HttpRequestException or NotSupportedException or InvalidOperationException)
            {
                attempts.Add($"File \"{file.Name}\": {ex.Message}");
            }
        }

        return null;
    }

    /// <summary>
    /// GET trang chi tiết văn bản với "?tabs=toan-van" theo 3 lớp:
    /// 1. HTML: khối toanvancontent/fulltext render sẵn (nếu có);
    /// 2. Flight NHÚNG trong script self.__next_f.push([1,"..."]);
    /// 3. Request RSC (GET cùng URL + header "RSC: 1") — chính là cách trình duyệt nạp
    ///    nội dung tab sau khi hiện khung; toàn văn thường chỉ có ở bước này.
    /// Mọi ứng viên đều qua bộ lọc "trông như văn bản pháp luật" — HTML đầu trang chứa
    /// đầy script/layout dài hơn cả nội dung, lấy "khối dài nhất" mù quáng là dính rác.
    /// Trả null nếu không lấy được (rơi xuống cách server action / file gốc).
    /// </summary>
    private async Task<string?> TryFetchViaToanVanPageAsync(
        string itemId, string? preferredUrl, List<string> attempts, CancellationToken cancellationToken)
    {
        var urls = new List<string>();
        if (!string.IsNullOrWhiteSpace(preferredUrl)
            && preferredUrl.Contains("/van-ban/chi-tiet/", StringComparison.OrdinalIgnoreCase))
        {
            urls.Add(preferredUrl.Split('?')[0] + "?tabs=toan-van");
        }
        urls.Add($"{BaseUrl}/van-ban/chi-tiet/van-ban--{itemId}?tabs=toan-van");

        foreach (var url in urls.Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var files = new List<(string Bucket, string Folder, string Name)>();
            var candidates = new List<string>();

            // Lớp 1 + 2: HTML và flight nhúng
            try
            {
                var html = await GetHtmlAsync(url, cancellationToken);
                var block = ExtractBlock(html, "toanvancontent") ?? ExtractBlock(html, "fulltext");
                if (block != null)
                {
                    candidates.Add(block);
                }
                var embedded = ExtractEmbeddedFlight(html);
                if (embedded.Length > 0)
                {
                    candidates.AddRange(MineFlightCandidates(embedded, itemId, files));
                }
            }
            catch (HttpRequestException ex)
            {
                attempts.Add($"GET {url}: {ex.Message}");
            }

            // Lớp 3 (trúng nhất — bắt từ DevTools): action NỘI DUNG, POST vào đúng URL
            // trang chi tiết với body ["itemId"] + header next-router-state-tree (slug).
            var contentAction = _config["Legal:ContentNextAction"];
            if (string.IsNullOrWhiteSpace(contentAction))
            {
                contentAction = DefaultContentNextAction;
            }
            try
            {
                var contentFlight = await PostServerActionAsync(
                    contentAction,
                    JsonSerializer.Serialize(new[] { itemId }),
                    cancellationToken,
                    actionUrl: url,
                    routerStateTree: BuildRouterStateTree(url));
                candidates.AddRange(MineFlightCandidates(contentFlight, itemId, files));
            }
            catch (HttpRequestException ex)
            {
                attempts.Add($"Action nội dung ({contentAction[..8]}…) tại {url}: {ex.Message}"
                    + " (vbpl.vn redeploy đổi mã thì bắt lại next-action của request tab Nội dung, dán vào \"Legal:ContentNextAction\").");
            }

            // Lớp 4: request RSC — dự phòng
            var text = SelectLegalText(candidates);
            if (text == null)
            {
                try
                {
                    var rscFlight = await GetRscFlightAsync(url, cancellationToken);
                    candidates.AddRange(MineFlightCandidates(rscFlight, itemId, files));
                }
                catch (HttpRequestException ex)
                {
                    attempts.Add($"RSC {url}: {ex.Message}");
                }
                text = SelectLegalText(candidates);
            }
            if (text != null)
            {
                _logger.LogInformation("Toàn văn ItemID {ItemId} lấy từ trang ?tabs=toan-van ({Length} ký tự)", itemId, text.Length);
                return text;
            }
            attempts.Add(
                $"Trang {url}: {candidates.Count} khối dữ liệu nhưng không khối nào trông như văn bản pháp luật"
                + (files.Count > 0 ? $" ({files.Count} file đính kèm — thử tải file)." : "."));

            // Không có text nhưng thấy file đính kèm → thử tải file gốc luôn
            if (files.Count > 0)
            {
                var fileAction = _config["Legal:FileNextAction"];
                if (string.IsNullOrWhiteSpace(fileAction))
                {
                    fileAction = DefaultFileNextAction;
                }
                var fromFile = await TryDownloadFilesAsync(itemId, files, fileAction, attempts, cancellationToken);
                if (fromFile != null)
                {
                    return fromFile;
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Dựng header next-router-state-tree cho action nội dung: JSON mô tả cây route
    /// của Next.js App Router với slug trang chi tiết, URL-encode như trình duyệt gửi.
    /// Cấu trúc bắt từ DevTools (đổi mỗi khi vbpl đổi cấu trúc route — hiếm).
    /// </summary>
    private static string BuildRouterStateTree(string pageUrl)
    {
        var slug = new Uri(pageUrl).AbsolutePath.TrimEnd('/').Split('/').Last();
        var json = "[\"\",{\"children\":[\"van-ban\",{\"children\":[[\"category\",\"chi-tiet\",\"d\"],"
            + "{\"children\":[[\"id\",\"" + slug + "\",\"d\"],{\"children\":[\"__PAGE__\",{},null,null]}"
            + ",null,null]},null,null]},null,null]},null,null,true]";
        return Uri.EscapeDataString(json);
    }

    /// <summary>GET trang dưới dạng RSC (header "RSC: 1") — server trả flight của route thay vì HTML.</summary>
    private async Task<string> GetRscFlightAsync(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("RSC", "1");
        request.Headers.TryAddWithoutValidation("accept", "text/x-component,*/*");
        request.Headers.UserAgent.ParseAdd(BrowserUserAgent);
        request.Headers.Referrer = new Uri(url);
        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"HTTP {(int)response.StatusCode} ({response.StatusCode}).");
        }
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    /// <summary>
    /// Chọn khối VĂN BẢN PHÁP LUẬT thật trong các ứng viên (ưu tiên dài nhất):
    /// loại khối giống code/layout, đòi hỏi dấu hiệu đặc trưng ("Căn cứ", "Điều 1",
    /// "NGHỊ ĐỊNH"...). Trả text đã bóc HTML, hoặc null nếu không khối nào đạt.
    /// </summary>
    internal static string? SelectLegalText(List<string> candidates)
    {
        foreach (var candidate in candidates.OrderByDescending(c => c.Length))
        {
            var text = candidate.Contains('<') ? HtmlToText(candidate) : candidate.Trim();
            if (text.Length < 300 || text.Contains("Đang tải dữ liệu") || text.Contains("Đang tải nội dung"))
            {
                continue;
            }
            if (LooksLikeScript(text) || !LooksLikeLegalText(text))
            {
                continue;
            }
            return text;
        }
        return null;
    }

    /// <summary>Khối giống mã JS/layout Next.js — tuyệt đối không phải toàn văn.</summary>
    private static bool LooksLikeScript(string text)
        => text.Contains("function(")
            || text.Contains("function ")
            || text.Contains("self.__next_f")
            || text.Contains("window.")
            || text.Contains("document.addEventListener")
            || text.Contains("\"$\",\"")
            || text.Contains("addEventListener(")
            || text.StartsWith("(function", StringComparison.Ordinal);

    /// <summary>Dấu hiệu văn bản pháp luật Việt Nam (mở đầu/căn cứ/điều khoản).</summary>
    private static bool LooksLikeLegalText(string text)
        => text.Contains("Căn cứ")
            || text.Contains("Kính gửi")
            || Regex.IsMatch(text, @"Điều\s+\d")
            || text.Contains("NGHỊ ĐỊNH")
            || text.Contains("THÔNG TƯ")
            || text.Contains("QUYẾT ĐỊNH")
            || text.Contains("CHÍNH PHỦ")
            || text.Contains("BỘ TRƯỞNG")
            || text.Contains("QUỐC HỘI");

    /// <summary>
    /// Gom dữ liệu flight của Next.js nhúng trong HTML: các script
    /// self.__next_f.push([1,"chuỗi đã escape kiểu JS"]) — giải escape rồi nối lại
    /// thành một dòng chảy flight như response của server action.
    /// </summary>
    internal static string ExtractEmbeddedFlight(string html)
    {
        var sb = new StringBuilder();
        foreach (Match m in Regex.Matches(
            html,
            @"self\.__next_f\.push\(\[1,\s*""((?:[^""\\]|\\.)*)""\s*\]\)",
            RegexOptions.Singleline))
        {
            sb.Append(JsUnescape(m.Groups[1].Value));
        }
        return sb.ToString();
    }

    /// <summary>Giải escape chuỗi literal JS (\n, \", \\, \uXXXX, \xXX...).</summary>
    private static string JsUnescape(string s)
    {
        var sb = new StringBuilder(s.Length);
        for (var i = 0; i < s.Length; i++)
        {
            var c = s[i];
            if (c != '\\' || i + 1 >= s.Length)
            {
                sb.Append(c);
                continue;
            }
            var next = s[++i];
            switch (next)
            {
                case 'n': sb.Append('\n'); break;
                case 'r': sb.Append('\r'); break;
                case 't': sb.Append('\t'); break;
                case 'b': sb.Append('\b'); break;
                case 'f': sb.Append('\f'); break;
                case '0': sb.Append('\0'); break;
                case 'u' when i + 4 < s.Length
                    && ushort.TryParse(s.AsSpan(i + 1, 4), System.Globalization.NumberStyles.HexNumber, null, out var u):
                    sb.Append((char)u);
                    i += 4;
                    break;
                case 'x' when i + 2 < s.Length
                    && byte.TryParse(s.AsSpan(i + 1, 2), System.Globalization.NumberStyles.HexNumber, null, out var x):
                    sb.Append((char)x);
                    i += 2;
                    break;
                default: sb.Append(next); break; // \", \\, \/, \' ...
            }
        }
        return sb.ToString();
    }

    /// <summary>
    /// Đào một dòng chảy flight: gom MỌI chuỗi dài (ứng viên nội dung văn bản) từ các
    /// record JSON lẫn text-block "id:Thexlen,", đồng thời gom file đính kèm gặp trên
    /// đường. Dùng chung cho response server action, flight nhúng trong HTML và RSC.
    /// Việc chọn khối nào là văn bản thật giao cho SelectLegalText.
    /// </summary>
    private static List<string> MineFlightCandidates(
        string flight, string itemId, List<(string Bucket, string Folder, string Name)> files)
    {
        var candidates = new List<string>();
        foreach (var line in flight.Split('\n'))
        {
            var colon = line.IndexOf(':');
            if (colon <= 0 || colon >= line.Length - 1) continue;
            var payload = line[(colon + 1)..].Trim();
            if (payload.Length < 2 || (payload[0] != '{' && payload[0] != '[')) continue;
            try
            {
                using var doc = JsonDocument.Parse(payload);
                CollectContentAndFiles(doc.RootElement, itemId, candidates, files);
            }
            catch (JsonException) { }
        }
        candidates.AddRange(ExtractFlightTextBlocks(flight));
        return candidates;
    }

    /// <summary>
    /// Quét đệ quy JSON của flight: nhặt các chuỗi DÀI (ứng viên nội dung văn bản)
    /// và các file đính kèm (object có objectName, hoặc chuỗi tên file .pdf/.doc/.docx).
    /// </summary>
    private static void CollectContentAndFiles(
        JsonElement element, string itemId, List<string> candidates, List<(string, string, string)> files)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                var s = element.GetString() ?? "";
                if (s.Length >= 300)
                {
                    candidates.Add(s);
                }
                var trimmed = s.Trim();
                if (trimmed.Length is > 4 and < 300
                    && (trimmed.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
                        || trimmed.EndsWith(".docx", StringComparison.OrdinalIgnoreCase)
                        || trimmed.EndsWith(".doc", StringComparison.OrdinalIgnoreCase))
                    && !trimmed.Contains('/')
                    && !files.Any(f => f.Item3 == trimmed))
                {
                    files.Add(("vbpl", itemId, trimmed));
                }
                break;

            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    CollectContentAndFiles(item, itemId, candidates, files);
                }
                break;

            case JsonValueKind.Object:
                // Object mô tả file đầy đủ (bucketName/folderName/objectName)
                if (element.TryGetProperty("objectName", out var objectName)
                    && objectName.ValueKind == JsonValueKind.String
                    && !string.IsNullOrWhiteSpace(objectName.GetString()))
                {
                    var bucket = element.TryGetProperty("bucketName", out var b) && b.ValueKind == JsonValueKind.String
                        ? b.GetString()! : "vbpl";
                    var folder = element.TryGetProperty("folderName", out var f) && f.ValueKind == JsonValueKind.String
                        ? f.GetString()! : itemId;
                    var name = objectName.GetString()!;
                    if (!files.Any(x => x.Item3 == name))
                    {
                        files.Add((bucket, folder, name));
                    }
                }
                foreach (var property in element.EnumerateObject())
                {
                    CollectContentAndFiles(property.Value, itemId, candidates, files);
                }
                break;
        }
    }

    /// <summary>
    /// Bóc các TEXT-BLOCK trong response flight của Next.js: chuỗi dài được mã hóa
    /// "id:Thexlen," rồi tới VĂN BẢN THÔ (có thể nhiều dòng) kéo dài tới record kế
    /// tiếp ("id:..." ở đầu dòng). Toàn văn HTML của văn bản nằm ở dạng này.
    /// </summary>
    internal static List<string> ExtractFlightTextBlocks(string flight)
    {
        var blocks = new List<string>();
        var textMarkers = Regex.Matches(flight, @"(?m)^[0-9a-fA-F]{1,4}:T[0-9a-fA-F]+,");
        if (textMarkers.Count == 0)
        {
            return blocks;
        }
        // Vị trí bắt đầu của MỌI record ("id:" đầu dòng) để biết block kết thúc ở đâu
        var recordStarts = Regex.Matches(flight, @"(?m)^[0-9a-fA-F]{1,4}:")
            .Select(m => m.Index)
            .ToList();

        foreach (Match marker in textMarkers)
        {
            var start = marker.Index + marker.Length;
            var end = recordStarts.FirstOrDefault(p => p > start, flight.Length);
            if (end > start)
            {
                blocks.Add(flight[start..end].Trim());
            }
        }
        return blocks;
    }

    /// <summary>
    /// Action file của vbpl.vn trả NGUYÊN nội dung file mã hóa base64 trong một
    /// text-block "id:Thexlen,JVBERi..." (không trả link). Nhận diện theo chữ ký
    /// định dạng sau giải mã: %PDF ("JVBERi"), ZIP/docx ("UEsDB"), OLE .doc ("0M8R4").
    /// Đọc ĐÚNG số ký tự ghi ở marker (hexlen) — base64 dài hàng triệu ký tự.
    /// Trả null nếu không có block nào là file.
    /// </summary>
    internal static byte[]? TryDecodeBase64File(string flight)
    {
        foreach (Match marker in Regex.Matches(flight, @"(?m)^[0-9a-fA-F]{1,4}:T([0-9a-fA-F]+),"))
        {
            var start = marker.Index + marker.Length;
            int length;
            try
            {
                length = Convert.ToInt32(marker.Groups[1].Value, 16);
            }
            catch (OverflowException)
            {
                continue;
            }
            var end = Math.Min(flight.Length, start + length);
            if (end - start < 100)
            {
                continue; // quá ngắn, không thể là file
            }
            var block = flight[start..end].Trim();
            if (!block.StartsWith("JVBERi", StringComparison.Ordinal)      // %PDF
                && !block.StartsWith("UEsDB", StringComparison.Ordinal)    // PK (zip/docx/xlsx)
                && !block.StartsWith("0M8R4", StringComparison.Ordinal))   // OLE (.doc/.xls cũ)
            {
                continue;
            }
            try
            {
                return Convert.FromBase64String(block); // .NET tự bỏ qua khoảng trắng/xuống dòng
            }
            catch (FormatException)
            {
                // Thiếu padding do cắt block lệch — thử vớt phần chia hết cho 4
                var usable = block.Length - block.Length % 4;
                if (usable >= 100)
                {
                    try { return Convert.FromBase64String(block[..usable]); }
                    catch (FormatException) { }
                }
            }
        }
        return null;
    }

    /// <summary>
    /// Tìm link tải file trong response flight: ưu tiên URL http(s) tuyệt đối;
    /// không có thì nhận cả ĐƯỜNG DẪN TƯƠNG ĐỐI trong chuỗi JSON (vd "/api/file/...")
    /// và ghép với domain vbpl.
    /// </summary>
    private static string? FindUrl(string flight)
    {
        // JSON escape & = '&' — chuẩn hóa trước khi quét
        var normalized = flight.Replace("\\u0026", "&").Replace("\\/", "/");

        var absolute = Regex.Match(normalized, @"https?://[^\s""'\\]+");
        if (absolute.Success)
        {
            return absolute.Value.TrimEnd('.', ',', ')', ']', '}');
        }

        // Đường dẫn tương đối trong chuỗi JSON: "/..." có gợi ý là link file/tải về
        foreach (Match m in Regex.Matches(normalized, @"""(/[^""\s]{10,})"""))
        {
            var path = m.Groups[1].Value;
            if (path.Contains("download", StringComparison.OrdinalIgnoreCase)
                || path.Contains("file", StringComparison.OrdinalIgnoreCase)
                || path.Contains("minio", StringComparison.OrdinalIgnoreCase)
                || Regex.IsMatch(path, @"\.(pdf|docx?|zip)(\?|$)", RegexOptions.IgnoreCase))
            {
                return BaseUrl + path;
            }
        }
        return null;
    }

    /// <summary>Cắt khối div theo id/class (đếm div lồng nhau để đóng đúng thẻ).</summary>
    private static string? ExtractBlock(string html, string marker)
    {
        var anchor = Regex.Match(html, $@"<div[^>]*(?:id|class)=[""'][^""']*{Regex.Escape(marker)}[^""']*[""'][^>]*>",
            RegexOptions.IgnoreCase);
        if (!anchor.Success)
        {
            return null;
        }

        var depth = 1;
        var pos = anchor.Index + anchor.Length;
        var tag = Regex.Matches(html[pos..], @"<(/?)div\b", RegexOptions.IgnoreCase);
        foreach (Match m in tag)
        {
            depth += m.Groups[1].Value == "/" ? -1 : 1;
            if (depth == 0)
            {
                return html.Substring(pos, m.Index);
            }
        }
        return html[pos..];
    }

    /// <summary>HTML → text thuần: bỏ script/style, giữ xuống dòng, giải mã entity.</summary>
    private static string HtmlToText(string html)
    {
        var text = Regex.Replace(html, @"<(script|style)[^>]*>.*?</\1>", " ",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        text = Regex.Replace(text, @"<br\s*/?>|</p>|</div>|</tr>|</li>|</h\d>", "\n", RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        text = Regex.Replace(text, @"[ \t]+", " ");
        text = Regex.Replace(text, @"(\s*\n\s*){2,}", "\n\n");
        return text.Trim();
    }

    private async Task<string> GetHtmlAsync(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        // UA giống trình duyệt thật — một số site .gov chặn UA lạ
        request.Headers.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36");

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new HttpRequestException($"vbpl.vn phản hồi quá chậm (quá 60 giây) khi gọi {url}.");
        }
        catch (HttpRequestException ex)
        {
            // Nêu rõ nguyên nhân tầng dưới (DNS, TLS, chặn kết nối...) để dễ chẩn đoán
            throw new HttpRequestException($"Không kết nối được vbpl.vn ({ex.Message}) khi gọi {url}.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"vbpl.vn trả về HTTP {(int)response.StatusCode} ({response.StatusCode}) khi gọi {url}.");
            }
            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("vbpl.vn {Url} → {Length} ký tự HTML", url, html.Length);
            return html;
        }
    }
}
