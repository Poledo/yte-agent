using AIValidation.Api.Models;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface cho Knowledge Source - một nguồn dữ liệu tham chiếu.
/// 
/// Mỗi Knowledge Source đại diện cho một nguồn dữ liệu cụ thể:
/// - File (JSON, CSV, XML)
/// - Database (SQL Server, PostgreSQL)
/// - External API (REST, GraphQL)
/// - Vector Database (Pinecone, Chroma, Weaviate)
/// - RAG system
/// 
/// KnowledgeProvider sẽ tổng hợp kết quả từ nhiều KnowledgeSource.
/// </summary>
public interface IKnowledgeSource
{
    /// <summary>
    /// Lấy danh sách Knowledge Document từ source này.
    /// 
    /// Phương thức này phân tích request (page, trigger field, etc.)
    /// để quy định documento nào cần trả về cho quá trình validation.
    /// </summary>
    /// <param name="request">Yêu cầu validation để xác định knowledge cần thiết.</param>
    /// <param name="cancellationToken">Token hủy yêu cầu.</param>
    /// <returns>Danh sách Knowledge Document từ source này.</returns>
    Task<IReadOnlyList<KnowledgeDocument>> GetDocumentsAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default);
}
