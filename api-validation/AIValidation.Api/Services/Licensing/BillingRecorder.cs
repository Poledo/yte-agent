using System.Security.Cryptography;
using System.Text;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Licensing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Licensing;

/// <summary>
/// Ghi sổ tính tiền.
///
/// Khác <see cref="UsageRecorder"/> ở CHỦ ĐÍCH, không phải ở kỹ thuật: UsageRecorder
/// phục vụ dashboard nên nuốt mọi lỗi, còn ở đây ghi hỏng là mất doanh thu và không
/// đối chất được với khách hàng, nên lỗi được ném ra để chỗ gọi quyết định.
///
/// Khử trùng dựa vào ràng buộc DUY NHẤT ở DB (UX_billing_records_dedup) chứ không
/// kiểm-rồi-mới-ghi bằng code: nhiều request chạy song song thì kiểm trước vẫn lọt.
/// Dùng INSERT ... ON CONFLICT DO NOTHING để va chạm là bỏ qua chứ không nổ.
/// </summary>
public interface IBillingRecorder
{
    /// <summary>
    /// Ghi các hồ sơ vừa kiểm vào sổ. Trả về số hồ sơ THỰC SỰ được tính tiền
    /// (đã trừ những hồ sơ đã tính trong cùng kỳ).
    /// </summary>
    Task<int> RecordXml130Async(
        FacilityLicense license,
        string? usedByFacilityCode,
        IEnumerable<string?> maLkList,
        string? staffCode,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ghi một lượt hỏi đáp AI. Hiện KHÔNG tính tiền (xem <see cref="BillingInvoice.AskCount"/>),
    /// chỉ ghi để biết sản lượng trước khi quyết định có thu phí phần này hay không.
    /// </summary>
    Task RecordAskAsync(
        FacilityLicense license,
        string? usedByFacilityCode,
        string? question,
        string? staffCode,
        CancellationToken cancellationToken = default);

    /// <summary>Kỳ tính tiền dạng yyyyMM theo giờ Việt Nam cho một thời điểm UTC.</summary>
    static int PeriodOf(DateTime utc)
    {
        var vn = utc + TimeSpan.FromHours(7);
        return vn.Year * 100 + vn.Month;
    }
}

/// <inheritdoc />
public sealed class BillingRecorder : IBillingRecorder
{
    /// <summary>
    /// Số dòng mỗi lệnh INSERT. PostgreSQL giới hạn 65535 tham số một lệnh, mỗi dòng
    /// dùng 8 tham số — 500 dòng vẫn còn rất xa ngưỡng mà đủ nhanh cho lô hàng nghìn hồ sơ.
    /// </summary>
    private const int BatchSize = 500;

    /// <summary>
    /// Khóa thay thế cho hồ sơ thiếu MA_LK. Mọi hồ sơ thiếu mã trong cùng kỳ gộp làm
    /// một dòng — cố ý tính THIẾU chứ không tính THỪA, vì hóa đơn thừa thì khách hàng
    /// mất niềm tin còn thiếu thì chỉ mất một khoản nhỏ. File thiếu MA_LK vốn là file hỏng.
    /// </summary>
    private const string MissingKeyPlaceholder = "KHONG-CO-MA-LK";

    private readonly AppDbContext _db;
    private readonly LicensingOptions _options;
    private readonly ILogger<BillingRecorder> _logger;

    public BillingRecorder(
        AppDbContext db,
        IOptions<LicensingOptions> options,
        ILogger<BillingRecorder> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<int> RecordXml130Async(
        FacilityLicense license,
        string? usedByFacilityCode,
        IEnumerable<string?> maLkList,
        string? staffCode,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(license);

        if (!_options.RecordBilling)
        {
            return 0;
        }

        // Trùng ngay trong một lần gửi (file có hai hồ sơ cùng MA_LK) cũng phải gộp,
        // vì ON CONFLICT không xử lý được trùng trong CÙNG một lệnh INSERT.
        var keys = maLkList
            .Select(m => string.IsNullOrWhiteSpace(m) ? MissingKeyPlaceholder : m.Trim())
            .Select(m => m.Length > 120 ? m[..120] : m)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (keys.Count == 0)
        {
            return 0;
        }

        return await InsertAsync(
            license, usedByFacilityCode, UsageRecorder.EventXml130Check, keys, staffCode, cancellationToken);
    }

    public async Task RecordAskAsync(
        FacilityLicense license,
        string? usedByFacilityCode,
        string? question,
        string? staffCode,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(license);

        if (!_options.RecordBilling)
        {
            return;
        }

        // Băm câu hỏi thay vì lưu nguyên văn: sổ tính tiền không được chứa nội dung
        // nghiệp vụ, mà vẫn cần khử trùng khi người dùng hỏi lại đúng câu cũ.
        var key = "ask:" + HashQuestion(question);

        await InsertAsync(
            license, usedByFacilityCode, UsageRecorder.EventAsk, new[] { key }, staffCode, cancellationToken);
    }

    /// <summary>Chèn theo lô, bỏ qua dòng trùng. Trả về số dòng thật sự được thêm.</summary>
    private async Task<int> InsertAsync(
        FacilityLicense license,
        string? usedByFacilityCode,
        string eventType,
        IReadOnlyList<string> keys,
        string? staffCode,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var period = IBillingRecorder.PeriodOf(now);

        // Đơn vị phát sinh: mã trong hồ sơ nếu có, không thì chính đơn vị đứng tên.
        // (Cổng cấp phép đã bảo đảm mã này nằm trong phạm vi giấy phép ở chế độ Enforce.)
        var usedBy = string.IsNullOrWhiteSpace(usedByFacilityCode)
            ? license.FacilityCode
            : usedByFacilityCode.Trim();

        var staff = string.IsNullOrWhiteSpace(staffCode) ? null : staffCode.Trim();
        var inserted = 0;

        for (var offset = 0; offset < keys.Count; offset += BatchSize)
        {
            var chunk = keys.Skip(offset).Take(BatchSize).ToList();
            var values = new List<string>(chunk.Count);
            var parameters = new List<object>(chunk.Count * 8);

            foreach (var key in chunk)
            {
                var i = parameters.Count;
                values.Add($"({{{i}}}, {{{i + 1}}}, {{{i + 2}}}, {{{i + 3}}}, {{{i + 4}}}, {{{i + 5}}}, {{{i + 6}}}, {{{i + 7}}})");
                parameters.Add(license.Id);
                parameters.Add(license.FacilityCode);
                parameters.Add(usedBy);
                parameters.Add(period);
                parameters.Add(eventType);
                parameters.Add(key);
                parameters.Add((object?)staff ?? DBNull.Value);
                parameters.Add(now);
            }

            // ON CONFLICT theo DANH SÁCH CỘT, không theo tên ràng buộc: khử trùng được
            // tạo bằng CREATE UNIQUE INDEX nên PostgreSQL không coi là constraint.
            var sql =
                """
                INSERT INTO public.billing_records
                    ("LicenseId", "BilledFacilityCode", "UsedByFacilityCode", "PeriodMonth",
                     "EventType", "RecordKey", "StaffCode", "CreatedAt")
                VALUES
                """
                + " " + string.Join(", ", values)
                + " ON CONFLICT (\"LicenseId\", \"PeriodMonth\", \"EventType\", \"RecordKey\") DO NOTHING";

            inserted += await _db.Database.ExecuteSqlRawAsync(sql, parameters, cancellationToken);
        }

        _logger.LogInformation(
            "Ghi sổ tính tiền: giấy phép {LicenseId} kỳ {Period}, {New}/{Total} {EventType} được tính",
            license.Id, period, inserted, keys.Count, eventType);

        return inserted;
    }

    /// <summary>Băm rút gọn câu hỏi để khử trùng mà không lưu nội dung.</summary>
    private static string HashQuestion(string? question)
    {
        var text = (question ?? string.Empty).Trim().ToLowerInvariant();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        return Convert.ToHexStringLower(bytes)[..32];
    }
}
