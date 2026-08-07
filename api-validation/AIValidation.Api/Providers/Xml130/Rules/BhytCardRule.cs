using System.Text.RegularExpressions;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra thông tin thẻ BHYT trên bảng XML1:
/// - Cấu trúc mã thẻ (15 ký tự: 2 chữ đối tượng + 1 số mức hưởng + 2 số mã tỉnh + 10 số định danh,
///   hoặc mã thẻ mới 10 số theo định danh cá nhân).
/// - GT_THE_TU &lt;= GT_THE_DEN.
/// - Thẻ còn hạn tại thời điểm vào viện và ra viện.
/// - MA_DKBD đủ 5 ký tự.
/// </summary>
public partial class BhytCardRule : IXml130Rule
{
    public string RuleId => "BHYT-CARD";
    public string RuleName => "Kiểm tra thẻ BHYT";

    [GeneratedRegex(@"^[A-Z]{2}[0-9]{13}$")]
    private static partial Regex TheBhyt15Regex();

    [GeneratedRegex(@"^[0-9]{10}$")]
    private static partial Regex TheBhyt10Regex();

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var maThe = hoso.GetField("XML1", "MA_THE_BHYT");
        var gtTu = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "GT_THE_TU"));
        var gtDen = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "GT_THE_DEN"));
        var ngayVao = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_VAO"));
        var ngayRa = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_RA"));
        var maDkbd = hoso.GetField("XML1", "MA_DKBD");

        // Cấu trúc mã thẻ
        if (maThe != null && !TheBhyt15Regex().IsMatch(maThe.ToUpperInvariant()) && !TheBhyt10Regex().IsMatch(maThe))
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C001",
                Severity = ValidationSeverity.Error,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "MA_THE_BHYT",
                Value = maThe,
                Message = $"Mã thẻ BHYT \"{maThe}\" sai cấu trúc (chuẩn: 2 chữ cái + 13 số, hoặc 10 số định danh) — hồ sơ sẽ bị cổng giám định từ chối.",
                Suggestion = "Tra cứu lại thẻ trên Cổng tiếp nhận dữ liệu giám định BHYT.",
                XuatToanRisk = true
            });
        }

        // GT_THE_TU <= GT_THE_DEN
        if (gtTu.HasValue && gtDen.HasValue && gtTu > gtDen)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C002",
                Severity = ValidationSeverity.Error,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "GT_THE_TU;GT_THE_DEN",
                Message = $"Ngày bắt đầu hạn thẻ ({gtTu:dd/MM/yyyy}) sau ngày hết hạn ({gtDen:dd/MM/yyyy}).",
                XuatToanRisk = true
            });
        }

        // Thẻ hết hạn trước khi vào viện
        if (gtDen.HasValue && ngayVao.HasValue && ngayVao.Value.Date > gtDen.Value.Date)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C003",
                Severity = ValidationSeverity.Error,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "GT_THE_DEN;NGAY_VAO",
                Value = gtDen.Value.ToString("dd/MM/yyyy"),
                Message = $"Thẻ BHYT hết hạn ({gtDen:dd/MM/yyyy}) trước thời điểm vào viện ({ngayVao:dd/MM/yyyy HH:mm}) — toàn bộ chi phí BHYT sẽ bị xuất toán.",
                Suggestion = "Kiểm tra lại hạn thẻ hoặc chuyển hồ sơ sang đối tượng thu phí.",
                XuatToanRisk = true
            });
        }

        // Thẻ chưa có hiệu lực tại ngày vào viện
        if (gtTu.HasValue && ngayVao.HasValue && ngayVao.Value.Date < gtTu.Value.Date)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C004",
                Severity = ValidationSeverity.Error,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "GT_THE_TU;NGAY_VAO",
                Message = $"Thẻ BHYT chỉ có hiệu lực từ {gtTu:dd/MM/yyyy}, sau thời điểm vào viện ({ngayVao:dd/MM/yyyy}) — chi phí trước hiệu lực thẻ bị xuất toán.",
                XuatToanRisk = true
            });
        }

        // Thẻ hết hạn giữa đợt điều trị
        if (gtDen.HasValue && ngayVao.HasValue && ngayRa.HasValue
            && ngayVao.Value.Date <= gtDen.Value.Date && ngayRa.Value.Date > gtDen.Value.Date)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C005",
                Severity = ValidationSeverity.Warning,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "GT_THE_DEN;NGAY_RA",
                Message = $"Thẻ BHYT hết hạn ({gtDen:dd/MM/yyyy}) giữa đợt điều trị (ra viện {ngayRa:dd/MM/yyyy}) — phần chi phí sau ngày hết hạn có nguy cơ xuất toán (trừ trường hợp được hưởng tiếp 15 ngày theo quy định).",
                XuatToanRisk = true
            });
        }

        // MA_DKBD 5 ký tự
        if (maDkbd != null && maDkbd.Length != 5)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-C006",
                Severity = ValidationSeverity.Error,
                Group = "PatientInfo",
                Table = "XML1",
                Field = "MA_DKBD",
                Value = maDkbd,
                Message = $"Mã nơi đăng ký KCB ban đầu \"{maDkbd}\" phải đủ 5 ký tự.",
                XuatToanRisk = true
            });
        }

        return Task.FromResult(issues);
    }
}
