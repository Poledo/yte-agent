using NpgsqlTypes;

namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Văn bản y tế (công văn, thông tư, quyết định...) do người dùng nạp vào
/// để AI tra cứu khi trả lời (RAG - Retrieval Augmented Generation).
/// Nội dung đầy đủ lưu ở Content; phần tra cứu chia nhỏ ở DocumentChunk.
/// </summary>
public class MedicalDocument
{
    public long Id { get; set; }

    /// <summary>Tiêu đề văn bản, vd "Quyết định 130/QĐ-BYT".</summary>
    public required string Title { get; set; }

    /// <summary>Loại văn bản: QuyetDinh | ThongTu | CongVan | NghiDinh | Khac.</summary>
    public string DocType { get; set; } = "Khac";

    /// <summary>Số hiệu văn bản, vd "130/QĐ-BYT".</summary>
    public string? DocNumber { get; set; }

    /// <summary>Cơ quan ban hành, vd "Bộ Y tế".</summary>
    public string? IssuedBy { get; set; }

    /// <summary>Ngày ban hành (nếu biết).</summary>
    public DateTime? IssuedDate { get; set; }

    /// <summary>Ngày văn bản có hiệu lực (nếu biết).</summary>
    public DateTime? EffectiveDate { get; set; }

    /// <summary>
    /// Ngày HẾT hiệu lực (null = còn hiệu lực). Văn bản quá ngày này bị LOẠI khỏi
    /// truy hồi RAG — trợ lý không trích dẫn văn bản đã hết hiệu lực.
    /// </summary>
    public DateTime? ExpiryDate { get; set; }

    /// <summary>Tên file gốc khi upload.</summary>
    public string? SourceFileName { get; set; }

    /// <summary>Toàn văn nội dung đã trích xuất.</summary>
    public required string Content { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    /// <summary>Các đoạn nhỏ phục vụ tìm kiếm.</summary>
    public List<DocumentChunk> Chunks { get; set; } = new();
}

/// <summary>
/// Một đoạn văn bản (~1000 ký tự) của MedicalDocument, đánh chỉ mục full-text
/// (tsvector, GIN index) để truy hồi ngữ cảnh cho AI.
/// </summary>
public class DocumentChunk
{
    public long Id { get; set; }

    public long DocumentId { get; set; }

    public MedicalDocument? Document { get; set; }

    /// <summary>Thứ tự đoạn trong văn bản (0-based).</summary>
    public int ChunkIndex { get; set; }

    /// <summary>Nội dung đoạn.</summary>
    public required string Content { get; set; }

    /// <summary>Cột tsvector sinh tự động từ Content (config 'simple').</summary>
    public NpgsqlTsVector? SearchVector { get; set; }

    /// <summary>
    /// Vector embedding của đoạn (float[] serialize thành bytes) — phục vụ tìm kiếm
    /// NGỮ NGHĨA. Null = chưa tạo chỉ mục (Ollama chưa chạy lúc nạp, hoặc chưa rebuild).
    /// </summary>
    public byte[]? Embedding { get; set; }
}
