using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Xml130.Rules;
using Xunit;

namespace AIValidation.Tests.Xml130;

/// <summary>
/// Test rule TIME-SEQ — logic thời gian: sinh/vào/ra/thanh toán theo đúng
/// trình tự, y lệnh nằm trong đợt điều trị, khám ngoại trú không "siêu tốc".
/// </summary>
public class TimeSequenceRuleTests
{
    private readonly TimeSequenceRule _rule = new();

    [Fact]
    public async Task HoSoThoiGianHopLe_KhongBaoLoi()
    {
        var hoso = new HosoBuilder()
            .WithXml1(
                ("NGAY_SINH", "19800115"),
                ("NGAY_VAO", "202607010800"),
                ("NGAY_RA", "202607011000"),
                ("NGAY_TTOAN", "202607011030"),
                ("MA_LOAI_KCB", "01"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task NgaySinhSauNgayVao_BaoLoi()
    {
        var hoso = new HosoBuilder()
            .WithXml1(("NGAY_SINH", "20270101"), ("NGAY_VAO", "202607010800"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-T001", issue.RuleId);
        Assert.Equal(ValidationSeverity.Error, issue.Severity);
    }

    [Fact]
    public async Task VaoVienSauRaVien_BaoLoi()
    {
        var hoso = new HosoBuilder()
            .WithXml1(("NGAY_VAO", "202607011200"), ("NGAY_RA", "202607010800"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-T003", issue.RuleId);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task KhamNgoaiTruDuoi5Phut_BaoCanhBao()
    {
        // Vào 08:00 ra 08:03 khám ngoại trú — dấu hiệu khám hình thức
        var hoso = new HosoBuilder()
            .WithXml1(
                ("NGAY_VAO", "202607010800"),
                ("NGAY_RA", "202607010803"),
                ("MA_LOAI_KCB", "01"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-T006", issue.RuleId);
        Assert.Equal(ValidationSeverity.Warning, issue.Severity);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task SoNgayDieuTriLechKhoangVaoRa_NoiTru_BaoCanhBao()
    {
        // Nội trú 01/07 → 03/07 (~2 ngày) nhưng kê 7 ngày điều trị
        var hoso = new HosoBuilder()
            .WithXml1(
                ("NGAY_VAO", "202607010800"),
                ("NGAY_RA", "202607031000"),
                ("SO_NGAY_DTRI", "7"),
                ("MA_LOAI_KCB", "02"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML1-T005", issue.RuleId);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task YLenhNgoaiDotDieuTri_BaoLoiXuatToan()
    {
        // Y lệnh 05/07 nhưng đợt điều trị chỉ 01/07–03/07 — đúng kịch bản demo TH3
        var hoso = new HosoBuilder()
            .WithXml1(
                ("NGAY_VAO", "202607010800"),
                ("NGAY_RA", "202607031000"))
            .AddRow("XML2",
                ("TEN_THUOC", "Paracetamol 500mg"),
                ("NGAY_YL", "202607050900"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML2-T001", issue.RuleId);
        Assert.Equal(ValidationSeverity.Error, issue.Severity);
        Assert.True(issue.XuatToanRisk);
    }

    [Fact]
    public async Task ThucHienYLenhTruocKhiRaYLenh_BaoLoi()
    {
        var hoso = new HosoBuilder()
            .WithXml1(("NGAY_VAO", "202607010800"), ("NGAY_RA", "202607031000"))
            .AddRow("XML3",
                ("TEN_DICH_VU", "Siêu âm ổ bụng"),
                ("NGAY_YL", "202607021000"),
                ("NGAY_TH_YL", "202607020900"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML3-T002", issue.RuleId);
    }
}
