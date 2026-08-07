using AIValidation.Api.Models.Enums;

namespace AIValidation.Api.Models.Xml130;

/// <summary>Tham chiếu một hồ sơ liên quan đến vấn đề kiểm tra chéo.</summary>
public record Xml130CrossHosoRef
{
    /// <summary>Tên file chứa hồ sơ.</summary>
    public required string FileName { get; init; }

    public string? MaLk { get; init; }
    public string? HoTen { get; init; }
    public string? MaThe { get; init; }

    /// <summary>Thời điểm liên quan đến xung đột (giờ vào giường / giờ thực hiện / giờ tiếp nhận) để hiển thị.</summary>
    public string? ThoiDiem { get; init; }

    /// <summary>
    /// True nếu hồ sơ này phát sinh TRƯỚC (tiếp nhận/bắt đầu sớm hơn) nên được coi là
    /// hợp lệ trong xung đột — các hồ sơ còn lại là bên cần rà soát. Cả nhóm đều false
    /// khi hai bên trùng đúng thời điểm, không xác định được bên nào trước.
    /// </summary>
    public bool PhatSinhTruoc { get; init; }
}

/// <summary>
/// Một vấn đề phát hiện khi đối chiếu CHÉO giữa nhiều hồ sơ / nhiều file XML 130
/// (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị...). Khác Xml130Issue ở chỗ
/// vấn đề thuộc về một NHÓM hồ sơ chứ không thuộc một hồ sơ đơn lẻ.
/// </summary>
public record Xml130CrossIssue
{
    /// <summary>Mã rule kiểm tra chéo (vd "CROSS-GIUONG").</summary>
    public required string RuleId { get; init; }

    public required ValidationSeverity Severity { get; init; }

    /// <summary>Thông báo tiếng Việt cho người dùng.</summary>
    public required string Message { get; init; }

    public string? Suggestion { get; init; }

    /// <summary>True nếu có nguy cơ bị BHXH xuất toán.</summary>
    public bool XuatToanRisk { get; init; }

    /// <summary>Các hồ sơ liên quan đến vấn đề này.</summary>
    public required List<Xml130CrossHosoRef> Hosos { get; init; }
}

/// <summary>Kết quả kiểm tra một file trong lô.</summary>
public class Xml130BatchFileResult
{
    public required string FileName { get; set; }

    /// <summary>Kết quả kiểm tra file (null nếu file không parse được).</summary>
    public Xml130ValidationResponse? Result { get; set; }

    /// <summary>Thông báo lỗi tiếng Việt nếu file không đọc/parse được.</summary>
    public string? Error { get; set; }

    /// <summary>
    /// Tên các file KHÁC có hồ sơ xung đột/chồng chéo với file này
    /// (suy ra từ CrossIssues) — để người dùng thấy ngay file nào đụng file nào.
    /// </summary>
    public List<string> ConflictWith { get; set; } = new();
}

/// <summary>
/// Kết quả kiểm tra một LÔ nhiều file XML 130 cùng lúc:
/// từng file kiểm tra như bình thường, sau đó đối chiếu chéo giữa toàn bộ hồ sơ
/// của tất cả các file (kể cả các hồ sơ trong cùng một file).
/// </summary>
public class Xml130BatchValidationResponse
{
    public int FileCount { get; set; }

    /// <summary>Tổng số hồ sơ có dữ liệu trong tất cả các file.</summary>
    public int HosoCount { get; set; }

    public List<Xml130BatchFileResult> Files { get; set; } = new();

    /// <summary>Các vấn đề phát hiện khi đối chiếu chéo giữa các hồ sơ.</summary>
    public List<Xml130CrossIssue> CrossIssues { get; set; } = new();

    /// <summary>Tổng vấn đề: trong từng hồ sơ + đối chiếu chéo.</summary>
    public int TotalIssues =>
        Files.Sum(f => f.Result?.TotalIssues ?? 0) + CrossIssues.Count;

    public bool XuatToanRisk =>
        CrossIssues.Any(i => i.XuatToanRisk) || Files.Any(f => f.Result?.XuatToanRisk == true);

    /// <summary>Tóm tắt tiếng Việt toàn lô.</summary>
    public string? Summary { get; set; }
}
