using System.Text.RegularExpressions;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Bóc ngày HIỆU LỰC / HẾT HIỆU LỰC từ chính nội dung văn bản pháp luật Việt Nam,
/// dùng khi người dùng tự upload file mà không nhập ngày. Nhận các mẫu phổ biến:
/// - "có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025" / "... kể từ ngày 01/7/2025"
/// - "có hiệu lực kể từ ngày ký" → lấy ngày ký ở phần đầu văn bản ("..., ngày 26 tháng 8 năm 2025")
/// - "hết hiệu lực từ ngày ..." (hiếm — thường do văn bản khác bãi bỏ)
/// Không tìm thấy thì trả null — người dùng vẫn sửa tay được, và văn bản không có
/// ngày sẽ luôn được tra cứu (không lọc oan).
/// </summary>
public static partial class LegalDateParser
{
    /// <summary>"ngày 01 tháng 7 năm 2025" hoặc "01/7/2025", "01-07-2025", "01.7.2025".</summary>
    [GeneratedRegex(@"(?:ngày\s*)?(\d{1,2})\s*(?:tháng\s+|[\/\.\-])\s*(\d{1,2})\s*(?:năm\s+|[\/\.\-])\s*(\d{4})",
        RegexOptions.IgnoreCase)]
    private static partial Regex DateRegex();

    [GeneratedRegex(@"hiệu\s+lực(?:\s+thi\s+hành)?(?:\s+kể)?(?:\s+từ)?", RegexOptions.IgnoreCase)]
    private static partial Regex EffectiveAnchorRegex();

    [GeneratedRegex(@"hết\s+hiệu\s+lực", RegexOptions.IgnoreCase)]
    private static partial Regex ExpiryAnchorRegex();

    [GeneratedRegex(@"^\s*(?:kể\s+từ\s+)?ngày\s+ký", RegexOptions.IgnoreCase)]
    private static partial Regex FromSigningDateRegex();

    public static (DateTime? EffectiveDate, DateTime? ExpiryDate) Extract(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return (null, null);
        }
        // Điều khoản hiệu lực nằm trong thân văn bản — giới hạn để regex không cày file khổng lồ
        var text = content.Length > 400_000 ? content[..400_000] : content;

        DateTime? effective = null;
        foreach (Match anchor in EffectiveAnchorRegex().Matches(text))
        {
            // "hết hiệu lực" cũng chứa "hiệu lực" — bỏ qua khi ngay trước anchor là "hết"
            var beforeStart = Math.Max(0, anchor.Index - 6);
            if (text[beforeStart..anchor.Index].Contains("hết", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var windowEnd = Math.Min(text.Length, anchor.Index + anchor.Length + 120);
            var window = text[(anchor.Index + anchor.Length)..windowEnd];

            // "có hiệu lực kể từ ngày ký" → ngày ký nằm ở phần mở đầu ("..., ngày X tháng Y năm Z")
            effective = FromSigningDateRegex().IsMatch(window)
                ? FirstDate(text.Length > 2000 ? text[..2000] : text)
                : FirstDate(window);
            if (effective != null)
            {
                break;
            }
        }

        DateTime? expiry = null;
        foreach (Match anchor in ExpiryAnchorRegex().Matches(text))
        {
            var windowEnd = Math.Min(text.Length, anchor.Index + anchor.Length + 120);
            expiry = FirstDate(text[(anchor.Index + anchor.Length)..windowEnd]);
            if (expiry != null)
            {
                break;
            }
        }

        return (effective, expiry);
    }

    /// <summary>Ngày đầu tiên đọc được trong đoạn text (null nếu không có/ngày vô lý).</summary>
    private static DateTime? FirstDate(string text)
    {
        foreach (Match m in DateRegex().Matches(text))
        {
            var day = int.Parse(m.Groups[1].Value);
            var month = int.Parse(m.Groups[2].Value);
            var year = int.Parse(m.Groups[3].Value);
            if (year is < 1990 or > 2100 || month is < 1 or > 12 || day is < 1 or > 31)
            {
                continue;
            }
            try
            {
                return new DateTime(year, month, day);
            }
            catch (ArgumentOutOfRangeException)
            {
                // 31/02... — thử ngày kế tiếp trong đoạn
            }
        }
        return null;
    }
}
