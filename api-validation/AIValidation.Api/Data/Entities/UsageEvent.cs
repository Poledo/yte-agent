namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Một lượt sử dụng tính năng chính của hệ thống — phục vụ thống kê trên dashboard.
/// KHÔNG lưu nội dung câu hỏi hay dữ liệu hồ sơ (chỉ số liệu tổng hợp) để
/// giữ nguyên tắc "không lưu hồ sơ bệnh án".
/// </summary>
public class UsageEvent
{
    public long Id { get; set; }

    /// <summary>Loại sự kiện: "Ask" (hỏi đáp AI) hoặc "Xml130Check" (kiểm tra hồ sơ).</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Thời điểm ghi nhận (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Mã đơn vị (cơ sở KCB). Với kiểm tra XML 130 lấy từ MA_CSKCB trong file;
    /// extension chưa gửi kèm thì tạm là "UNKNOWN" (sẽ gửi qua header X-Facility-Code).
    /// </summary>
    public string FacilityCode { get; set; } = "UNKNOWN";

    /// <summary>
    /// Mã nhân viên thao tác. Extension chưa gửi kèm — tạm là "unknown"
    /// (sẽ gửi qua header X-Staff-Code khi extension bổ sung).
    /// </summary>
    public string StaffCode { get; set; } = "unknown";

    /// <summary>Số hồ sơ trong lượt kiểm tra (0 với hỏi đáp).</summary>
    public int HosoCount { get; set; }

    /// <summary>Số vấn đề mức LỖI phát hiện được.</summary>
    public int ErrorCount { get; set; }

    /// <summary>Số vấn đề mức CẢNH BÁO.</summary>
    public int WarningCount { get; set; }

    /// <summary>Lượt kiểm tra có nguy cơ xuất toán.</summary>
    public bool XuatToanRisk { get; set; }

    /// <summary>Thời gian xử lý phía server (mili giây).</summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// Tóm tắt ngắn hiển thị trên danh sách lịch sử: câu hỏi (hỏi đáp AI)
    /// hoặc tóm tắt kết quả (kiểm tra XML 130).
    /// </summary>
    public string? Preview { get; set; }

    /// <summary>
    /// Nội dung phản hồi đầy đủ (JSON) để xem lại: câu hỏi + câu trả lời + nguồn
    /// trích dẫn (hỏi đáp), hoặc danh sách vấn đề theo hồ sơ (kiểm tra XML 130 —
    /// CHỈ chứa mã liên kết MA_LK, KHÔNG chứa họ tên/mã thẻ bệnh nhân).
    /// </summary>
    public string? DetailJson { get; set; }
}
