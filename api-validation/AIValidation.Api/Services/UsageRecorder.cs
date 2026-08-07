using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;

namespace AIValidation.Api.Services;

/// <summary>
/// Ghi nhận một lượt sử dụng (hỏi đáp AI / kiểm tra XML 130) vào bảng usage_events
/// để thống kê trên dashboard. Lỗi khi ghi KHÔNG được làm hỏng request chính.
/// </summary>
public interface IUsageRecorder
{
    /// <summary>Ghi một sự kiện; nuốt lỗi (chỉ log warning) để không ảnh hưởng request.</summary>
    Task RecordAsync(
        string eventType,
        int hosoCount = 0,
        int errorCount = 0,
        int warningCount = 0,
        bool xuatToanRisk = false,
        long durationMs = 0,
        string? facilityCode = null,
        string? staffCode = null,
        string? preview = null,
        string? detailJson = null,
        CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public sealed class UsageRecorder : IUsageRecorder
{
    /// <summary>Lượt hỏi đáp AI (RAG).</summary>
    public const string EventAsk = "Ask";

    /// <summary>Lượt kiểm tra hồ sơ XML 130 (đơn lẻ hoặc theo lô).</summary>
    public const string EventXml130Check = "Xml130Check";

    private readonly AppDbContext _db;
    private readonly ILogger<UsageRecorder> _logger;

    public UsageRecorder(AppDbContext db, ILogger<UsageRecorder> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task RecordAsync(
        string eventType,
        int hosoCount = 0,
        int errorCount = 0,
        int warningCount = 0,
        bool xuatToanRisk = false,
        long durationMs = 0,
        string? facilityCode = null,
        string? staffCode = null,
        string? preview = null,
        string? detailJson = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _db.UsageEvents.Add(new UsageEvent
            {
                EventType = eventType,
                CreatedAt = DateTime.UtcNow,
                // Extension chưa gửi kèm mã — lưu tạm giá trị mặc định, cắt theo độ dài cột
                FacilityCode = Truncate(string.IsNullOrWhiteSpace(facilityCode) ? "UNKNOWN" : facilityCode!, 30),
                StaffCode = Truncate(string.IsNullOrWhiteSpace(staffCode) ? "unknown" : staffCode!, 50),
                HosoCount = hosoCount,
                ErrorCount = errorCount,
                WarningCount = warningCount,
                XuatToanRisk = xuatToanRisk,
                DurationMs = durationMs,
                Preview = preview is null ? null : Truncate(preview, 400),
                // Chặn payload quá lớn (lô hàng nghìn hồ sơ) — 400KB đủ cho mọi ca thường
                DetailJson = detailJson is { Length: > 400_000 } ? null : detailJson,
            });
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Thống kê là phụ — tuyệt đối không làm hỏng nghiệp vụ chính.
            _logger.LogWarning(ex, "Không ghi được usage event {Type}", eventType);
        }
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
