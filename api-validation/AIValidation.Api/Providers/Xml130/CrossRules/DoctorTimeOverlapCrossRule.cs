using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.CrossRules;

/// <summary>
/// Phát hiện MỘT người hành nghề làm việc trên NHIỀU bệnh nhân tại cùng thời điểm
/// — các case xuất toán thực tế:
/// - "Bác sĩ thực hiện y lệnh 2 nhóm DVKT tại một thời điểm (phút)":
///   NGUOI_THUC_HIEN trùng nhau, khoảng [NGAY_TH_YL, NGAY_KQ] giao nhau
///   (hoặc trùng phút bắt đầu khi không có giờ kết thúc) trên 2 hồ sơ khác nhau.
/// - "Giờ y lệnh giống nhau (phút) — cùng 1 BS trên 2 bệnh nhân khác nhau":
///   MA_BAC_SI trùng, NGAY_YL giống nhau đến từng phút — dấu hiệu sao chép y lệnh.
///
/// Chỉ xét bảng XML3 (DVKT) và chỉ so các mốc có đủ giờ:phút (12 ký tự) —
/// dữ liệu chỉ có ngày (8 ký tự) mà đem so sẽ báo sai hàng loạt.
/// Dòng ngày giường (có MA_GIUONG) được loại vì giường không cần người thực hiện
/// túc trực liên tục.
/// </summary>
public class DoctorTimeOverlapCrossRule : IXml130CrossFileRule
{
    public string RuleId => "CROSS-BACSI";
    public string RuleName => "Một người hành nghề làm việc trên nhiều bệnh nhân cùng thời điểm";

    private const int MaxIssues = 100;

    private sealed record ServiceExec(
        Xml130BatchHoso Hoso,
        string TenDichVu,
        string Khoa,
        DateTime Start,
        DateTime? End,
        int RowIndex);

    private sealed record OrderMark(Xml130BatchHoso Hoso, string TenDichVu, DateTime NgayYl);

    public List<Xml130CrossIssue> Validate(
        IReadOnlyList<Xml130BatchHoso> hosos,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hosos);
        var issues = new List<Xml130CrossIssue>();

        var execsByPerson = new Dictionary<string, List<ServiceExec>>(StringComparer.OrdinalIgnoreCase);
        var ordersByDoctor = new Dictionary<string, List<OrderMark>>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in hosos)
        {
            foreach (var row in item.Hoso.GetRows("XML3"))
            {
                if (row.Get("MA_GIUONG") != null)
                {
                    continue;
                }

                var tenDv = row.Get("TEN_DICH_VU") ?? row.Get("MA_DICH_VU") ?? "(không rõ dịch vụ)";

                // Thời gian THỰC HIỆN: người thực hiện không thể làm 2 ca giao nhau
                var thYlRaw = row.Get("NGAY_TH_YL");
                var start = ParseMinute(thYlRaw);
                if (start != null)
                {
                    var end = ParseMinute(row.Get("NGAY_KQ"));
                    var khoa = row.Get("MA_KHOA") ?? "(không rõ khoa)";
                    foreach (var person in SplitCodes(row.Get("NGUOI_THUC_HIEN")))
                    {
                        Add(execsByPerson, person, new ServiceExec(item, tenDv, khoa, start.Value, end, row.RowIndex));
                    }
                }

                // Giờ RA y lệnh: trùng đến từng phút trên nhiều bệnh nhân = dấu hiệu sao chép
                var ngayYl = ParseMinute(row.Get("NGAY_YL"));
                if (ngayYl != null)
                {
                    foreach (var doctor in SplitCodes(row.Get("MA_BAC_SI")))
                    {
                        Add(ordersByDoctor, doctor, new OrderMark(item, tenDv, ngayYl.Value));
                    }
                }
            }
        }

        FindExecutionOverlaps(execsByPerson, issues, cancellationToken);
        if (issues.Count < MaxIssues)
        {
            FindDuplicatedOrderTimes(ordersByDoctor, issues, cancellationToken);
        }

        return issues.Take(MaxIssues).ToList();
    }

    /// <summary>Cùng người thực hiện, khoảng thực hiện giao nhau (hoặc trùng phút bắt đầu) trên 2 hồ sơ khác nhau.</summary>
    private void FindExecutionOverlaps(
        Dictionary<string, List<ServiceExec>> execsByPerson,
        List<Xml130CrossIssue> issues,
        CancellationToken cancellationToken)
    {
        foreach (var (person, execs) in execsByPerson)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (execs.Count < 2)
            {
                continue;
            }

            var ordered = execs.OrderBy(e => e.Start).ToList();
            // Gộp vấn đề theo cặp hồ sơ để một ca trực trùng hàng chục dòng chỉ báo 1 lần
            var reported = new HashSet<string>();

            for (var i = 0; i < ordered.Count; i++)
            {
                for (var j = i + 1; j < ordered.Count; j++)
                {
                    var a = ordered[i];
                    var b = ordered[j];

                    // Hết khả năng giao khi b bắt đầu sau cả kết thúc (hoặc phút bắt đầu) của a
                    var aEnd = a.End ?? a.Start;
                    if (b.Start > aEnd)
                    {
                        break;
                    }
                    if (a.Hoso.Hoso.MaLk == b.Hoso.Hoso.MaLk)
                    {
                        continue;
                    }

                    // Giao nhau: hai khoảng chồng lên nhau, hoặc trùng đúng phút bắt đầu
                    var overlapped = a.End != null && b.Start < a.End
                        ? true
                        : a.Start == b.Start;
                    if (!overlapped)
                    {
                        continue;
                    }

                    var pairKey = MakePairKey(person, a.Hoso, b.Hoso);
                    if (!reported.Add(pairKey))
                    {
                        continue;
                    }

                    // Luôn chọn MỘT ca làm gốc: bắt đầu trước → tiếp nhận trước → mã hồ sơ
                    var (anchorHoso, _, lyDo) = CrossAnchor.Pick(
                        a.Hoso, b.Hoso, a.Start, b.Start, "bắt đầu thực hiện");
                    var anchor = ReferenceEquals(anchorHoso, a.Hoso) ? a : b;
                    var other = ReferenceEquals(anchorHoso, a.Hoso) ? b : a;

                    issues.Add(new Xml130CrossIssue
                    {
                        RuleId = RuleId,
                        Severity = ValidationSeverity.Error,
                        Message =
                            $"Người thực hiện {person} làm 2 dịch vụ cho 2 bệnh nhân khác nhau "
                            // Trùng đúng phút bắt đầu ≠ khung giờ giao nhau — nêu đúng bản chất
                            + (a.Start == b.Start
                                ? "tại CÙNG thời điểm: "
                                : "với khung giờ thực hiện GIAO nhau (ca trước chưa xong đã bắt đầu ca sau): ")
                            + $"\"{a.TenDichVu}\" cho {DescribePatient(a.Hoso)} (khoa {a.Khoa}, {FormatRange(a)}, XML3 dòng {a.RowIndex}) và "
                            + $"\"{b.TenDichVu}\" cho {DescribePatient(b.Hoso)} (khoa {b.Khoa}, {FormatRange(b)}, XML3 dòng {b.RowIndex}) — "
                            + "case xuất toán \"bác sĩ thực hiện y lệnh 2 nhóm DVKT tại một thời điểm\"."
                            + (a.Khoa != b.Khoa
                                ? $" Nghiêm trọng hơn: hai ca ở HAI KHOA khác nhau ({a.Khoa} và {b.Khoa}) — một người không thể có mặt hai nơi."
                                : "")
                            + $" Ca của {DescribePatient(anchor.Hoso)} {lyDo} nên được lấy làm gốc, coi là hợp lệ — cần rà soát ca còn lại.",
                        Suggestion =
                            $"Sửa giờ thực hiện (NGAY_TH_YL) của ca cần rà soát — XML3 dòng {other.RowIndex}, hồ sơ MA_LK {other.Hoso.Hoso.MaLk} — "
                            + "theo giờ làm thực tế trên HIS; một người không thể đồng thời thực hiện dịch vụ cho hai bệnh nhân.",
                        XuatToanRisk = true,
                        Hosos = new List<Xml130CrossHosoRef>
                        {
                            anchor.Hoso.ToRef() with { ThoiDiem = $"thực hiện {FormatRange(anchor)}", PhatSinhTruoc = true },
                            other.Hoso.ToRef() with { ThoiDiem = $"thực hiện {FormatRange(other)}", PhatSinhTruoc = false }
                        }
                    });

                    if (issues.Count >= MaxIssues)
                    {
                        return;
                    }
                }
            }
        }
    }

    /// <summary>Cùng bác sĩ ra y lệnh trùng đến từng phút trên nhiều bệnh nhân.</summary>
    private void FindDuplicatedOrderTimes(
        Dictionary<string, List<OrderMark>> ordersByDoctor,
        List<Xml130CrossIssue> issues,
        CancellationToken cancellationToken)
    {
        foreach (var (doctor, orders) in ordersByDoctor)
        {
            cancellationToken.ThrowIfCancellationRequested();

            foreach (var sameMinute in orders.GroupBy(o => o.NgayYl))
            {
                var patients = sameMinute
                    .GroupBy(o => o.Hoso.Hoso.MaLk)
                    .Select(g => g.First())
                    .ToList();
                if (patients.Count < 2)
                {
                    continue;
                }

                // Giờ y lệnh trùng hệt nhau → chọn gốc theo giờ tiếp nhận vào viện, rồi mã hồ sơ
                var ordered = patients
                    .OrderBy(p => CrossAnchor.NgayVao(p.Hoso) ?? DateTime.MaxValue)
                    .ThenBy(p => p.Hoso.Hoso.MaLk, StringComparer.Ordinal)
                    .ToList();
                var goc = ordered[0];

                var names = string.Join(", ", ordered.Take(4).Select(p => DescribePatient(p.Hoso)));
                issues.Add(new Xml130CrossIssue
                {
                    RuleId = "CROSS-BACSI-YL",
                    Severity = ValidationSeverity.Warning,
                    Message =
                        $"Bác sĩ {doctor} ra y lệnh cho {ordered.Count} bệnh nhân trùng nhau đến từng phút "
                        + $"({sameMinute.Key:dd/MM/yyyy HH:mm}): {names} — dấu hiệu sao chép y lệnh, "
                        + "giám định viên sẽ đối chiếu (case \"giờ y lệnh giống nhau (phút) cùng 1 BS\")."
                        + $" Hồ sơ {DescribePatient(goc.Hoso)} tiếp nhận vào viện sớm nhất nên được lấy làm gốc — cần rà soát các hồ sơ còn lại.",
                    Suggestion = "Rà soát quy trình nhập y lệnh: không copy y lệnh giữa các bệnh nhân, ghi đúng giờ chỉ định thực tế.",
                    XuatToanRisk = true,
                    Hosos = ordered
                        .Select((p, index) => p.Hoso.ToRef() with
                        {
                            ThoiDiem = $"y lệnh {p.NgayYl:dd/MM/yyyy HH:mm}",
                            PhatSinhTruoc = index == 0
                        })
                        .ToList()
                });

                if (issues.Count >= MaxIssues)
                {
                    return;
                }
            }
        }
    }

    /// <summary>Khung giờ hiển thị: "02/01/2026 12:22" hoặc "25/06/2026 08:43–09:11" khi có giờ kết thúc.</summary>
    private static string FormatRange(ServiceExec exec)
        => exec.End != null && exec.End > exec.Start
            ? $"{exec.Start:dd/MM/yyyy HH:mm}–{exec.End:HH:mm}"
            : $"{exec.Start:dd/MM/yyyy HH:mm}";

    /// <summary>Chỉ nhận mốc thời gian đủ giờ:phút (12+ ký tự số) — tránh so sánh nhầm dữ liệu chỉ có ngày.</summary>
    private static DateTime? ParseMinute(string? raw)
        => raw != null && raw.Length >= 12 ? FieldSpecValidator.ParseDate(raw[..12]) : null;

    /// <summary>Một ô có thể chứa nhiều mã CCHN phân cách ';' — tách và chuẩn hóa.</summary>
    private static IEnumerable<string> SplitCodes(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            yield break;
        }
        foreach (var part in value.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            yield return part;
        }
    }

    private static void Add<T>(Dictionary<string, List<T>> map, string key, T item)
    {
        if (!map.TryGetValue(key, out var list))
        {
            map[key] = list = new List<T>();
        }
        list.Add(item);
    }

    private static string MakePairKey(string person, Xml130BatchHoso a, Xml130BatchHoso b)
    {
        var keys = new[] { a.Hoso.MaLk ?? a.FileName, b.Hoso.MaLk ?? b.FileName };
        Array.Sort(keys, StringComparer.Ordinal);
        return $"{person}|{keys[0]}|{keys[1]}";
    }

    private static string DescribePatient(Xml130BatchHoso hoso)
    {
        var ten = hoso.Hoso.GetField("XML1", "HO_TEN") ?? hoso.Hoso.MaLk ?? "(không rõ)";
        return $"{ten} (MA_LK {hoso.Hoso.MaLk}, file {hoso.FileName})";
    }
}
