using AIValidation.Api.Models.Xml130;

namespace AIValidation.Api.Providers.Xml130.Interfaces;

/// <summary>
/// Rule kiểm tra liên trường / liên bảng trên một hồ sơ XML 130.
/// Mỗi rule phụ trách một nhóm nghiệp vụ (thẻ BHYT, thời gian, tài chính...)
/// và trả về danh sách vấn đề phát hiện được (rỗng nếu hồ sơ sạch).
/// </summary>
public interface IXml130Rule
{
    /// <summary>Mã nhóm rule, ví dụ "BHYT-CARD".</summary>
    string RuleId { get; }

    /// <summary>Tên hiển thị tiếng Việt.</summary>
    string RuleName { get; }

    /// <summary>Thực thi kiểm tra trên một hồ sơ.</summary>
    Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default);
}
