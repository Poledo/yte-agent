namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Văn bản pháp luật đã TẢI VỀ từ vbpl.vn (chức năng "Tải văn bản").
/// Lưu cả toàn văn text để: xem lại không cần mạng, và nạp vào kho tri thức
/// không phải tải lại. Việc nạp kho tri thức là bước RIÊNG do người dùng chọn.
/// </summary>
public class LegalDownload
{
    public long Id { get; set; }

    /// <summary>
    /// Định danh văn bản trên vbpl.vn — mỗi văn bản chỉ lưu một bản (tải lại thì cập nhật).
    /// Văn bản cũ là SỐ ("181847"), văn bản mới là GUID ("4fda4da0-80ec-...") — nên lưu chuỗi.
    /// </summary>
    public required string ItemId { get; set; }

    public required string Title { get; set; }

    /// <summary>Số hiệu, vd "75/2023/NĐ-CP".</summary>
    public string? DocNumber { get; set; }

    public DateTime? IssuedDate { get; set; }

    /// <summary>Ngày có hiệu lực (đọc từ vbpl.vn nếu có).</summary>
    public DateTime? EffectiveDate { get; set; }

    /// <summary>Ngày hết hiệu lực (null = còn hiệu lực).</summary>
    public DateTime? ExpiryDate { get; set; }

    /// <summary>Link toàn văn trên vbpl.vn.</summary>
    public required string SourceUrl { get; set; }

    /// <summary>Toàn văn text đã trích từ trang.</summary>
    public required string Content { get; set; }

    public DateTime DownloadedAt { get; set; }

    /// <summary>Id văn bản trong kho tri thức nếu ĐÃ nạp (null = chưa nạp).</summary>
    public long? KnowledgeDocumentId { get; set; }

    /// <summary>Thời điểm nạp vào kho tri thức gần nhất.</summary>
    public DateTime? IngestedAt { get; set; }
}
