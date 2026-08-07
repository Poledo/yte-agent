namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Nguồn danh mục — mỗi lần nạp một file Excel danh mục từ HIS tạo một bản ghi.
///
/// Mục đích: danh mục thay đổi thường xuyên (bổ sung thuốc, đổi giá theo thông tư mới).
/// Gắn dữ liệu với nguồn cho phép nạp lại (thay thế) hoặc gỡ bỏ nguyên một danh mục
/// mà không đụng các danh mục khác.
/// </summary>
public class CatalogSource
{
    public long Id { get; set; }

    /// <summary>Tên file gốc khi nạp, vd "dm_duoc_vattu.xls".</summary>
    public required string FileName { get; set; }

    /// <summary>Loại danh mục theo profile, vd "Drug", "MedicalService".</summary>
    public required string CatalogType { get; set; }

    /// <summary>Tên hiển thị tiếng Việt của loại danh mục.</summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Mã cơ sở KCB (cột DVTT) — danh mục thuộc về một cơ sở cụ thể.
    /// Null với các danh mục dùng chung không gắn cơ sở (nhà sản xuất, nước sản xuất...).
    /// </summary>
    public string? FacilityCode { get; set; }

    /// <summary>Số dòng đã nạp.</summary>
    public int RowCount { get; set; }

    /// <summary>
    /// SHA-256 (hex) của nội dung file gốc. Extension nạp danh mục thẳng từ HIS mỗi
    /// lần bấm nút, phần lớn file không đổi giữa hai lần — hash giống bản đang hiệu
    /// lực thì bỏ qua thay vì nạp lại hàng chục nghìn dòng. Null với danh mục nạp
    /// trước khi hệ thống tính hash.
    /// </summary>
    public string? ContentHash { get; set; }

    public DateTime ImportedAt { get; set; }

    /// <summary>Soft delete: false = đã gỡ khỏi kho, không dùng để đối chiếu nữa.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Các mục thuộc nguồn này.</summary>
    public List<CatalogItem> Items { get; set; } = new();
}

/// <summary>
/// Một mục trong danh mục HIS (thuốc, dịch vụ kỹ thuật, CĐHA, xét nghiệm, giường,
/// hoặc danh mục tham chiếu như nhà sản xuất, kho, phòng ban...).
///
/// Dùng để đối chiếu khi kiểm tra hồ sơ XML 130: mã có trong danh mục không,
/// đơn giá khớp không, có bị tạm ngưng / ngoài danh mục BHYT không.
/// </summary>
public class CatalogItem
{
    public long Id { get; set; }

    public long SourceId { get; set; }

    public CatalogSource? Source { get; set; }

    /// <summary>Loại danh mục (lặp lại từ nguồn để truy vấn nhanh, không phải join).</summary>
    public required string CatalogType { get; set; }

    /// <summary>Mã cơ sở KCB sở hữu danh mục (null nếu danh mục dùng chung).</summary>
    public string? FacilityCode { get; set; }

    /// <summary>
    /// Mã dùng để đối chiếu với hồ sơ XML 130 — là mã theo Bộ mã danh mục dùng chung
    /// của Bộ Y tế (mã hoạt chất với thuốc, mã dịch vụ kỹ thuật với DVKT).
    /// Null nếu dòng danh mục chưa được map mã DMDC.
    /// </summary>
    public string? Code { get; set; }

    /// <summary>Mã nội bộ của phần mềm HIS (MAVATTU, MA_DV...).</summary>
    public string? HisCode { get; set; }

    public required string Name { get; set; }

    public string? Unit { get; set; }

    /// <summary>Đơn giá BHYT thanh toán.</summary>
    public decimal? PriceBhyt { get; set; }

    /// <summary>Đơn giá bệnh viện.</summary>
    public decimal? PriceHospital { get; set; }

    /// <summary>Tạm ngưng sử dụng (cột TAMNGUNG).</summary>
    public bool IsSuspended { get; set; }

    /// <summary>Ngoài danh mục thuộc phạm vi thanh toán BHYT (cột NGOAIDANHMUCBHYT).</summary>
    public bool IsOutsideBhyt { get; set; }

    /// <summary>Còn hoạt động trong danh mục (cột HOATDONG/TRANGTHAI).</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Các cột nghiệp vụ còn lại của dòng danh mục (JSONB).</summary>
    public Dictionary<string, string>? Metadata { get; set; }
}
