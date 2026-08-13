namespace AIValidation.Api.Data.Entities.Licensing;

/// <summary>
/// Bản chốt sổ một kỳ tính tiền — BẤT BIẾN sau khi tạo.
///
/// Lý do phải có bảng riêng thay vì tính lại từ dữ liệu sống: đến tháng sau bảng giá
/// có thể đã đổi, tên đơn vị có thể đã sửa, giấy phép có thể đã thu hồi. Hóa đơn
/// tháng 3 phải luôn ra đúng con số của tháng 3, nên mọi thứ cần cho việc đó đều
/// được chép vào đây lúc chốt.
/// </summary>
public class BillingInvoice
{
    public long Id { get; set; }

    /// <summary>Giấy phép được chốt sổ.</summary>
    public long LicenseId { get; set; }

    /// <summary>Giấy phép được chốt sổ (navigation).</summary>
    public FacilityLicense? License { get; set; }

    /// <summary>Kỳ tính tiền dạng yyyyMM theo giờ Việt Nam, vd 202608.</summary>
    public int PeriodMonth { get; set; }

    /// <summary>Mã cơ sở KCB tại thời điểm chốt (chép cứng).</summary>
    public required string FacilityCode { get; set; }

    /// <summary>Tên đơn vị tại thời điểm chốt (chép cứng — sau này đổi tên không ảnh hưởng).</summary>
    public required string FacilityName { get; set; }

    /// <summary>Tên gói cước tại thời điểm chốt (chép cứng).</summary>
    public required string Plan { get; set; }

    /// <summary>Hạn mức hồ sơ trong gói tại thời điểm chốt. 0 = không giới hạn.</summary>
    public int IncludedQuota { get; set; }

    /// <summary>Tổng số hồ sơ đã kiểm trong kỳ (sau khử trùng).</summary>
    public int UsedUnits { get; set; }

    /// <summary>Số hồ sơ vượt hạn mức phải trả thêm.</summary>
    public int OverageUnits { get; set; }

    /// <summary>Số lượt hỏi đáp AI trong kỳ — hiện chưa tính tiền, chỉ ghi để tham khảo.</summary>
    public int AskCount { get; set; }

    /// <summary>Tiền thuê bao tại thời điểm chốt (VND).</summary>
    public decimal BasePrice { get; set; }

    /// <summary>Đơn giá mỗi hồ sơ vượt tại thời điểm chốt (VND).</summary>
    public decimal OverageUnitPrice { get; set; }

    /// <summary>Thành tiền = BasePrice + OverageUnits × OverageUnitPrice (VND).</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>Thời điểm chốt sổ (UTC).</summary>
    public DateTime ClosedAt { get; set; }

    /// <summary>Tài khoản quản trị đã chốt sổ.</summary>
    public string? ClosedBy { get; set; }
}
