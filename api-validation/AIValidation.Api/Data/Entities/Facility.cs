namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Cơ sở khám chữa bệnh (đơn vị) — tổ chức theo cây cha ↔ con ↔ cháu:
/// Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã.
///
/// Mục đích: danh mục HIS gắn với từng đơn vị, nhưng tuyến dưới (trạm y tế)
/// thường dùng chung danh mục do tuyến trên ban hành và không tự nạp danh mục
/// riêng. Cây đơn vị cho phép hồ sơ của đơn vị con mượn danh mục của đơn vị cha
/// khi chính nó chưa có — thay vì bỏ qua đối chiếu.
///
/// Thứ tự ưu tiên khi kiểm tra XML 130: danh mục của CHÍNH đơn vị trước, không có
/// thì lần lên cha, rồi ông — dừng ngay tại đơn vị nào tắt <see cref="InheritCatalogFromParent"/>.
/// </summary>
public class Facility
{
    public long Id { get; set; }

    /// <summary>
    /// Mã cơ sở KCB do BHXH cấp, vd "58028". Là mã trong thẻ MACSKCB của file
    /// XML 130 và cột DVTT của file danh mục HIS — khóa nối mọi thứ lại với nhau.
    /// </summary>
    public required string Code { get; set; }

    /// <summary>Tên đơn vị, vd "Trung tâm Y tế huyện Ninh Phước".</summary>
    public required string Name { get; set; }

    /// <summary>
    /// Tuyến của cơ sở: trung ương → tỉnh đa khoa → chuyên khoa → xã. Mang tính mô tả,
    /// KHÔNG quyết định việc mượn danh mục — cái đó vẫn theo <see cref="ParentId"/>.
    /// Tách riêng khỏi cây vì hai thứ không phải lúc nào cũng trùng: một bệnh viện
    /// chuyên khoa tỉnh có thể treo thẳng dưới Sở Y tế mà vẫn là tuyến 2-3.
    /// </summary>
    public FacilityTuyen Tuyen { get; set; } = FacilityTuyen.KhongXacDinh;

    /// <summary>Đơn vị cấp trên trực tiếp. Null = đơn vị gốc (không có cha).</summary>
    public long? ParentId { get; set; }

    /// <summary>Đơn vị cấp trên trực tiếp (navigation).</summary>
    public Facility? Parent { get; set; }

    /// <summary>Các đơn vị cấp dưới trực tiếp.</summary>
    public List<Facility> Children { get; set; } = new();

    /// <summary>
    /// Cho phép đơn vị này dùng danh mục HIS của đơn vị cấp trên khi chính nó
    /// chưa nạp loại danh mục đó. Tắt = chỉ đối chiếu bằng danh mục của riêng mình
    /// (dùng cho đơn vị có danh mục đặc thù, không được lẫn với tuyến trên).
    /// </summary>
    public bool InheritCatalogFromParent { get; set; } = true;

    /// <summary>Ghi chú tự do (địa chỉ, tuyến, hạng bệnh viện...).</summary>
    public string? Note { get; set; }

    /// <summary>Soft delete: false = đơn vị đã ngừng hoạt động, không dùng để đối chiếu.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
}
