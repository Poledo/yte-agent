using System.Text.RegularExpressions;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.CrossRules;

/// <summary>
/// Phát hiện bệnh nhân LĨNH LẠI cùng một thuốc khi đợt cấp trước CHƯA dùng hết
/// (vd: 1/7 lĩnh thuốc B đủ uống đến 5/7, nhưng 4/7 đã lĩnh lại thuốc B) —
/// BHXH xuất toán phần cấp trùng ngày.
///
/// XML2 không có cột "số ngày dùng" nên số ngày được ƯỚC LƯỢNG:
///   số ngày = SO_LUONG ÷ (liều mỗi lần × số lần/ngày, parse từ LIEU_DUNG/CACH_DUNG).
/// Chỉ áp dụng cho thuốc đếm được theo lần dùng (viên, gói, ống...); dạng
/// lọ/tuýp/chai (nhỏ, bôi) không ước được số ngày nên bỏ qua — tránh báo sai.
/// Chỉ so hai lần lĩnh thuộc HAI hồ sơ khác nhau (nội trú cấp hằng ngày trong
/// cùng hồ sơ là bình thường).
/// </summary>
public partial class DrugRefillOverlapCrossRule : IXml130CrossFileRule
{
    public string RuleId => "CROSS-THUOC";
    public string RuleName => "Lĩnh trùng thuốc khi đợt cấp trước chưa dùng hết";

    private const int MaxIssues = 100;

    /// <summary>Số ngày ước lượng vượt mức này coi là parse liều sai — bỏ qua cho an toàn.</summary>
    private const double MaxPlausibleDays = 120;

    /// <summary>Đơn vị tính đếm được theo lần dùng — ước lượng được số ngày.</summary>
    private static readonly string[] CountableUnits = { "viên", "gói", "ống", "túi", "gam", "vien", "goi", "ong", "tui" };

    [GeneratedRegex(@"(\d+(?:[.,]\d+)?)\s*(?:viên|vien|gói|goi|ống|ong|túi|tui)", RegexOptions.IgnoreCase)]
    private static partial Regex PerDoseRegex();

    [GeneratedRegex(@"(\d+)\s*lần", RegexOptions.IgnoreCase)]
    private static partial Regex TimesPerDayRegex();

    /// <summary>Số ngày ghi rõ trong liều: "5 ngày, sáng 2 viên..." (không khớp "ngày 6 lần", "2 lần/ngày").</summary>
    [GeneratedRegex(@"(\d+)\s*ngày", RegexOptions.IgnoreCase)]
    private static partial Regex ExplicitDaysRegex();

    private sealed record Dispense(
        Xml130BatchHoso Hoso,
        string MaThuoc,
        string TenThuoc,
        string DonVi,
        string LieuDung,
        DateTime NgayYl,
        double SoLuong,
        double DaysSupply,
        int RowIndex);

    public List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hosos);
        var issues = new List<Xml130CrossIssue>();

        // (bệnh nhân, mã thuốc) → các lần lĩnh có ước được số ngày dùng
        var byPatientDrug = new Dictionary<(string, string), List<Dispense>>();
        foreach (var item in hosos)
        {
            var patientKey = item.Hoso.GetField("XML1", "MA_THE_BHYT") ?? item.Hoso.MaLk ?? "?";
            foreach (var row in item.Hoso.GetRows("XML2"))
            {
                var dispense = BuildDispense(item, row);
                if (dispense == null)
                {
                    continue;
                }
                var key = (patientKey, dispense.MaThuoc);
                if (!byPatientDrug.TryGetValue(key, out var list))
                {
                    byPatientDrug[key] = list = new List<Dispense>();
                }
                list.Add(dispense);
            }
        }

        foreach (var ((_, _), dispenses) in byPatientDrug)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (dispenses.Count < 2)
            {
                continue;
            }

            var ordered = dispenses.OrderBy(d => d.NgayYl).ToList();
            for (var i = 0; i < ordered.Count - 1; i++)
            {
                var prev = ordered[i];
                // Ngày dùng hết thuốc của lần cấp trước (tính theo NGÀY, không theo giờ)
                var prevEnd = prev.NgayYl.Date.AddDays(prev.DaysSupply);

                for (var j = i + 1; j < ordered.Count; j++)
                {
                    var next = ordered[j];
                    if (next.NgayYl.Date >= prevEnd)
                    {
                        break; // đã hết thuốc — các lần sau càng không trùng với prev
                    }
                    if (next.Hoso.Hoso.MaLk == prev.Hoso.Hoso.MaLk)
                    {
                        continue; // cùng hồ sơ (nội trú cấp hằng ngày) — bình thường
                    }

                    var overlapDays = (prevEnd - next.NgayYl.Date).TotalDays;
                    var ten = prev.Hoso.Hoso.GetField("XML1", "HO_TEN") ?? "(không rõ)";

                    issues.Add(new Xml130CrossIssue
                    {
                        RuleId = RuleId,
                        Severity = ValidationSeverity.Warning,
                        Message =
                            $"Bệnh nhân {ten} lĩnh TRÙNG thuốc \"{prev.TenThuoc}\" ({prev.MaThuoc}): "
                            + $"ngày {prev.NgayYl:dd/MM/yyyy} đã cấp {prev.SoLuong:0.##} {prev.DonVi} — theo liều \"{prev.LieuDung}\" "
                            + $"ước đủ dùng đến hết {prevEnd.AddDays(-1):dd/MM/yyyy} (XML2 dòng {prev.RowIndex}, MA_LK {prev.Hoso.Hoso.MaLk}, file {prev.Hoso.FileName}), "
                            + $"nhưng ngày {next.NgayYl:dd/MM/yyyy} đã lĩnh lại {next.SoLuong:0.##} {next.DonVi} "
                            + $"(XML2 dòng {next.RowIndex}, MA_LK {next.Hoso.Hoso.MaLk}, file {next.Hoso.FileName}) — "
                            + $"trùng ~{overlapDays:0.#} ngày thuốc, BHXH sẽ xuất toán phần cấp trùng. "
                            + $"Lần cấp ngày {prev.NgayYl:dd/MM/yyyy} là gốc (hợp lệ) — cần rà soát lần lĩnh lại.",
                        Suggestion =
                            $"Sửa lần lĩnh ngày {next.NgayYl:dd/MM/yyyy}: giảm số lượng cho khớp số ngày còn thiếu, hoặc lùi ngày cấp sau {prevEnd.AddDays(-1):dd/MM/yyyy}. "
                            + "Nếu cấp lại có lý do (mất thuốc, đổi phác đồ, nôn trớ...) thì ghi rõ trong bệnh án để giải trình giám định.",
                        XuatToanRisk = true,
                        Hosos = new List<Xml130CrossHosoRef>
                        {
                            prev.Hoso.ToRef() with
                            {
                                ThoiDiem = $"cấp {prev.NgayYl:dd/MM/yyyy} (đủ dùng đến {prevEnd.AddDays(-1):dd/MM})",
                                PhatSinhTruoc = true
                            },
                            next.Hoso.ToRef() with
                            {
                                ThoiDiem = $"lĩnh lại {next.NgayYl:dd/MM/yyyy}",
                                PhatSinhTruoc = false
                            }
                        }
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

    /// <summary>Dựng bản ghi lĩnh thuốc nếu ước lượng được số ngày dùng; null nếu không.</summary>
    private static Dispense? BuildDispense(Xml130BatchHoso item, Xml130Row row)
    {
        var maThuoc = row.Get("MA_THUOC");
        var ngayYl = FieldSpecValidator.ParseDate(row.Get("NGAY_YL"));
        var soLuong = (double?)row.GetDecimal("SO_LUONG");
        if (maThuoc == null || ngayYl == null || soLuong is not > 0)
        {
            return null;
        }

        var donVi = row.Get("DON_VI_TINH") ?? "";
        // HIS thường xuất LIEU_DUNG và CACH_DUNG giống hệt nhau — không nối đôi
        // kẻo cộng liều 2 lần ("Sáng 2 Viên, Chiều 2 Viên" thành 8 viên/ngày)
        var lieu = (row.Get("LIEU_DUNG") ?? "").Trim();
        var cach = (row.Get("CACH_DUNG") ?? "").Trim();
        var lieuDung = string.Equals(lieu, cach, StringComparison.OrdinalIgnoreCase)
            ? lieu
            : $"{lieu} {cach}".Trim();
        var days = EstimateDaysSupply(soLuong.Value, donVi, lieuDung);
        if (days == null)
        {
            return null;
        }

        return new Dispense(
            item,
            maThuoc,
            row.Get("TEN_THUOC") ?? maThuoc,
            donVi,
            lieuDung,
            ngayYl.Value,
            soLuong.Value,
            days.Value,
            row.RowIndex);
    }

    /// <summary>
    /// Ước số ngày dùng, theo thứ tự tin cậy:
    /// 1. Số ngày GHI RÕ trong liều ("5 ngày, Sáng 2 Viên, Chiều 2 Viên" → 5 ngày) — tin dùng trực tiếp.
    /// 2. SO_LUONG ÷ tổng liều/ngày, trong đó tổng liều/ngày:
    ///    - nhiều mốc liều ("Sáng 2 Viên, Chiều 2 Viên") → CỘNG các mốc (4 viên/ngày);
    ///    - một mốc + số lần ("1 viên x 3 lần/ngày") → nhân (3 viên/ngày);
    ///    - chỉ có số lần ("ngày 2 lần") → coi 1 đơn vị/lần.
    /// Đơn vị không đếm được (lọ, tuýp, chai...) → null (không ước được).
    /// </summary>
    internal static double? EstimateDaysSupply(double soLuong, string donVi, string lieuDung)
    {
        var unit = donVi.Trim().ToLowerInvariant();
        if (!CountableUnits.Any(u => unit.Contains(u)))
        {
            return null;
        }

        // 1) "5 ngày, ..." — bác sĩ đã ghi số ngày, không cần ước
        var daysMatch = ExplicitDaysRegex().Match(lieuDung);
        if (daysMatch.Success
            && double.TryParse(daysMatch.Groups[1].Value, out var explicitDays)
            && explicitDays is > 0 and <= MaxPlausibleDays)
        {
            return explicitDays;
        }

        // 2) Tổng liều mỗi ngày từ các mốc "N viên/gói/ống"
        var doseValues = PerDoseRegex().Matches(lieuDung)
            .Select(m => double.TryParse(
                m.Groups[1].Value.Replace(',', '.'),
                System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture,
                out var v) && v > 0 ? v : 0)
            .Where(v => v > 0)
            .ToList();

        double timesPerDay = 1;
        var timesMatch = TimesPerDayRegex().Match(lieuDung);
        if (timesMatch.Success && double.TryParse(timesMatch.Groups[1].Value, out var parsedTimes) && parsedTimes > 0)
        {
            timesPerDay = parsedTimes;
        }

        var dailyDose = doseValues.Count switch
        {
            >= 2 => doseValues.Sum(),          // "Sáng 2 Viên, Chiều 2 Viên" → 4/ngày
            1 => doseValues[0] * timesPerDay,  // "1 viên x 3 lần/ngày" → 3/ngày
            _ => timesPerDay                   // "ngày 2 lần" → 2 đơn vị/ngày
        };
        if (dailyDose <= 0)
        {
            return null;
        }

        var days = soLuong / dailyDose;
        return days is > 0 and <= MaxPlausibleDays ? days : null;
    }
}
