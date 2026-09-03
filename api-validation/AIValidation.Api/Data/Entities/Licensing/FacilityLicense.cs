namespace AIValidation.Api.Data.Entities.Licensing;

/// <summary>
/// Hợp đồng / giấy phép sử dụng gắn vào MỘT nút trong cây đơn vị.
///
/// Đây là nguồn sự thật duy nhất để trả lời hai câu hỏi khác nhau:
/// - "Ai đang gọi?" — suy ra từ khóa bản quyền gửi kèm request, KHÔNG BAO GIỜ lấy
///   từ mã MACSKCB nằm trong file XML 130 (mã đó do người gửi tự khai, sửa được).
/// - "Tính tiền cho ai?" — <see cref="FacilityCode"/> của giấy phép này.
///
/// Cơ sở tuyến trên mua một giấy phép rồi phủ cho cả tuyến dưới là chuyện bình thường
/// (Trung tâm Y tế huyện mua, các Trạm Y tế xã dùng theo). <see cref="CoversSubtree"/>
/// điều khiển việc đó.
/// </summary>
public class FacilityLicense
{
    public long Id { get; set; }

    /// <summary>Đơn vị đứng tên hợp đồng — cũng là đơn vị nhận hóa đơn.</summary>
    public long FacilityId { get; set; }

    /// <summary>Đơn vị đứng tên hợp đồng (navigation).</summary>
    public Facility? Facility { get; set; }

    /// <summary>
    /// Mã cơ sở KCB của đơn vị đứng tên, chép lại để tra cứu nhanh mà không phải join.
    /// Đồng bộ lại mỗi khi đổi <see cref="FacilityId"/>.
    /// </summary>
    public required string FacilityCode { get; set; }

    /// <summary>
    /// Băm SHA-256 (hex thường) của khóa bản quyền đầy đủ — dùng để đối chiếu khi
    /// client gửi khóa lên, không đảo ngược được.
    /// </summary>
    public required string KeyHash { get; set; }

    /// <summary>
    /// Bản mã hóa AES-256-GCM của khóa gốc, để quản trị xem lại khi cơ sở báo mất
    /// khóa (không phải rotate + nhập lại cả tuyến máy trạm). Khóa giải mã nằm ở
    /// secret của môi trường chạy, KHÔNG nằm trong cơ sở dữ liệu — lộ DB không lộ khóa.
    /// Null với khóa cấp trước khi có cột này, hoặc khi chưa cấu hình khóa mã hóa:
    /// những hợp đồng đó không xem lại được, phải cấp lại khóa như cũ.
    /// </summary>
    public string? KeyCipher { get; set; }

    /// <summary>
    /// Phần đầu khóa để người quản trị nhận ra giấy phép nào trên màn hình,
    /// vd "ZC-58028-K4M2". Không đủ để dùng thay khóa thật.
    /// </summary>
    public required string KeyPrefix { get; set; }

    /// <summary>Tên gói cước, vd "Cơ bản", "Nâng cao". Chép vào hóa đơn lúc chốt sổ.</summary>
    public string Plan { get; set; } = "Cơ bản";

    /// <summary>
    /// Số hồ sơ được kiểm miễn phí mỗi tháng trong gói. 0 = không giới hạn.
    /// Vượt hạn mức thì tính thêm theo <see cref="OverageUnitPrice"/>.
    /// </summary>
    public int MonthlyQuota { get; set; }

    /// <summary>Tiền thuê bao mỗi tháng (VND).</summary>
    public decimal BasePrice { get; set; }

    /// <summary>Tiền mỗi hồ sơ vượt hạn mức (VND).</summary>
    public decimal OverageUnitPrice { get; set; }

    /// <summary>
    /// Cho phép các đơn vị cấp dưới trong cây dùng chung giấy phép này.
    ///
    /// CỐ Ý tách khỏi <see cref="Facility.InheritCatalogFromParent"/> dù nghe giống nhau:
    /// cờ kia là kế thừa DANH MỤC (nghiệp vụ đối chiếu), cờ này là phạm vi QUYỀN THƯƠNG MẠI.
    /// Gộp chung thì một thao tác chỉnh danh mục sẽ vô tình cắt hoặc mở dịch vụ cho cả tuyến dưới.
    /// </summary>
    public bool CoversSubtree { get; set; } = true;

    /// <summary>Hiệu lực từ (UTC).</summary>
    public DateTime ValidFrom { get; set; }

    /// <summary>Hết hiệu lực sau thời điểm này (UTC). Null = không đặt hạn.</summary>
    public DateTime? ValidTo { get; set; }

    /// <summary>Tắt tạm thời mà không thu hồi khóa (vd nợ cước).</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Thời điểm thu hồi khóa vĩnh viễn (UTC). Có giá trị = khóa chết hẳn.</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>Ghi chú tự do: số hợp đồng, người ký, điều khoản riêng...</summary>
    public string? Note { get; set; }

    /// <summary>Tài khoản quản trị đã cấp giấy phép này.</summary>
    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Lần gần nhất khóa này được dùng để gọi API (UTC) — soi giấy phép chết.</summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// Giấy phép còn dùng được tại thời điểm <paramref name="nowUtc"/> hay không.
    /// Chỉ xét vòng đời hợp đồng, KHÔNG xét hạn mức (vượt hạn mức vẫn phục vụ,
    /// chỉ là tính thêm tiền — chặn ngang giữa ca trực là không chấp nhận được).
    /// </summary>
    public bool IsUsableAt(DateTime nowUtc) =>
        IsActive
        && RevokedAt is null
        && ValidFrom <= nowUtc
        && (ValidTo is null || ValidTo >= nowUtc);
}
