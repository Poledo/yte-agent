using AIValidation.Api.Models.Xml130;

namespace AIValidation.Api.Providers.Xml130.Interfaces;

/// <summary>Một hồ sơ kèm tên file nguồn — đầu vào cho các rule kiểm tra chéo.</summary>
public record Xml130BatchHoso
{
    public required string FileName { get; init; }
    public required Xml130Hoso Hoso { get; init; }

    /// <summary>Tạo tham chiếu hiển thị cho hồ sơ này trong kết quả kiểm tra chéo.</summary>
    public Xml130CrossHosoRef ToRef() => new()
    {
        FileName = FileName,
        MaLk = Hoso.MaLk,
        HoTen = Hoso.GetField("XML1", "HO_TEN"),
        MaThe = Hoso.GetField("XML1", "MA_THE_BHYT")
    };
}

/// <summary>
/// Chọn hồ sơ "GỐC" (được coi là hợp lệ) khi hai hồ sơ xung đột — dùng chung
/// cho các rule chéo để kết luận luôn nhất quán, không bao giờ "hòa":
/// 1. Thời điểm nghiệp vụ (vào giường / bắt đầu thực hiện / tiếp nhận) sớm hơn;
/// 2. Trùng nhau thì xét giờ tiếp nhận vào viện (XML1.NGAY_VAO) sớm hơn;
/// 3. Vẫn trùng thì lấy hồ sơ có MA_LK đứng trước.
/// </summary>
public static class CrossAnchor
{
    /// <summary>Trả về (hồ sơ gốc, hồ sơ còn lại, lý do chọn — dùng ghép vào câu thông báo).</summary>
    public static (Xml130BatchHoso Goc, Xml130BatchHoso ConLai, string LyDo) Pick(
        Xml130BatchHoso a, Xml130BatchHoso b, DateTime aTime, DateTime bTime, string tenThoiDiem)
    {
        if (aTime != bTime)
        {
            return aTime < bTime
                ? (a, b, $"{tenThoiDiem} trước ({aTime:dd/MM/yyyy HH:mm})")
                : (b, a, $"{tenThoiDiem} trước ({bTime:dd/MM/yyyy HH:mm})");
        }

        var aVao = NgayVao(a);
        var bVao = NgayVao(b);
        if (aVao != null && bVao != null && aVao != bVao)
        {
            return aVao < bVao
                ? (a, b, $"tiếp nhận vào viện trước ({aVao:dd/MM/yyyy HH:mm})")
                : (b, a, $"tiếp nhận vào viện trước ({bVao:dd/MM/yyyy HH:mm})");
        }

        var cmp = string.CompareOrdinal(a.Hoso.MaLk ?? "", b.Hoso.MaLk ?? "");
        var lyDo = "đứng trước theo mã hồ sơ (hai bên trùng mọi mốc thời gian)";
        return cmp <= 0 ? (a, b, lyDo) : (b, a, lyDo);
    }

    /// <summary>Giờ tiếp nhận vào viện (XML1.NGAY_VAO) của hồ sơ, null nếu thiếu.</summary>
    public static DateTime? NgayVao(Xml130BatchHoso hoso)
        => FieldSpecValidator.ParseDate(hoso.Hoso.GetField("XML1", "NGAY_VAO"));
}

/// <summary>
/// Rule kiểm tra CHÉO giữa nhiều hồ sơ (trong một file hoặc nhiều file XML 130):
/// phát hiện mâu thuẫn mà kiểm tra từng hồ sơ đơn lẻ không thấy được —
/// vd hai bệnh nhân cùng nằm một giường, một bác sĩ thực hiện y lệnh
/// cho hai bệnh nhân tại cùng thời điểm.
/// </summary>
public interface IXml130CrossFileRule
{
    string RuleId { get; }
    string RuleName { get; }

    /// <summary>Đối chiếu toàn bộ hồ sơ của lô; trả danh sách vấn đề chéo.</summary>
    List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default);
}
