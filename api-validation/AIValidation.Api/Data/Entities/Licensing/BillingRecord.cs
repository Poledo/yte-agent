namespace AIValidation.Api.Data.Entities.Licensing;

/// <summary>
/// Một dòng trong SỔ TÍNH TIỀN. Cố ý tách khỏi <see cref="UsageEvent"/> vì hai bảng
/// có yêu cầu độ tin cậy trái ngược nhau:
///
/// - <see cref="UsageEvent"/> phục vụ dashboard: ghi hỏng thì nuốt lỗi, tuyệt đối
///   không được làm gãy nghiệp vụ chính.
/// - Bảng này phục vụ xuất hóa đơn: ghi hỏng là mất doanh thu và không đối chất được
///   với khách hàng, nên lỗi phải nổi lên để xử lý chứ không im lặng.
///
/// KHÔNG chứa dữ liệu bệnh nhân. <see cref="RecordKey"/> chỉ là mã liên kết MA_LK
/// (mã hồ sơ nội bộ của cơ sở), dùng để khỏi tính tiền hai lần khi nhân viên sửa
/// rồi kiểm lại cùng một hồ sơ.
/// </summary>
public class BillingRecord
{
    public long Id { get; set; }

    /// <summary>Giấy phép chịu tiền cho lượt dùng này.</summary>
    public long LicenseId { get; set; }

    /// <summary>Giấy phép chịu tiền (navigation).</summary>
    public FacilityLicense? License { get; set; }

    /// <summary>
    /// Mã cơ sở KCB đứng tên hợp đồng — CHỦ THỂ TRẢ TIỀN, lấy từ giấy phép.
    /// </summary>
    public required string BilledFacilityCode { get; set; }

    /// <summary>
    /// Mã cơ sở KCB thực tế phát sinh lượt dùng (có thể là đơn vị con trong cây).
    /// Dùng để bóc tách chi tiết trong hóa đơn của tuyến trên, không dùng để tính tiền.
    /// </summary>
    public required string UsedByFacilityCode { get; set; }

    /// <summary>Kỳ tính tiền dạng yyyyMM theo giờ Việt Nam, vd 202608.</summary>
    public int PeriodMonth { get; set; }

    /// <summary>Loại sự kiện: "Xml130Check" hoặc "Ask" (xem <see cref="Services.UsageRecorder"/>).</summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Khóa khử trùng trong kỳ: MA_LK của hồ sơ với lượt kiểm XML 130, hoặc băm câu
    /// hỏi với lượt hỏi đáp AI. Cùng khóa trong cùng kỳ chỉ tính tiền một lần.
    /// </summary>
    public required string RecordKey { get; set; }

    /// <summary>Số đơn vị tính tiền của dòng này (mỗi hồ sơ = 1).</summary>
    public int BillableUnits { get; set; } = 1;

    /// <summary>Mã nhân viên thao tác, phục vụ đối chất khi khách hàng khiếu nại hóa đơn.</summary>
    public string? StaffCode { get; set; }

    public DateTime CreatedAt { get; set; }
}
