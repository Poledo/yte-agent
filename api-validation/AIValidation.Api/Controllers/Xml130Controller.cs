using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Xml130;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AIValidation.Api.Controllers;

/// <summary>
/// API kiểm tra hồ sơ XML 130 (QĐ 130/QĐ-BYT).
///
/// Endpoints:
/// - POST /api/xml130/validate        : upload file XML (multipart) hoặc raw XML body.
/// - GET  /api/xml130/rules           : trả về catalog rule (cross_field_rules.json) cho UI hiển thị.
/// </summary>
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên endpoint này dùng policy "Extension" (mở origin). Các endpoint quản
// trị vẫn giữ policy mặc định chỉ cho origin của web-admin.
[EnableCors("Extension")]
[ApiController]
[Route("api/[controller]")]
public class Xml130Controller : ControllerBase
{
    private readonly IXml130ValidationService _validationService;
    private readonly IXml130BatchValidationService _batchValidationService;
    private readonly IXml130FieldSpecImportService _fieldSpecImportService;
    private readonly IXml130SpecProvider _specProvider;
    private readonly IUsageRecorder _usageRecorder;
    private readonly ILogger<Xml130Controller> _logger;

    public Xml130Controller(
        IXml130ValidationService validationService,
        IXml130BatchValidationService batchValidationService,
        IXml130FieldSpecImportService fieldSpecImportService,
        IXml130SpecProvider specProvider,
        IUsageRecorder usageRecorder,
        ILogger<Xml130Controller> logger)
    {
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
        _batchValidationService = batchValidationService ?? throw new ArgumentNullException(nameof(batchValidationService));
        _fieldSpecImportService = fieldSpecImportService ?? throw new ArgumentNullException(nameof(fieldSpecImportService));
        _specProvider = specProvider ?? throw new ArgumentNullException(nameof(specProvider));
        _usageRecorder = usageRecorder ?? throw new ArgumentNullException(nameof(usageRecorder));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Kiểm tra hồ sơ XML 130. Nhận một trong hai dạng:
    /// - multipart/form-data với field "file" (upload từ khung chat extension);
    /// - text/xml hoặc application/xml raw body.
    /// Query: useAi=true để sinh thêm nhận định AI (cần cấu hình LLM ApiKey).
    /// </summary>
    [HttpPost("validate")]
    [Consumes("multipart/form-data", "text/xml", "application/xml", "text/plain")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Xml130ValidationResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<Xml130ValidationResponse>> ValidateAsync(
        [FromQuery] bool useAi,
        CancellationToken cancellationToken)
    {
        string xmlContent;
        string? uploadedFileName = null;

        if (Request.HasFormContentType && Request.Form.Files.Count > 0)
        {
            var file = Request.Form.Files[0];
            uploadedFileName = file.FileName;
            _logger.LogInformation("Nhận file XML130 upload: {FileName} ({Size} bytes)", file.FileName, file.Length);
            using var reader = new StreamReader(file.OpenReadStream());
            xmlContent = await reader.ReadToEndAsync(cancellationToken);
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            xmlContent = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(xmlContent))
        {
            return BadRequest(new { message = "Không có nội dung XML. Gửi file qua multipart field \"file\" hoặc raw XML body." });
        }

        try
        {
            var sw = Stopwatch.StartNew();
            var result = await _validationService.ValidateAsync(
                xmlContent, useAi, uploadedFileName, crossCheck: true, cancellationToken);
            sw.Stop();

            // Ghi lịch sử sử dụng cho thống kê dashboard (không chặn/không hỏng request)
            var (errors, warnings) = CountSeverities(result.Results);
            await _usageRecorder.RecordAsync(
                UsageRecorder.EventXml130Check,
                hosoCount: result.HosoCount,
                errorCount: errors,
                warningCount: warnings,
                xuatToanRisk: result.XuatToanRisk,
                durationMs: sw.ElapsedMilliseconds,
                facilityCode: FirstNonEmpty(Request.Headers["X-Facility-Code"], result.MaCskcb),
                staffCode: Request.Headers["X-Staff-Code"],
                preview: BuildCheckPreview(result, uploadedFileName),
                detailJson: BuildCheckDetailJson(result),
                cancellationToken: CancellationToken.None);

            return Ok(result);
        }
        catch (FormatException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Giá trị đầu tiên không rỗng (header ưu tiên hơn giá trị suy ra từ file).</summary>
    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    /// <summary>Tóm tắt ngắn cho danh sách lịch sử hoạt động.</summary>
    private static string BuildCheckPreview(Xml130ValidationResponse result, string? fileName) =>
        $"{(string.IsNullOrWhiteSpace(fileName) ? "Hồ sơ XML 130" : fileName)} — {result.HosoCount} hồ sơ, "
        + (result.TotalIssues == 0 ? "không phát hiện vấn đề" : $"{result.TotalIssues} vấn đề")
        + (result.XuatToanRisk ? " (có nguy cơ xuất toán)" : string.Empty);

    /// <summary>
    /// Nội dung phản hồi đầy đủ để xem lại trên màn Lịch sử hoạt động.
    /// CHỈ chứa MA_LK — cố ý loại họ tên/mã thẻ để không lưu định danh bệnh nhân.
    /// </summary>
    private static string BuildCheckDetailJson(Xml130ValidationResponse result)
    {
        var payload = new
        {
            maCskcb = result.MaCskcb,
            hosoCount = result.HosoCount,
            totalIssues = result.TotalIssues,
            xuatToanRisk = result.XuatToanRisk,
            summary = result.Summary,
            aiAssessment = result.AiAssessment,
            results = result.Results.Select(r => new
            {
                maLk = r.MaLk,
                issueCount = r.IssueCount,
                xuatToanRisk = r.XuatToanRisk,
                issues = r.Issues.Select(i => new
                {
                    ruleId = i.RuleId,
                    severity = i.Severity.ToString(),
                    group = i.Group,
                    table = i.Table,
                    field = i.Field,
                    row = i.RowIndex,
                    message = i.Message,
                    suggestion = i.Suggestion,
                    xuatToanRisk = i.XuatToanRisk,
                }),
            }),
            crossIssues = result.CrossIssues.Select(c => new
            {
                ruleId = c.RuleId,
                severity = c.Severity.ToString(),
                message = c.Message,
                suggestion = c.Suggestion,
                xuatToanRisk = c.XuatToanRisk,
            }),
        };
        return JsonSerializer.Serialize(payload);
    }

    /// <summary>Đếm số vấn đề mức Lỗi/Cảnh báo trong danh sách kết quả hồ sơ.</summary>
    private static (int Errors, int Warnings) CountSeverities(IEnumerable<Xml130HosoResult> results)
    {
        int errors = 0, warnings = 0;
        foreach (var r in results)
        {
            foreach (var issue in r.Issues)
            {
                if (issue.Severity == ValidationSeverity.Error) errors++;
                else if (issue.Severity == ValidationSeverity.Warning) warnings++;
            }
        }
        return (errors, warnings);
    }

    /// <summary>
    /// Kiểm tra NHIỀU file XML 130 cùng lúc (multipart, nhiều field "files"/"file").
    /// Ngoài kiểm tra từng file, còn đối chiếu CHÉO giữa toàn bộ hồ sơ:
    /// trùng giường, một bác sĩ làm việc trên nhiều bệnh nhân cùng thời điểm,
    /// cùng bệnh nhân có 2 đợt điều trị chồng thời gian...
    /// </summary>
    [HttpPost("validate-batch")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Xml130BatchValidationResponse))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(1024L * 1024 * 1024)] // 1 GB — lô XML cả tháng có thể vài trăm MB
    public async Task<ActionResult<Xml130BatchValidationResponse>> ValidateBatchAsync(
        CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
        {
            return BadRequest(new { message = "Không có file nào. Gửi các file XML qua multipart field \"files\"." });
        }

        var inputs = new List<Xml130BatchInput>();
        foreach (var file in Request.Form.Files)
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync(cancellationToken);
            inputs.Add(new Xml130BatchInput(file.FileName, content));
        }

        _logger.LogInformation("Nhận lô {Count} file XML130 để kiểm tra chéo", inputs.Count);
        var sw = Stopwatch.StartNew();
        var result = await _batchValidationService.ValidateBatchAsync(inputs, useAi: false, cancellationToken);
        sw.Stop();

        var (errors, warnings) = CountSeverities(
            result.Files.Where(f => f.Result != null).SelectMany(f => f.Result!.Results));
        await _usageRecorder.RecordAsync(
            UsageRecorder.EventXml130Check,
            hosoCount: result.Files.Sum(f => f.Result?.HosoCount ?? 0),
            errorCount: errors,
            warningCount: warnings,
            xuatToanRisk: result.XuatToanRisk,
            durationMs: sw.ElapsedMilliseconds,
            facilityCode: FirstNonEmpty(
                Request.Headers["X-Facility-Code"],
                result.Files.Select(f => f.Result?.MaCskcb).FirstOrDefault(m => !string.IsNullOrWhiteSpace(m))),
            staffCode: Request.Headers["X-Staff-Code"],
            preview: $"Lô {result.Files.Count} file — {result.TotalIssues} vấn đề"
                + (result.XuatToanRisk ? " (có nguy cơ xuất toán)" : string.Empty),
            cancellationToken: CancellationToken.None);

        return Ok(result);
    }

    /// <summary>Serialize sự kiện stream: camelCase + enum thành chuỗi (giống JSON của controller).</summary>
    private static readonly JsonSerializerOptions StreamJsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false) }
    };

    /// <summary>
    /// Kiểm tra lô kiểu STREAMING (NDJSON) cho lô lớn hàng nghìn hồ sơ:
    /// mỗi dòng response là một sự kiện JSON — "start" → "cross" (toàn bộ kết quả
    /// đối chiếu chéo, chạy trước vì cần đủ mọi hồ sơ) → "hoso" (kết quả từng hồ sơ,
    /// kèm tiến độ) → "done". Client hiển thị dần, không phải chờ một cục.
    /// </summary>
    [HttpPost("validate-batch-stream")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(1024L * 1024 * 1024)]
    public async Task ValidateBatchStreamAsync(CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(
                new { message = "Không có file nào. Gửi các file XML qua multipart field \"files\"." },
                cancellationToken);
            return;
        }

        var inputs = new List<Xml130BatchInput>();
        foreach (var file in Request.Form.Files)
        {
            using var reader = new StreamReader(file.OpenReadStream());
            inputs.Add(new Xml130BatchInput(file.FileName, await reader.ReadToEndAsync(cancellationToken)));
        }
        _logger.LogInformation("Nhận lô {Count} file XML130 để kiểm tra kiểu streaming", inputs.Count);

        Response.ContentType = "application/x-ndjson; charset=utf-8";
        Response.Headers.CacheControl = "no-cache";
        // Tắt buffering để từng sự kiện được đẩy về client ngay
        HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        await foreach (var evt in _batchValidationService.ValidateBatchStreamAsync(inputs, cancellationToken))
        {
            await Response.WriteAsync(JsonSerializer.Serialize(evt, StreamJsonOptions) + "\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Trả về catalog rule liên trường (cross_field_rules.json) để UI hiển thị danh mục kiểm tra.
    /// </summary>
    [HttpGet("rules")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetRules()
    {
        var path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Knowledge", "Xml130", "cross_field_rules.json");
        if (!System.IO.File.Exists(path))
        {
            return NotFound(new { message = "Chưa có catalog rule (cross_field_rules.json)." });
        }
        return PhysicalFile(path, "application/json");
    }

    /// <summary>
    /// Import lại file Excel ĐẶC TẢ CẤU TRÚC XML130 ("Bảng chỉ tiêu dữ liệu" theo QĐ130 +
    /// QĐ4750 + điều chỉnh 2024). Hệ thống đọc mọi sheet "Bảng N", cập nhật kiểu dữ liệu,
    /// kích thước, diễn giải và thêm/bớt trường theo file; tự suy luận định dạng ngày và
    /// danh mục giá trị từ cột diễn giải. Điều kiện kiểm tra hồ sơ đổi theo ngay.
    /// </summary>
    [HttpPost("field-specs/import")]
    [EnableRateLimiting("rl-import")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Xml130FieldSpecImportResult))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> ImportFieldSpecsAsync(CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType || Request.Form.Files.Count == 0)
        {
            return BadRequest(new { message = "Không có file. Gửi file đặc tả Excel qua multipart field \"file\"." });
        }

        var file = Request.Form.Files[0];
        _logger.LogInformation("Nhận file đặc tả XML130 để import: {FileName} ({Size} bytes)", file.FileName, file.Length);

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _fieldSpecImportService.ImportAsync(stream, file.FileName, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex) when (ex is NotSupportedException or FormatException)
        {
            _logger.LogWarning(ex, "Import đặc tả XML130 thất bại: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Tóm tắt đặc tả trường XML130 đang có hiệu lực (số bảng, số trường, số điều kiện kiểm
    /// tra) và cho biết đang dùng bản import của người dùng hay bản gốc trong image.
    /// </summary>
    [HttpGet("field-specs")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFieldSpecsAsync(CancellationToken cancellationToken)
    {
        var specs = await _specProvider.GetSpecsAsync(cancellationToken);
        var allFields = specs.Tables.SelectMany(t => t.Fields).ToList();
        return Ok(new
        {
            source = _specProvider.HasOverride ? "import" : "goc",
            tableCount = specs.Tables.Count,
            fieldCount = allFields.Count,
            requiredCount = allFields.Count(f => f.Required),
            dateFormatCount = allFields.Count(f => f.Format != null),
            allowedValuesCount = allFields.Count(f => f.AllowedValues is { Count: > 0 }),
            tables = specs.Tables.Select(t => new
            {
                t.TableId,
                t.TableName,
                fieldCount = t.Fields.Count
            })
        });
    }
}
