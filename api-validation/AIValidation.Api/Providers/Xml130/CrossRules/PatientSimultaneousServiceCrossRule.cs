using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.CrossRules;

/// <summary>
/// Phát hiện MỘT bệnh nhân "có mặt hai nơi cùng lúc": hai dịch vụ được thực hiện
/// cho cùng bệnh nhân tại HAI KHOA khác nhau với khung giờ giao nhau (hoặc trùng
/// đúng phút bắt đầu) — vd đang khám ở phòng khám A lại đồng thời làm thủ thuật ở khoa B.
///
/// Để tránh báo sai:
/// - Loại dòng ngày giường (MA_GIUONG) — nằm giường song song với đi làm DVKT là bình thường.
/// - Loại nhóm xét nghiệm (MA_NHOM = 1) — giờ thực hiện là giờ CHẠY MẪU tại khoa
///   xét nghiệm, bệnh nhân không cần có mặt.
/// - Chỉ so mốc có đủ giờ:phút; hai dịch vụ cùng khoa giao giờ nhau không tính
///   (làm nhiều chỉ định liền nhau trong một khoa là bình thường).
/// So cả các dòng TRONG CÙNG một hồ sơ lẫn giữa các hồ sơ của cùng bệnh nhân.
/// </summary>
public class PatientSimultaneousServiceCrossRule : IXml130CrossFileRule
{
    public string RuleId => "CROSS-BN-2NOI";
    public string RuleName => "Bệnh nhân có mặt hai khoa/phòng cùng lúc";

    private const int MaxIssues = 100;

    private sealed record Exec(
        Xml130BatchHoso Hoso,
        string Khoa,
        string TenDichVu,
        DateTime Start,
        DateTime End,
        int RowIndex);

    public List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hosos);
        var issues = new List<Xml130CrossIssue>();

        var byPatient = new Dictionary<string, List<Exec>>();
        foreach (var item in hosos)
        {
            var patientKey = item.Hoso.GetField("XML1", "MA_THE_BHYT") ?? item.Hoso.MaLk ?? "?";
            foreach (var row in item.Hoso.GetRows("XML3"))
            {
                if (row.Get("MA_GIUONG") != null || row.Get("MA_NHOM") == "1")
                {
                    continue;
                }
                var thYlRaw = row.Get("NGAY_TH_YL");
                if (thYlRaw == null || thYlRaw.Length < 12)
                {
                    continue; // thiếu giờ:phút — không đủ căn cứ so trùng
                }
                var start = FieldSpecValidator.ParseDate(thYlRaw[..12]);
                if (start == null)
                {
                    continue;
                }
                var end = FieldSpecValidator.ParseDate(row.Get("NGAY_KQ") is { Length: >= 12 } kq ? kq[..12] : null);
                if (end == null || end <= start)
                {
                    end = start;
                }

                if (!byPatient.TryGetValue(patientKey, out var list))
                {
                    byPatient[patientKey] = list = new List<Exec>();
                }
                list.Add(new Exec(
                    item,
                    row.Get("MA_KHOA") ?? "(không rõ khoa)",
                    row.Get("TEN_DICH_VU") ?? row.Get("MA_DICH_VU") ?? "(không rõ dịch vụ)",
                    start.Value,
                    end.Value,
                    row.RowIndex));
            }
        }

        foreach (var (_, execs) in byPatient)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (execs.Count < 2)
            {
                continue;
            }

            var ordered = execs.OrderBy(e => e.Start).ToList();
            // Một cặp khoa chỉ báo một lần cho mỗi bệnh nhân — tránh ngập khi cả loạt chỉ định trùng giờ
            var reportedPairs = new HashSet<string>();

            for (var i = 0; i < ordered.Count; i++)
            {
                for (var j = i + 1; j < ordered.Count; j++)
                {
                    var a = ordered[i];
                    var b = ordered[j];
                    if (b.Start > a.End)
                    {
                        break;
                    }
                    if (a.Khoa == b.Khoa)
                    {
                        continue; // cùng khoa — làm nhiều chỉ định liên tiếp là bình thường
                    }

                    var overlapped = (a.End > a.Start && b.Start < a.End) || a.Start == b.Start;
                    if (!overlapped)
                    {
                        continue;
                    }

                    var khoaPair = string.CompareOrdinal(a.Khoa, b.Khoa) <= 0 ? $"{a.Khoa}|{b.Khoa}" : $"{b.Khoa}|{a.Khoa}";
                    if (!reportedPairs.Add(khoaPair))
                    {
                        continue;
                    }

                    var ten = a.Hoso.Hoso.GetField("XML1", "HO_TEN") ?? "(không rõ)";
                    var sameHoso = a.Hoso.Hoso.MaLk == b.Hoso.Hoso.MaLk;

                    // Ca bắt đầu trước là gốc; ca sau là bên cần sửa giờ
                    var (anchorHoso, _, lyDo) = CrossAnchor.Pick(a.Hoso, b.Hoso, a.Start, b.Start, "bắt đầu");
                    var anchor = ReferenceEquals(anchorHoso, a.Hoso) && (!sameHoso || a.Start <= b.Start) ? a : b;
                    var other = ReferenceEquals(anchor, a) ? b : a;

                    var refs = new List<Xml130CrossHosoRef>
                    {
                        anchor.Hoso.ToRef() with
                        {
                            ThoiDiem = $"khoa {anchor.Khoa}, {anchor.Start:dd/MM/yyyy HH:mm} (XML3 dòng {anchor.RowIndex})",
                            PhatSinhTruoc = true
                        }
                    };
                    if (!sameHoso)
                    {
                        refs.Add(other.Hoso.ToRef() with
                        {
                            ThoiDiem = $"khoa {other.Khoa}, {other.Start:dd/MM/yyyy HH:mm} (XML3 dòng {other.RowIndex})",
                            PhatSinhTruoc = false
                        });
                    }

                    issues.Add(new Xml130CrossIssue
                    {
                        RuleId = RuleId,
                        Severity = ValidationSeverity.Error,
                        Message =
                            $"Bệnh nhân {ten} \"có mặt\" ở HAI KHOA cùng lúc: "
                            + $"\"{a.TenDichVu}\" tại khoa {a.Khoa} ({a.Start:dd/MM/yyyy HH:mm}"
                            + (a.End > a.Start ? $" – {a.End:HH:mm}" : "")
                            + $", XML3 dòng {a.RowIndex}, MA_LK {a.Hoso.Hoso.MaLk}, file {a.Hoso.FileName}) và "
                            + $"\"{b.TenDichVu}\" tại khoa {b.Khoa} ({b.Start:dd/MM/yyyy HH:mm}"
                            + (b.End > b.Start ? $" – {b.End:HH:mm}" : "")
                            + $", XML3 dòng {b.RowIndex}, MA_LK {b.Hoso.Hoso.MaLk}, file {b.Hoso.FileName}) — "
                            + "một người không thể đồng thời ở hai khoa, giám định sẽ soi giờ thực hiện."
                            + $" Ca {lyDo} được lấy làm gốc — cần sửa giờ ca còn lại.",
                        Suggestion =
                            "Sửa lại NGAY_TH_YL/NGAY_KQ trên HIS theo trình tự bệnh nhân di chuyển thực tế giữa các khoa/phòng "
                            + "(làm xong nơi này mới sang nơi kia), rồi xuất lại XML.",
                        XuatToanRisk = true,
                        Hosos = refs
                    });

                    if (issues.Count >= MaxIssues)
                    {
                        return issues;
                    }
                }
            }
        }

        return issues;
    }
}
