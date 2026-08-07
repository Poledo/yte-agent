namespace AIValidation.Api.Configuration;

/// <summary>
/// Configuration options cho Knowledge Provider.
/// 
/// Chứa cấu hình về vị trí dữ liệu tham chiếu.
/// 
/// Được load từ appsettings.json section "Knowledge".
/// </summary>
public class KnowledgeOptions
{
    /// <summary>
    /// Thư mục chứa knowledge files.
    /// 
    /// VD: "Knowledge"
    /// Full path sẽ là: {ApplicationBaseDirectory}/Knowledge
    /// 
    /// Thư mục này có thể chứa:
    /// - ICD codes
    /// - Drug names
    /// - Test names
    /// - BHYT codes
    /// - Danh mục khác
    /// </summary>
    public string Folder { get; set; } = "Knowledge";
}
