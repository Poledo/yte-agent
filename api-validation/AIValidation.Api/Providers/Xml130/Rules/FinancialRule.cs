using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra logic tài chính:
/// - Dòng chi tiết: THANH_TIEN = SO_LUONG × DON_GIA, TYLE/MUC_HUONG 0..100, T_BHTT ≤ THANH_TIEN_BH.
/// - XML1: T_BHTT + T_BNTT + T_BNCCT + T_NGUONKHAC ≈ T_TONGCHI_BH.
/// - T_THUOC khớp tổng tiền thuốc XML2; T_VTYT khớp tổng vật tư XML3.
/// - Tổng THANH_TIEN_BH chi tiết ≈ T_TONGCHI_BH.
/// Sai số cho phép 1 đồng cho phép làm tròn từng dòng, 5 đồng cho tổng.
/// </summary>
public class FinancialRule : IXml130Rule
{
    public string RuleId => "FINANCE";
    public string RuleName => "Kiểm tra logic tài chính";

    private const decimal LineTolerance = 1m;
    private const decimal TotalTolerance = 5m;

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        decimal sumThuocBh = 0, sumVtytBh = 0, sumChiTietBh = 0;
        var hasXml2 = hoso.GetRows("XML2").Count > 0;
        var hasXml3 = hoso.GetRows("XML3").Count > 0;

        foreach (var tableId in new[] { "XML2", "XML3" })
        {
            var group = tableId == "XML2" ? "Drug" : "Service";
            foreach (var row in hoso.GetRows(tableId))
            {
                cancellationToken.ThrowIfCancellationRequested();

                var soLuong = row.GetDecimal("SO_LUONG");
                var donGia = row.GetDecimal("DON_GIA") ?? row.GetDecimal("DON_GIA_BH");
                var thanhTienBh = row.GetDecimal("THANH_TIEN_BH") ?? row.GetDecimal("THANH_TIEN");
                var tyleTt = row.GetDecimal("TYLE_TT_BH") ?? row.GetDecimal("TYLE_TT");
                var mucHuong = row.GetDecimal("MUC_HUONG");
                var tBhtt = row.GetDecimal("T_BHTT");
                var label = row.Get("TEN_THUOC") ?? row.Get("TEN_DICH_VU") ?? row.Get("TEN_VAT_TU") ?? $"dòng {row.RowIndex}";

                // SO_LUONG > 0
                if (soLuong is <= 0)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-F001",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "SO_LUONG",
                        RowIndex = row.RowIndex,
                        Value = row.Get("SO_LUONG"),
                        Message = $"[{tableId} dòng {row.RowIndex}] {label}: số lượng phải lớn hơn 0.",
                        XuatToanRisk = true
                    });
                }

                // THANH_TIEN = SO_LUONG × DON_GIA × TYLE_TT/100 (nếu có tỷ lệ)
                if (soLuong.HasValue && donGia.HasValue && thanhTienBh.HasValue)
                {
                    var tyle = (tyleTt is > 0 and <= 100 ? tyleTt.Value : 100m) / 100m;
                    var expected = soLuong.Value * donGia.Value * tyle;
                    if (Math.Abs(expected - thanhTienBh.Value) > LineTolerance)
                    {
                        issues.Add(new Xml130Issue
                        {
                            RuleId = $"{tableId}-F002",
                            Severity = ValidationSeverity.Error,
                            Group = group,
                            Table = tableId,
                            Field = "THANH_TIEN_BH",
                            RowIndex = row.RowIndex,
                            Value = thanhTienBh.Value.ToString("N0"),
                            Message = $"[{tableId} dòng {row.RowIndex}] {label}: thành tiền {thanhTienBh:N0}đ ≠ số lượng × đơn giá × tỷ lệ ({expected:N0}đ) — giám định sẽ xuất toán phần chênh.",
                            XuatToanRisk = true
                        });
                    }
                }

                // Tỷ lệ và mức hưởng trong 0..100
                if (tyleTt is < 0 or > 100)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-F003",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "TYLE_TT_BH",
                        RowIndex = row.RowIndex,
                        Value = tyleTt?.ToString(),
                        Message = $"[{tableId} dòng {row.RowIndex}] Tỷ lệ thanh toán {tyleTt}% ngoài khoảng 0–100%.",
                        XuatToanRisk = true
                    });
                }

                if (mucHuong is < 0 or > 100)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-F004",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "MUC_HUONG",
                        RowIndex = row.RowIndex,
                        Value = mucHuong?.ToString(),
                        Message = $"[{tableId} dòng {row.RowIndex}] Mức hưởng {mucHuong}% ngoài khoảng 0–100%.",
                        XuatToanRisk = true
                    });
                }

                // T_BHTT không vượt thành tiền BH
                if (tBhtt.HasValue && thanhTienBh.HasValue && tBhtt > thanhTienBh + LineTolerance)
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-F005",
                        Severity = ValidationSeverity.Error,
                        Group = group,
                        Table = tableId,
                        Field = "T_BHTT",
                        RowIndex = row.RowIndex,
                        Value = tBhtt.Value.ToString("N0"),
                        Message = $"[{tableId} dòng {row.RowIndex}] {label}: tiền BHYT thanh toán ({tBhtt:N0}đ) vượt thành tiền BH ({thanhTienBh:N0}đ).",
                        XuatToanRisk = true
                    });
                }

                var lineBh = thanhTienBh ?? 0;
                sumChiTietBh += lineBh;
                if (tableId == "XML2")
                {
                    sumThuocBh += lineBh;
                }
                else if (row.Get("MA_VAT_TU") != null)
                {
                    sumVtytBh += lineBh;
                }
            }
        }

        // ===== Đối chiếu tổng XML1 =====
        var tTongchiBh = hoso.GetField("XML1", "T_TONGCHI_BH") is { } s1 && decimal.TryParse(s1, out var v1) ? v1 : (decimal?)null;
        var tBhttTong = ParseXml1Decimal(hoso, "T_BHTT");
        var tBntt = ParseXml1Decimal(hoso, "T_BNTT") ?? 0;
        var tBncct = ParseXml1Decimal(hoso, "T_BNCCT") ?? 0;
        var tNguonKhac = ParseXml1Decimal(hoso, "T_NGUONKHAC") ?? 0;
        var tThuoc = ParseXml1Decimal(hoso, "T_THUOC");
        var tVtyt = ParseXml1Decimal(hoso, "T_VTYT");

        if (tTongchiBh.HasValue && tBhttTong.HasValue)
        {
            var sumParts = tBhttTong.Value + tBntt + tBncct + tNguonKhac;
            if (Math.Abs(sumParts - tTongchiBh.Value) > TotalTolerance)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-F001",
                    Severity = ValidationSeverity.Error,
                    Group = "Finance",
                    Table = "XML1",
                    Field = "T_TONGCHI_BH;T_BHTT;T_BNTT;T_BNCCT;T_NGUONKHAC",
                    Message = $"Tổng cơ cấu nguồn (BHTT {tBhttTong:N0} + BNTT {tBntt:N0} + BNCCT {tBncct:N0} + nguồn khác {tNguonKhac:N0} = {sumParts:N0}đ) không khớp tổng chi BH ({tTongchiBh:N0}đ) — hồ sơ sẽ bị cổng giám định chặn hoặc xuất toán phần chênh.",
                    XuatToanRisk = true
                });
            }
        }

        if (tThuoc.HasValue && hasXml2 && Math.Abs(tThuoc.Value - sumThuocBh) > TotalTolerance)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-F002",
                Severity = ValidationSeverity.Error,
                Group = "Finance",
                Table = "XML1",
                Field = "T_THUOC",
                Value = tThuoc.Value.ToString("N0"),
                Message = $"T_THUOC ({tThuoc:N0}đ) không khớp tổng thành tiền thuốc trong XML2 ({sumThuocBh:N0}đ).",
                XuatToanRisk = true
            });
        }

        if (tVtyt.HasValue && hasXml3 && sumVtytBh > 0 && Math.Abs(tVtyt.Value - sumVtytBh) > TotalTolerance)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-F003",
                Severity = ValidationSeverity.Error,
                Group = "Finance",
                Table = "XML1",
                Field = "T_VTYT",
                Value = tVtyt.Value.ToString("N0"),
                Message = $"T_VTYT ({tVtyt:N0}đ) không khớp tổng thành tiền vật tư y tế trong XML3 ({sumVtytBh:N0}đ).",
                XuatToanRisk = true
            });
        }

        if (tTongchiBh.HasValue && (hasXml2 || hasXml3) && Math.Abs(sumChiTietBh - tTongchiBh.Value) > TotalTolerance)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-F004",
                Severity = ValidationSeverity.Warning,
                Group = "Finance",
                Table = "XML1",
                Field = "T_TONGCHI_BH",
                Value = tTongchiBh.Value.ToString("N0"),
                Message = $"Tổng chi BH kê khai ({tTongchiBh:N0}đ) lệch tổng cộng các dòng chi tiết XML2+XML3 ({sumChiTietBh:N0}đ) — kiểm tra hồ sơ còn thiếu bảng chi tiết hay thừa tổng hợp.",
                XuatToanRisk = true
            });
        }

        // Số tiền âm
        foreach (var field in new[] { "T_TONGCHI_BV", "T_TONGCHI_BH", "T_BHTT", "T_BNTT", "T_BNCCT", "T_THUOC", "T_VTYT", "T_NGUONKHAC" })
        {
            var value = ParseXml1Decimal(hoso, field);
            if (value is < 0)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-F005",
                    Severity = ValidationSeverity.Error,
                    Group = "Finance",
                    Table = "XML1",
                    Field = field,
                    Value = value.Value.ToString("N0"),
                    Message = $"{field} có giá trị âm ({value:N0}đ).",
                    XuatToanRisk = true
                });
            }
        }

        return Task.FromResult(issues);
    }

    private static decimal? ParseXml1Decimal(Xml130Hoso hoso, string field)
        => hoso.GetField("XML1", field) is { } s && decimal.TryParse(s, out var v) ? v : null;
}
