namespace AIValidation.Api.Models;

/// <summary>
/// Đơn vị dữ liệu tham chiếu được cung cấp từ Knowledge Source.
/// 
/// Đại diện cho một tài liệu/dữ liệu trong Knowledge Base.
/// Có thể đến từ:
/// - File JSON/CSV/XML
/// - Database
/// - External REST API
/// - Vector Database
/// - RAG system
/// </summary>
public record KnowledgeDocument
{
    /// <summary>
    /// Tên/mã định danh của dữ liệu tham chiếu.
    /// Ví dụ: "ICD-10-A00.0", "Aspirin 100mg", "Hóa chất máu"
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Danh mục/loại dữ liệu.
    /// Ví dụ: "ICD", "Drug", "Test", "Insurance", "Procedure"
    /// </summary>
    public required string Category { get; init; }

    /// <summary>
    /// Nội dung chi tiết của dữ liệu tham chiếu.
    /// Ví dụ: Mô tả bệnh, thành phần thuốc, hướng dẫn test
    /// </summary>
    public required string Content { get; init; }

    /// <summary>
    /// Điểm tương liên (relevance score) khi tìm kiếm.
    /// 
    /// Dùng trong RAG hoặc Vector Database để xếp hạng kết quả.
    /// Giá trị 0.0 - 1.0, cao hơn = liên quan hơn.
    /// 
    /// Có thể null nếu source không hỗ trợ scoring.
    /// </summary>
    public double? Score { get; init; }

    /// <summary>
    /// Metadata bổ sung cho dữ liệu.
    /// 
    /// Ví dụ:
    /// {
    ///   "version": "2024.01",
    ///   "source": "WHO-ICD-10",
    ///   "language": "vi",
    ///   "deprecated": "false"
    /// }
    /// 
    /// Có thể null nếu không cần metadata.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }
}
