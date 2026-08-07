using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.CrossRules;

/// <summary>
/// Đối chiếu các hồ sơ của CÙNG một bệnh nhân (theo mã thẻ BHYT):
/// - Hai đợt điều trị chồng thời gian [NGAY_VAO, NGAY_RA] — case xuất toán thực tế
///   "Trùng chi phí tiền giường và các chi phí khác giữa 2 đợt điều trị".
/// - Khám chữa bệnh hơn 2 lần trong cùng một tháng — case "Bệnh mãn tính KCB
///   nhiều hơn 2 lần trong 1 tháng" (chỉ cảnh báo rà soát, vì bệnh cấp tính
///   tái khám nhiều lần vẫn hợp lệ).
/// </summary>
public class PatientEpisodeOverlapCrossRule : IXml130CrossFileRule
{
    public string RuleId => "CROSS-BENHNHAN";
    public string RuleName => "Cùng bệnh nhân: đợt điều trị chồng nhau / KCB dày bất thường";

    private const int MaxIssues = 100;

    private sealed record Episode(Xml130BatchHoso Hoso, DateTime Vao, DateTime Ra);

    public List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hosos);
        var issues = new List<Xml130CrossIssue>();

        foreach (var group in hosos
            .Where(h => h.Hoso.GetField("XML1", "MA_THE_BHYT") != null)
            .GroupBy(h => h.Hoso.GetField("XML1", "MA_THE_BHYT")!, StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Loại các bản trùng hệt (cùng MA_LK — vd người dùng đính kèm 1 file 2 lần)
            var records = group
                .GroupBy(h => h.Hoso.MaLk ?? Guid.NewGuid().ToString())
                .Select(g => g.First())
                .ToList();
            if (records.Count < 2)
            {
                continue;
            }

            FindOverlappingEpisodes(records, issues);
            if (issues.Count >= MaxIssues)
            {
                break;
            }
            FindFrequentVisits(records, issues);
            if (issues.Count >= MaxIssues)
            {
                break;
            }
        }

        return issues.Take(MaxIssues).ToList();
    }

    /// <summary>Hai đợt điều trị của cùng bệnh nhân giao nhau về thời gian.</summary>
    private void FindOverlappingEpisodes(List<Xml130BatchHoso> records, List<Xml130CrossIssue> issues)
    {
        var episodes = records
            .Select(h => new
            {
                Hoso = h,
                Vao = FieldSpecValidator.ParseDate(h.Hoso.GetField("XML1", "NGAY_VAO")),
                Ra = FieldSpecValidator.ParseDate(h.Hoso.GetField("XML1", "NGAY_RA"))
            })
            .Where(e => e.Vao != null && e.Ra != null && e.Ra >= e.Vao)
            .Select(e => new Episode(e.Hoso, e.Vao!.Value, e.Ra!.Value))
            .OrderBy(e => e.Vao)
            .ToList();

        for (var i = 0; i < episodes.Count; i++)
        {
            for (var j = i + 1; j < episodes.Count; j++)
            {
                var a = episodes[i];
                var b = episodes[j];
                if (b.Vao >= a.Ra)
                {
                    break;
                }

                var ten = a.Hoso.Hoso.GetField("XML1", "HO_TEN") ?? "(không rõ)";

                // Luôn chọn MỘT đợt làm gốc: tiếp nhận trước → mã hồ sơ
                var (anchorHoso, _, lyDo) = CrossAnchor.Pick(a.Hoso, b.Hoso, a.Vao, b.Vao, "tiếp nhận");
                var anchor = ReferenceEquals(anchorHoso, a.Hoso) ? a : b;
                var other = ReferenceEquals(anchorHoso, a.Hoso) ? b : a;

                issues.Add(new Xml130CrossIssue
                {
                    RuleId = RuleId,
                    Severity = ValidationSeverity.Error,
                    Message =
                        $"Bệnh nhân {ten} có 2 đợt điều trị CHỒNG thời gian: "
                        + $"MA_LK {a.Hoso.Hoso.MaLk} ({a.Vao:dd/MM/yyyy HH:mm} – {a.Ra:dd/MM/yyyy HH:mm}, file {a.Hoso.FileName}) và "
                        + $"MA_LK {b.Hoso.Hoso.MaLk} ({b.Vao:dd/MM/yyyy HH:mm} – {b.Ra:dd/MM/yyyy HH:mm}, file {b.Hoso.FileName}) — "
                        + "nguy cơ trùng chi phí tiền giường và các chi phí khác giữa 2 đợt (case xuất toán thực tế)."
                        + $" Đợt MA_LK {anchor.Hoso.Hoso.MaLk} (file {anchor.Hoso.FileName}) {lyDo} nên được lấy làm gốc, coi là hợp lệ — cần rà soát đợt còn lại.",
                    Suggestion = "Kiểm tra lại ngày vào/ra của hai đợt trên HIS; gộp hoặc điều chỉnh trước khi gửi cổng giám định.",
                    XuatToanRisk = true,
                    Hosos = new List<Xml130CrossHosoRef>
                    {
                        anchor.Hoso.ToRef() with { ThoiDiem = $"tiếp nhận {anchor.Vao:dd/MM/yyyy HH:mm}", PhatSinhTruoc = true },
                        other.Hoso.ToRef() with { ThoiDiem = $"tiếp nhận {other.Vao:dd/MM/yyyy HH:mm}", PhatSinhTruoc = false }
                    }
                });

                if (issues.Count >= MaxIssues)
                {
                    return;
                }
            }
        }
    }

    /// <summary>Cùng bệnh nhân có hơn 2 hồ sơ trong một tháng (theo NGAY_VAO).</summary>
    private void FindFrequentVisits(List<Xml130BatchHoso> records, List<Xml130CrossIssue> issues)
    {
        foreach (var month in records
            .Select(h => new { Hoso = h, Vao = FieldSpecValidator.ParseDate(h.Hoso.GetField("XML1", "NGAY_VAO")) })
            .Where(e => e.Vao != null)
            .GroupBy(e => (e.Vao!.Value.Year, e.Vao.Value.Month)))
        {
            var visits = month.ToList();
            if (visits.Count <= 2)
            {
                continue;
            }

            var first = visits[0].Hoso;
            var ten = first.Hoso.GetField("XML1", "HO_TEN") ?? "(không rõ)";
            issues.Add(new Xml130CrossIssue
            {
                RuleId = "CROSS-BENHNHAN-TS",
                Severity = ValidationSeverity.Warning,
                Message =
                    $"Bệnh nhân {ten} có {visits.Count} hồ sơ KCB trong tháng {month.Key.Month:00}/{month.Key.Year} — "
                    + "nếu là bệnh mãn tính, giám định sẽ soi theo case \"bệnh mãn tính KCB nhiều hơn 2 lần trong 1 tháng\".",
                Suggestion = "Rà soát lý do khám lại; bệnh mãn tính nên kê đơn đủ liều theo quy định thay vì hẹn khám nhiều lần trong tháng.",
                XuatToanRisk = false,
                Hosos = visits
                    .Select(v => v.Hoso.ToRef() with { ThoiDiem = $"tiếp nhận {v.Vao:dd/MM/yyyy}" })
                    .ToList()
            });

            if (issues.Count >= MaxIssues)
            {
                return;
            }
        }
    }
}
