using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.CrossRules;

/// <summary>
/// Phát hiện nhiều bệnh nhân cùng nằm MỘT giường trong cùng khoảng thời gian
/// tại một khoa (case xuất toán thực tế: "Nhiều người nằm trên 1 giường
/// trong 1 ngày tại một Khoa").
///
/// Cách so sánh — theo ĐỢT nằm, không theo từng dòng ngày giường:
/// 1. Mỗi dòng ngày giường (XML3 có MA_GIUONG): bắt đầu = NGAY_TH_YL (thiếu thì
///    NGAY_YL); kết thúc = NGAY_KQ, không có thì + SO_LUONG ngày (tối thiểu 1).
/// 2. Các dòng của CÙNG một hồ sơ trên cùng khoa + giường được GỘP thành một đợt
///    nằm liên tục — tránh một cặp bệnh nhân bị báo lặp nhiều lần theo từng ngày
///    và tránh kết luận "ai trước" đổi chiều giữa các dòng.
/// 3. Hai hồ sơ khác nhau trùng khoa + giường + đợt nằm giao nhau → một vấn đề duy
///    nhất cho cặp đó; hồ sơ VÀO GIƯỜNG SỚM NHẤT được lấy làm GỐC (coi là hợp lệ),
///    hồ sơ còn lại cần rà soát. Giao tổng từ 24 giờ trở lên → Lỗi.
/// </summary>
public class BedOverlapCrossRule : IXml130CrossFileRule
{
    public string RuleId => "CROSS-GIUONG";
    public string RuleName => "Nhiều bệnh nhân trùng một giường cùng thời điểm";

    /// <summary>Tổng giao nhau dưới ngưỡng này (giờ) coi là bàn giao giường trong ngày — bỏ qua.</summary>
    private const double MinOverlapHours = 4;

    /// <summary>Chặn số vấn đề trả về để kết quả không bị ngập khi dữ liệu lỗi hàng loạt.</summary>
    private const int MaxIssues = 100;

    /// <summary>Một khoảng thời gian nằm giường.</summary>
    private sealed record Interval(DateTime Start, DateTime End);

    /// <summary>Toàn bộ đợt nằm (đã gộp) của một hồ sơ trên một giường.</summary>
    private sealed class PatientStay
    {
        public required Xml130BatchHoso Hoso { get; init; }
        public required List<Interval> Intervals { get; init; }

        /// <summary>Đơn giá ngày giường (DON_GIA của dòng ngày giường) — để gợi ý chia tiền khi nằm ghép.</summary>
        public decimal? DonGia { get; init; }

        public DateTime EarliestStart => Intervals[0].Start;

        /// <summary>Đợt nằm có giao với cửa sổ [from, to] không (dùng đếm số người nằm ghép).</summary>
        public bool IntersectsWindow(DateTime from, DateTime to)
            => Intervals.Any(i => i.Start < to && from < i.End);
    }

    public List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hosos);
        var issues = new List<Xml130CrossIssue>();

        // (khoa, giường) → danh sách đợt nằm của từng hồ sơ
        foreach (var bedGroup in CollectStays(hosos))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var (maKhoa, maGiuong) = bedGroup.Key;

            // Hồ sơ vào giường sớm nhất đứng đầu — làm GỐC khi phân xử các cặp
            var stays = bedGroup.Value.OrderBy(s => s.EarliestStart).ToList();

            for (var i = 0; i < stays.Count; i++)
            {
                for (var j = i + 1; j < stays.Count; j++)
                {
                    var goc = stays[i];   // vào trước (hoặc cùng lúc)
                    var sau = stays[j];

                    var (overlapHours, from, to) = TotalOverlap(goc.Intervals, sau.Intervals);
                    if (overlapHours < MinOverlapHours)
                    {
                        continue;
                    }

                    // Luôn chọn MỘT hồ sơ làm gốc: vào giường trước → tiếp nhận trước → mã hồ sơ
                    var (anchorHoso, _, lyDo) = CrossAnchor.Pick(
                        goc.Hoso, sau.Hoso, goc.EarliestStart, sau.EarliestStart, "vào giường");
                    var anchorStay = ReferenceEquals(anchorHoso, goc.Hoso) ? goc : sau;
                    var otherStay = ReferenceEquals(anchorHoso, goc.Hoso) ? sau : goc;

                    // Số người cùng nằm giường này trong khoảng trùng (có thể > 2 khi nằm ghép đông)
                    var soNguoi = stays.Count(s => s.IntersectsWindow(from, to));

                    issues.Add(new Xml130CrossIssue
                    {
                        RuleId = RuleId,
                        Severity = overlapHours >= 24 ? ValidationSeverity.Error : ValidationSeverity.Warning,
                        Message =
                            $"Giường {maGiuong} (khoa {maKhoa}) có {soNguoi} bệnh nhân cùng nằm trong khoảng "
                            + $"{from:dd/MM/yyyy HH:mm} – {to:dd/MM/yyyy HH:mm} (trùng tổng ~{FormatDuration(overlapHours)}): "
                            + $"{DescribePatient(goc.Hoso)} và {DescribePatient(sau.Hoso)} — "
                            + "BHXH sẽ xuất toán tiền giường trùng của một trong hai hồ sơ."
                            + $" Hồ sơ {DescribePatient(anchorStay.Hoso)} {lyDo} nên được lấy làm gốc, coi là hợp lệ — cần rà soát hồ sơ còn lại.",
                        Suggestion = BuildSuggestion(soNguoi, anchorStay.DonGia ?? otherStay.DonGia),
                        XuatToanRisk = true,
                        Hosos = new List<Xml130CrossHosoRef>
                        {
                            anchorStay.Hoso.ToRef() with
                            {
                                ThoiDiem = $"vào giường {anchorStay.EarliestStart:dd/MM/yyyy HH:mm}",
                                PhatSinhTruoc = true
                            },
                            otherStay.Hoso.ToRef() with
                            {
                                ThoiDiem = $"vào giường {otherStay.EarliestStart:dd/MM/yyyy HH:mm}",
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

    /// <summary>
    /// Gợi ý xử lý nằm ghép theo mức thanh toán của thông tư giá KCB BHYT
    /// (TT 39/2018/TT-BYT, nay là TT 22/2023/TT-BYT):
    /// - nằm ghép 2 người/giường: mỗi người thanh toán 50% giá ngày giường;
    /// - nằm ghép từ 3 người trở lên: mỗi người thanh toán 30%.
    /// Lấy được đơn giá từ hồ sơ thì tính luôn số tiền; không thì gợi ý theo tỷ lệ.
    /// </summary>
    private static string BuildSuggestion(int soNguoi, decimal? donGia)
    {
        var n = Math.Max(soNguoi, 2);
        var tyLe = n == 2 ? 0.5m : 0.3m;
        var mucText = n == 2
            ? "nằm ghép 2 người/giường → mỗi người thanh toán 50% giá ngày giường"
            : $"nằm ghép {n} người/giường (từ 3 người trở lên) → mỗi người thanh toán 30% giá ngày giường";

        string huongDan;
        if (donGia is > 0)
        {
            var moiNguoi = Math.Round(donGia.Value * tyLe, 0);
            huongDan = $"{mucText}; đơn giá {donGia.Value:N0}đ → mỗi hồ sơ chỉ được tính {moiNguoi:N0}đ/ngày cho khoảng thời gian trùng";
        }
        else
        {
            var viDu = Math.Round(100000 * tyLe, 0);
            huongDan = $"{mucText} cho khoảng thời gian trùng (vd giường 100.000đ → {viDu:N0}đ/người/ngày)";
        }

        return
            $"Nếu thực tế có nằm ghép, áp mức thanh toán theo TT 22/2023/TT-BYT: {huongDan}. "
            + "Nếu không phải nằm ghép, sửa lại mã giường hoặc thời gian sử dụng giường trên HIS cho đúng thực tế trước khi gửi cổng giám định.";
    }

    /// <summary>
    /// Gom dòng ngày giường theo (khoa, giường) rồi GỘP các dòng của cùng một hồ sơ
    /// thành các khoảng nằm liên tục (khoảng giao/chạm nhau được nhập làm một).
    /// </summary>
    private static Dictionary<(string MaKhoa, string MaGiuong), List<PatientStay>> CollectStays(
        IReadOnlyList<Xml130BatchHoso> hosos)
    {
        // (khoa, giường, hồ sơ) → các khoảng thô + đơn giá giường bắt gặp
        var raw = new Dictionary<(string, string, string), (Xml130BatchHoso Hoso, List<Interval> Intervals, decimal? DonGia)>();

        foreach (var item in hosos)
        {
            var maLk = item.Hoso.MaLk ?? $"{item.FileName}#{item.GetHashCode()}";
            foreach (var row in item.Hoso.GetRows("XML3"))
            {
                var maGiuong = row.Get("MA_GIUONG");
                if (maGiuong == null)
                {
                    continue; // không phải dòng ngày giường
                }

                var start = FieldSpecValidator.ParseDate(row.Get("NGAY_TH_YL"))
                    ?? FieldSpecValidator.ParseDate(row.Get("NGAY_YL"));
                if (start == null)
                {
                    continue;
                }

                var end = FieldSpecValidator.ParseDate(row.Get("NGAY_KQ"));
                if (end == null || end <= start)
                {
                    var soNgay = (double?)row.GetDecimal("SO_LUONG") ?? 1;
                    end = start.Value.AddDays(Math.Max(soNgay, 1));
                }

                // Tên trường giá khác nhau giữa các bản XML 130: DON_GIA (4210) /
                // DON_GIA_BH, DON_GIA_BV (130). Ưu tiên giá BHYT.
                var donGia = row.GetDecimal("DON_GIA") ?? row.GetDecimal("DON_GIA_BH") ?? row.GetDecimal("DON_GIA_BV");
                var key = (row.Get("MA_KHOA") ?? "(không rõ khoa)", maGiuong, maLk);
                if (!raw.TryGetValue(key, out var entry))
                {
                    entry = (item, new List<Interval>(), donGia);
                }
                else if (entry.DonGia == null && donGia != null)
                {
                    entry = (entry.Hoso, entry.Intervals, donGia);
                }
                raw[key] = entry;
                entry.Intervals.Add(new Interval(start.Value, end.Value));
            }
        }

        var result = new Dictionary<(string, string), List<PatientStay>>();
        foreach (var ((maKhoa, maGiuong, _), entry) in raw)
        {
            var stay = new PatientStay
            {
                Hoso = entry.Hoso,
                Intervals = MergeIntervals(entry.Intervals),
                DonGia = entry.DonGia
            };
            if (!result.TryGetValue((maKhoa, maGiuong), out var list))
            {
                result[(maKhoa, maGiuong)] = list = new List<PatientStay>();
            }
            list.Add(stay);
        }
        return result;
    }

    /// <summary>Gộp các khoảng giao/chạm nhau thành khoảng liên tục, trả về đã sắp theo thời gian.</summary>
    private static List<Interval> MergeIntervals(List<Interval> intervals)
    {
        var ordered = intervals.OrderBy(i => i.Start).ToList();
        var merged = new List<Interval> { ordered[0] };
        foreach (var current in ordered.Skip(1))
        {
            var last = merged[^1];
            if (current.Start <= last.End)
            {
                if (current.End > last.End)
                {
                    merged[^1] = last with { End = current.End };
                }
            }
            else
            {
                merged.Add(current);
            }
        }
        return merged;
    }

    /// <summary>
    /// Tổng số giờ giao nhau giữa hai danh sách khoảng (đều đã sắp xếp),
    /// kèm mốc đầu/cuối của vùng giao để hiển thị.
    /// </summary>
    private static (double Hours, DateTime From, DateTime To) TotalOverlap(
        List<Interval> a, List<Interval> b)
    {
        double hours = 0;
        DateTime? from = null, to = null;
        int i = 0, j = 0;
        while (i < a.Count && j < b.Count)
        {
            var start = Max(a[i].Start, b[j].Start);
            var end = Min(a[i].End, b[j].End);
            if (start < end)
            {
                hours += (end - start).TotalHours;
                from ??= start;
                to = to == null || end > to ? end : to;
            }
            if (a[i].End <= b[j].End) i++;
            else j++;
        }
        return (hours, from ?? DateTime.MinValue, to ?? DateTime.MinValue);
    }

    private static string DescribePatient(Xml130BatchHoso hoso)
    {
        var ten = hoso.Hoso.GetField("XML1", "HO_TEN") ?? hoso.Hoso.MaLk ?? "(không rõ)";
        return $"{ten} (MA_LK {hoso.Hoso.MaLk}, file {hoso.FileName})";
    }

    private static string FormatDuration(double hours)
        => hours >= 24 ? $"{hours / 24:0.#} ngày" : $"{hours:0.#} giờ";

    private static DateTime Min(DateTime a, DateTime b) => a <= b ? a : b;
    private static DateTime Max(DateTime a, DateTime b) => a >= b ? a : b;
}
