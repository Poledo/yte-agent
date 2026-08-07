using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Xml130.Rules;
using Xunit;

namespace AIValidation.Tests.Xml130;

/// <summary>
/// Test rule DUP-LINE — kê trùng dòng thuốc/dịch vụ cùng giờ y lệnh trong một
/// hồ sơ (dấu hiệu kê đôi, giám định xuất toán phần thừa).
/// </summary>
public class DuplicateLineRuleTests
{
    private readonly DuplicateLineRule _rule = new();

    [Fact]
    public async Task ThuocTrungMaVaGioYLenh_BaoCanhBao()
    {
        var hoso = new HosoBuilder()
            .AddRow("XML2",
                ("MA_THUOC", "T001"), ("TEN_THUOC", "Paracetamol 500mg"),
                ("NGAY_YL", "202607010900"), ("SO_LUONG", "2"))
            .AddRow("XML2",
                ("MA_THUOC", "T001"), ("TEN_THUOC", "Paracetamol 500mg"),
                ("NGAY_YL", "202607010900"), ("SO_LUONG", "3"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML2-DUP01", issue.RuleId);
        Assert.Equal(ValidationSeverity.Warning, issue.Severity);
        Assert.True(issue.XuatToanRisk);
        // Tổng số lượng 2 + 3 = 5 phải xuất hiện trong thông báo để người dùng thấy mức kê thừa
        Assert.Contains("tổng số lượng 5", issue.Message);
    }

    [Fact]
    public async Task CungThuocKhacGioYLenh_KhongBaoLoi()
    {
        // Dùng cùng một thuốc nhiều lần trong ngày với giờ y lệnh khác nhau là hợp lệ
        var hoso = new HosoBuilder()
            .AddRow("XML2", ("MA_THUOC", "T001"), ("NGAY_YL", "202607010900"))
            .AddRow("XML2", ("MA_THUOC", "T001"), ("NGAY_YL", "202607011500"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task NgayGiuongLapTheoNgay_DuocBoQua()
    {
        // Dòng ngày giường lặp là bình thường — không được coi là kê đôi
        var hoso = new HosoBuilder()
            .AddRow("XML3",
                ("MA_DICH_VU", "GIUONG01"), ("NGAY_YL", "202607010900"), ("MA_GIUONG", "G01"))
            .AddRow("XML3",
                ("MA_DICH_VU", "GIUONG01"), ("NGAY_YL", "202607010900"), ("MA_GIUONG", "G01"))
            .Build();

        Assert.Empty(await _rule.ValidateAsync(hoso));
    }

    [Fact]
    public async Task DichVuTrungMaVaGioYLenh_BaoCanhBao()
    {
        var hoso = new HosoBuilder()
            .AddRow("XML3",
                ("MA_DICH_VU", "DV001"), ("TEN_DICH_VU", "Xét nghiệm máu"),
                ("NGAY_YL", "202607010900"))
            .AddRow("XML3",
                ("MA_DICH_VU", "DV001"), ("TEN_DICH_VU", "Xét nghiệm máu"),
                ("NGAY_YL", "202607010900"))
            .Build();

        var issues = await _rule.ValidateAsync(hoso);

        var issue = Assert.Single(issues);
        Assert.Equal("XML3-DUP01", issue.RuleId);
    }
}
