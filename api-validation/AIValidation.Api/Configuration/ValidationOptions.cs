namespace AIValidation.Api.Configuration;

/// <summary>
/// Configuration options cho Validation Service.
/// 
/// Chứa cấu hình điều khiển hành vi của validation pipeline.
/// 
/// Được load từ appsettings.json section "Validation".
/// </summary>
public class ValidationOptions
{
    /// <summary>
    /// Bật/tắt sử dụng Knowledge trong quá trình validation.
    /// 
    /// True: ValidationService sẽ gọi KnowledgeProvider để lấy dữ liệu tham chiếu.
    /// False: Validation chỉ dựa vào rules mà không dữ liệu tham chiếu.
    /// 
    /// Default: true
    /// </summary>
    public bool EnableKnowledge { get; set; } = true;

    /// <summary>
    /// Bật/tắt logging cho validation process.
    /// 
    /// True: Ghi log chi tiết quá trình validation.
    /// False: Không logging.
    /// 
    /// Default: true
    /// </summary>
    public bool EnableLogging { get; set; } = true;

    /// <summary>
    /// Bật/tắt caching cho validation results.
    /// 
    /// True: Cache kết quả validation để tránh lặp lại tính toán.
    /// False: Không cache, validation lặp lại mỗi lần.
    /// 
    /// Default: true
    /// </summary>
    public bool EnableCache { get; set; } = true;
}
