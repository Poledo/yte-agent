using AIValidation.Api.Models.Enums;

namespace AIValidation.Api.Models.Xml130;

/// <summary>
/// Một cảnh báo/lỗi phát hiện trên hồ sơ XML 130.
/// </summary>
public record Xml130Issue
{
    /// <summary>Mã rule phát hiện vấn đề (vd "XML1-C001", "SPEC-MAXLEN").</summary>
    public required string RuleId { get; init; }

    /// <summary>Mức độ: Error = gần như chắc chắn bị xuất toán; Warning = nguy cơ bị giám định; Info = lưu ý.</summary>
    public required ValidationSeverity Severity { get; init; }

    /// <summary>Nhóm kiểm tra: PatientInfo | Diagnosis | Service | Drug | Time | Finance | Link | Admin.</summary>
    public required string Group { get; init; }

    /// <summary>Bảng chứa trường lỗi ("XML1".."XML15").</summary>
    public required string Table { get; init; }

    /// <summary>Tên trường liên quan (có thể nhiều trường, phân cách ';').</summary>
    public required string Field { get; init; }

    /// <summary>Dòng chi tiết trong bảng (1-based), null nếu áp dụng cả bảng.</summary>
    public int? RowIndex { get; init; }

    /// <summary>Giá trị hiện tại gây lỗi (để hiển thị).</summary>
    public string? Value { get; init; }

    /// <summary>Thông báo tiếng Việt cho người dùng.</summary>
    public required string Message { get; init; }

    /// <summary>Gợi ý cách sửa (nếu có).</summary>
    public string? Suggestion { get; init; }

    /// <summary>True nếu lỗi này có nguy cơ bị cơ quan BHXH xuất toán chi phí.</summary>
    public bool XuatToanRisk { get; init; }
}

/// <summary>
/// Kết quả kiểm tra một hồ sơ (một MA_LK) trong file XML 130.
/// </summary>
public class Xml130HosoResult
{
    /// <summary>Mã liên kết hồ sơ.</summary>
    public string? MaLk { get; set; }

    /// <summary>Họ tên bệnh nhân (từ XML1).</summary>
    public string? HoTen { get; set; }

    /// <summary>Mã thẻ BHYT.</summary>
    public string? MaThe { get; set; }

    /// <summary>
    /// Ngày vào viện (XML1/NGAY_VAO) đã định dạng dd/MM/yyyy, null nếu file không có
    /// hoặc ghi sai. Trả kèm để phía hiển thị đặt tên file kết quả tải về theo
    /// bệnh nhân + ngày khám mà không phải bóc lại XML.
    /// </summary>
    public string? NgayVao { get; set; }

    /// <summary>Tổng số vấn đề phát hiện.</summary>
    public int IssueCount => Issues.Count;

    /// <summary>True nếu có ít nhất một vấn đề có nguy cơ xuất toán.</summary>
    public bool XuatToanRisk => Issues.Any(i => i.XuatToanRisk);

    /// <summary>Danh sách vấn đề, nhóm hiển thị theo trường Group.</summary>
    public List<Xml130Issue> Issues { get; set; } = new();

    /// <summary>Thống kê số vấn đề theo nhóm kiểm tra.</summary>
    public Dictionary<string, int> GroupCounts =>
        Issues.GroupBy(i => i.Group).ToDictionary(g => g.Key, g => g.Count());
}

/// <summary>
/// Kết quả kiểm tra toàn bộ file XML 130 trả về cho extension/chatbot.
/// </summary>
public class Xml130ValidationResponse
{
    /// <summary>
    /// True nếu file có ít nhất một hồ sơ có dữ liệu. False khi số vào viện
    /// không tồn tại / HIS trả về file rỗng — để UI không báo nhầm "đạt".
    /// </summary>
    public bool Found { get; set; } = true;

    /// <summary>Mã cơ sở KCB trong file.</summary>
    public string? MaCskcb { get; set; }

    /// <summary>Số hồ sơ trong file.</summary>
    public int HosoCount { get; set; }

    /// <summary>
    /// Vấn đề phát hiện khi đối chiếu CHÉO giữa các hồ sơ TRONG CÙNG file
    /// (trùng giường, trùng giờ bác sĩ, trùng đợt điều trị) — file XML 130
    /// thường chứa nhiều hồ sơ nên chồng chéo xảy ra ngay trong một file.
    /// Rỗng khi file chỉ có một hồ sơ, hoặc khi kiểm tra theo lô (lúc đó
    /// phần chéo nằm ở cấp lô để so cả giữa các file).
    /// </summary>
    public List<Xml130CrossIssue> CrossIssues { get; set; } = new();

    /// <summary>Tổng số vấn đề toàn file (từng hồ sơ + đối chiếu chéo trong file).</summary>
    public int TotalIssues => Results.Sum(r => r.IssueCount) + CrossIssues.Count;

    /// <summary>True nếu bất kỳ hồ sơ nào (hoặc vấn đề chéo nào) có nguy cơ xuất toán.</summary>
    public bool XuatToanRisk => Results.Any(r => r.XuatToanRisk) || CrossIssues.Any(i => i.XuatToanRisk);

    /// <summary>Tóm tắt tiếng Việt (rule-based hoặc do AI sinh).</summary>
    public string? Summary { get; set; }

    /// <summary>Nhận định chi tiết do AI sinh (null nếu tắt AI).</summary>
    public string? AiAssessment { get; set; }

    /// <summary>Kết quả từng hồ sơ.</summary>
    public List<Xml130HosoResult> Results { get; set; } = new();
}
