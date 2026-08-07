using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra logic thời gian của hồ sơ:
/// - NGAY_SINH &lt;= NGAY_VAO, tuổi 0..120.
/// - NGAY_VAO &lt;= NGAY_RA, NGAY_TTOAN &gt;= NGAY_RA.
/// - SO_NGAY_DTRI khớp khoảng vào–ra (nội trú).
/// - Khám ngoại trú quá nhanh (&lt; 5 phút) — dấu hiệu bị giám định chú ý.
/// - NGAY_YL / NGAY_TH_YL / NGAY_KQ của dòng chi tiết nằm trong đợt điều trị.
/// </summary>
public class TimeSequenceRule : IXml130Rule
{
    public string RuleId => "TIME-SEQ";
    public string RuleName => "Kiểm tra logic thời gian";

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var ngaySinh = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_SINH"));
        var ngayVao = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_VAO"));
        var ngayRa = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_RA"));
        var ngayTtoan = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_TTOAN"));
        var maLoaiKcb = hoso.GetField("XML1", "MA_LOAI_KCB");

        // Ngày sinh sau ngày vào viện / tuổi bất hợp lý
        if (ngaySinh.HasValue && ngayVao.HasValue)
        {
            if (ngaySinh > ngayVao)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-T001",
                    Severity = ValidationSeverity.Error,
                    Group = "PatientInfo",
                    Table = "XML1",
                    Field = "NGAY_SINH;NGAY_VAO",
                    Message = $"Ngày sinh ({ngaySinh:dd/MM/yyyy}) sau ngày vào viện ({ngayVao:dd/MM/yyyy}) — dữ liệu chắc chắn sai.",
                    XuatToanRisk = true
                });
            }
            else
            {
                var age = (int)((ngayVao.Value - ngaySinh.Value).TotalDays / 365.25);
                if (age > 120)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML1-T002",
                        Severity = ValidationSeverity.Warning,
                        Group = "PatientInfo",
                        Table = "XML1",
                        Field = "NGAY_SINH",
                        Value = ngaySinh.Value.ToString("dd/MM/yyyy"),
                        Message = $"Tuổi bệnh nhân tính ra {age} — kiểm tra lại năm sinh.",
                        XuatToanRisk = false
                    });
                }
            }
        }

        // NGAY_VAO <= NGAY_RA
        if (ngayVao.HasValue && ngayRa.HasValue && ngayVao > ngayRa)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-T003",
                Severity = ValidationSeverity.Error,
                Group = "Time",
                Table = "XML1",
                Field = "NGAY_VAO;NGAY_RA",
                Message = $"Thời điểm vào viện ({ngayVao:dd/MM/yyyy HH:mm}) sau thời điểm ra viện ({ngayRa:dd/MM/yyyy HH:mm}).",
                XuatToanRisk = true
            });
        }

        // NGAY_TTOAN >= NGAY_RA
        if (ngayTtoan.HasValue && ngayRa.HasValue && ngayTtoan < ngayRa)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-T004",
                Severity = ValidationSeverity.Warning,
                Group = "Time",
                Table = "XML1",
                Field = "NGAY_TTOAN;NGAY_RA",
                Message = $"Ngày thanh toán ({ngayTtoan:dd/MM/yyyy HH:mm}) trước thời điểm ra viện ({ngayRa:dd/MM/yyyy HH:mm}).",
                XuatToanRisk = false
            });
        }

        // SO_NGAY_DTRI khớp khoảng vào–ra (áp dụng nội trú: MA_LOAI_KCB 02, 03)
        var soNgayDtri = hoso.GetField("XML1", "SO_NGAY_DTRI");
        if (soNgayDtri != null && int.TryParse(soNgayDtri, out var soNgay)
            && ngayVao.HasValue && ngayRa.HasValue
            && maLoaiKcb is "02" or "03")
        {
            var actual = Math.Max(1, (int)Math.Ceiling((ngayRa.Value.Date - ngayVao.Value.Date).TotalDays));
            if (Math.Abs(actual - soNgay) > 1)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-T005",
                    Severity = ValidationSeverity.Warning,
                    Group = "Time",
                    Table = "XML1",
                    Field = "SO_NGAY_DTRI",
                    Value = soNgayDtri,
                    Message = $"Số ngày điều trị kê khai ({soNgay}) lệch với khoảng vào–ra viện (~{actual} ngày) — giám định viên sẽ đối chiếu tiền giường.",
                    XuatToanRisk = true
                });
            }
        }

        // Khám ngoại trú quá nhanh
        if (maLoaiKcb == "01" && ngayVao.HasValue && ngayRa.HasValue)
        {
            var minutes = (ngayRa.Value - ngayVao.Value).TotalMinutes;
            if (minutes >= 0 && minutes < 5)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-T006",
                    Severity = ValidationSeverity.Warning,
                    Group = "Time",
                    Table = "XML1",
                    Field = "NGAY_VAO;NGAY_RA",
                    Value = $"{minutes:0} phút",
                    Message = $"Thời gian khám chỉ {minutes:0} phút (vào {ngayVao:HH:mm} – ra {ngayRa:HH:mm}) — quá ngắn so với quy trình khám, dễ bị giám định đánh giá khám hình thức và xuất toán tiền khám.",
                    Suggestion = "Rà soát lại giờ vào/ra trên phần mềm HIS trước khi đẩy cổng.",
                    XuatToanRisk = true
                });
            }
        }

        // Ngày y lệnh của các dòng chi tiết (XML2 thuốc, XML3 DVKT)
        foreach (var tableId in new[] { "XML2", "XML3" })
        {
            foreach (var row in hoso.GetRows(tableId))
            {
                cancellationToken.ThrowIfCancellationRequested();
                var ngayYl = FieldSpecValidator.ParseDate(row.Get("NGAY_YL"));
                var ngayThYl = FieldSpecValidator.ParseDate(row.Get("NGAY_TH_YL"));
                var ngayKq = FieldSpecValidator.ParseDate(row.Get("NGAY_KQ"));
                var group = tableId == "XML2" ? "Drug" : "Service";

                if (ngayYl.HasValue && ngayVao.HasValue && ngayRa.HasValue
                    && (ngayYl < ngayVao || ngayYl > ngayRa))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-T001",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "NGAY_YL",
                        RowIndex = row.RowIndex,
                        Value = row.Get("NGAY_YL"),
                        Message = $"[{tableId} dòng {row.RowIndex}] Ngày y lệnh ({ngayYl:dd/MM/yyyy HH:mm}) nằm ngoài đợt điều trị ({ngayVao:dd/MM HH:mm} – {ngayRa:dd/MM HH:mm}) — chi phí dòng này sẽ bị xuất toán.",
                        XuatToanRisk = true
                    });
                }

                if (ngayThYl.HasValue && ngayYl.HasValue && ngayThYl < ngayYl)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-T002",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "NGAY_TH_YL",
                        RowIndex = row.RowIndex,
                        Message = $"[{tableId} dòng {row.RowIndex}] Thời điểm thực hiện y lệnh trước thời điểm ra y lệnh.",
                        XuatToanRisk = true
                    });
                }

                if (ngayKq.HasValue && ngayYl.HasValue && ngayKq < ngayYl)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-T003",
                        Severity = ValidationSeverity.Warning,
                        Group = group,
                        Table = tableId,
                        Field = "NGAY_KQ",
                        RowIndex = row.RowIndex,
                        Message = $"[{tableId} dòng {row.RowIndex}] Ngày trả kết quả trước ngày ra y lệnh.",
                        XuatToanRisk = false
                    });
                }
            }
        }

        return Task.FromResult(issues);
    }
}
