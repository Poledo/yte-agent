using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra logic hình thức khám chữa bệnh:
/// - Ngoại trú (MA_LOAI_KCB=01): không có NGAY_VAO_NOI_TRU, SO_NGAY_DTRI thường bằng 0.
/// - Nội trú: phải có NGAY_VAO_NOI_TRU và MA_LOAI_RV.
/// - Có giấy chuyển tuyến (XML13) thì XML1.GIAY_CHUYEN_TUYEN không được trống và MA_CSKCB_DEN bắt buộc.
/// - Giấy hẹn khám lại (XML14): NGAY_HEN_KL sau ngày ra viện.
/// </summary>
public class KcbLogicRule : IXml130Rule
{
    public string RuleId => "KCB-LOGIC";
    public string RuleName => "Kiểm tra logic hình thức KCB";

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var maLoaiKcb = hoso.GetField("XML1", "MA_LOAI_KCB");
        var ngayVaoNoiTru = hoso.GetField("XML1", "NGAY_VAO_NOI_TRU");
        var soNgayDtri = hoso.GetField("XML1", "SO_NGAY_DTRI");
        var giayChuyenTuyen = hoso.GetField("XML1", "GIAY_CHUYEN_TUYEN");
        var ngayRa = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_RA"));

        // Ngoại trú không có ngày vào nội trú
        if (maLoaiKcb == "01" && ngayVaoNoiTru != null)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-K001",
                Severity = ValidationSeverity.Warning,
                Group = "Admin",
                Table = "XML1",
                Field = "NGAY_VAO_NOI_TRU",
                Value = ngayVaoNoiTru,
                Message = "Hồ sơ khám ngoại trú (MA_LOAI_KCB=01) nhưng có NGAY_VAO_NOI_TRU — mâu thuẫn hình thức KCB.",
                XuatToanRisk = false
            });
        }

        // Nội trú phải có ngày vào nội trú
        if (maLoaiKcb is "02" or "03" && ngayVaoNoiTru == null)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-K002",
                Severity = ValidationSeverity.Error,
                Group = "Admin",
                Table = "XML1",
                Field = "NGAY_VAO_NOI_TRU",
                Message = "Hồ sơ điều trị nội trú nhưng thiếu NGAY_VAO_NOI_TRU (bắt buộc theo QĐ 4750).",
                XuatToanRisk = true
            });
        }

        // Ngoại trú mà số ngày điều trị > 0
        if (maLoaiKcb == "01" && int.TryParse(soNgayDtri, out var soNgay) && soNgay > 0)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-K003",
                Severity = ValidationSeverity.Info,
                Group = "Admin",
                Table = "XML1",
                Field = "SO_NGAY_DTRI",
                Value = soNgayDtri,
                Message = $"Khám ngoại trú nhưng SO_NGAY_DTRI = {soNgay} — thường phải bằng 0.",
                XuatToanRisk = false
            });
        }

        // Có XML13 (giấy chuyển tuyến) thì XML1 phải khai GIAY_CHUYEN_TUYEN
        var xml13Rows = hoso.GetRows("XML13");
        if (xml13Rows.Count > 0)
        {
            if (giayChuyenTuyen == null)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML13-K001",
                    Severity = ValidationSeverity.Warning,
                    Group = "Admin",
                    Table = "XML1",
                    Field = "GIAY_CHUYEN_TUYEN",
                    Message = "Hồ sơ có bảng XML13 (giấy chuyển tuyến) nhưng trường GIAY_CHUYEN_TUYEN trong XML1 đang trống — khai thiếu số giấy chuyển tuyến dễ bị giám định yêu cầu bổ sung.",
                    Suggestion = "Điền số giấy chuyển tuyến vào XML1.GIAY_CHUYEN_TUYEN khớp với XML13.",
                    XuatToanRisk = true
                });
            }

            foreach (var row in xml13Rows)
            {
                if (row.Get("MA_CSKCB_DEN") == null)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML13-K002",
                        Severity = ValidationSeverity.Error,
                        Group = "Admin",
                        Table = "XML13",
                        Field = "MA_CSKCB_DEN",
                        Message = "Giấy chuyển tuyến thiếu mã cơ sở KCB nơi chuyển đến (MA_CSKCB_DEN).",
                        XuatToanRisk = true
                    });
                }
            }
        }

        // XML14: ngày hẹn khám lại phải sau ngày ra viện
        foreach (var row in hoso.GetRows("XML14"))
        {
            var ngayHen = FieldSpecValidator.ParseDate(row.Get("NGAY_HEN_KL"));
            if (ngayHen.HasValue && ngayRa.HasValue && ngayHen.Value.Date <= ngayRa.Value.Date)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML14-K001",
                    Severity = ValidationSeverity.Warning,
                    Group = "Admin",
                    Table = "XML14",
                    Field = "NGAY_HEN_KL",
                    Value = row.Get("NGAY_HEN_KL"),
                    Message = $"Ngày hẹn khám lại ({ngayHen:dd/MM/yyyy}) không sau ngày ra viện ({ngayRa:dd/MM/yyyy}).",
                    XuatToanRisk = false
                });
            }
        }

        // KET_QUA_DTRI và MA_LOAI_RV có quan hệ hợp lý: tử vong (KET_QUA_DTRI=5) thì MA_LOAI_RV phải là 4 (tử vong)
        var ketQua = hoso.GetField("XML1", "KET_QUA_DTRI");
        var maLoaiRv = hoso.GetField("XML1", "MA_LOAI_RV");
        if (ketQua == "5" && maLoaiRv != null && maLoaiRv != "4")
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-K004",
                Severity = ValidationSeverity.Error,
                Group = "Admin",
                Table = "XML1",
                Field = "KET_QUA_DTRI;MA_LOAI_RV",
                Message = "Kết quả điều trị là tử vong (5) nhưng mã loại ra viện không phải tử vong — mâu thuẫn dữ liệu.",
                XuatToanRisk = true
            });
        }

        return Task.FromResult(issues);
    }
}
