using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Xml130.Rules;
using Xunit;

namespace AIValidation.Tests.Xml130;

/// <summary>
/// Test rule FINANCE — logic tài chính: thành tiền = số lượng × đơn giá × tỷ lệ,
/// cơ cấu nguồn khớp tổng chi BH, không có số tiền âm. Đây là nhóm lỗi bị cổng
/// giám định chặn hoặc xuất toán phần chênh trực tiếp bằng tiền.
/// </summary>
public class FinancialRuleTests
{
    private readonly FinancialRule _rule = new();

    [Fact]
    public async Task ThanhTienKhopSoLuongNhanDonGia_KhongBaoLoi()
    {
        var hoso = new HosoBuilder()
            .AddRow("XML2",
                ("TEN_THUOC", "Paracetamol 500mg"),
                ("SO_LUONG", "2"), ("DON_GIA", "1000"), ("THANH_TIEN_BH", "2000"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task ThanhTienLechQuaSaiSo_BaoLoiXuatToan()
    {
        // 2 × 1000 = 2000 nhưng kê 2500 — giám định sẽ xuất toán 500đ chênh
        var hoso = new HosoBuilder()
            .AddRow("XML2",
                ("TEN_THUOC", "Paracetamol 500mg"),
                ("SO_LUONG", "2"), ("DON_GIA", "1000"), ("THANH_TIEN_BH", "2500"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML2-F002", issue.RuleId);
        Assert.Equal(ValidationSeverity.Error, issue.Severity);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task ThanhTienTinhTheoTyLeThanhToan_KhongBaoLoi()
    {
        // Dịch vụ thanh toán 50%: 1 × 200.000 × 50% = 100.000
        var hoso = new HosoBuilder()
            .AddRow("XML3",
                ("TEN_DICH_VU", "Chụp CT Scanner"),
                ("SO_LUONG", "1"), ("DON_GIA", "200000"),
                ("TYLE_TT_BH", "50"), ("THANH_TIEN_BH", "100000"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task SoLuongBangKhong_BaoLoi()
    {
        var hoso = new HosoBuilder()
            .AddRow("XML2", ("TEN_THUOC", "Amoxicillin"), ("SO_LUONG", "0"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML2-F001", issue.RuleId);
    }

    [Fact]
    public async Task CoCauNguonKhongKhopTongChiBH_BaoLoi()
    {
        // BHTT 50.000 + BNTT 10.000 = 60.000 ≠ tổng chi BH 100.000
        var hoso = new HosoBuilder()
            .WithXml1(
                ("T_TONGCHI_BH", "100000"),
                ("T_BHTT", "50000"),
                ("T_BNTT", "10000"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-F001", issue.RuleId);
        Assert.Equal(ValidationSeverity.Error, issue.Severity);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task CoCauNguonKhopTongChiBH_KhongBaoLoi()
    {
        // 80.000 + 15.000 + 5.000 = 100.000 — khớp
        var hoso = new HosoBuilder()
            .WithXml1(
                ("T_TONGCHI_BH", "100000"),
                ("T_BHTT", "80000"),
                ("T_BNTT", "15000"),
                ("T_BNCCT", "5000"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task TienThuocKhongKhopTongXml2_BaoLoi()
    {
        var hoso = new HosoBuilder()
            .WithXml1(("T_THUOC", "5000"))
            .AddRow("XML2",
                ("TEN_THUOC", "Paracetamol 500mg"),
                ("SO_LUONG", "2"), ("DON_GIA", "1000"), ("THANH_TIEN_BH", "2000"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-F002", issue.RuleId);
    }

    [Fact]
    public async Task SoTienAm_BaoLoi()
    {
        var hoso = new HosoBuilder().WithXml1(("T_BHTT", "-5000")).Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-F005", issue.RuleId);
        Assert.Equal("T_BHTT", issue.Field);
    }
}
