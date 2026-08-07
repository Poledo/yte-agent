using AIValidation.Api.Models.Enums;
using AIValidation.Api.Providers.Xml130.CrossRules;
using AIValidation.Api.Providers.Xml130.Interfaces;
using Xunit;

namespace AIValidation.Tests.Xml130;

/// <summary>
/// Test rule CROSS-BACSI — "một người hành nghề làm việc trên nhiều bệnh nhân
/// cùng thời điểm". Đây là rule bắt case xuất toán trùng lịch bác sĩ giữa hai
/// hồ sơ (case thật 11,7 triệu đồng trong bộ thử) mà soát từng hồ sơ đơn lẻ
/// không thể phát hiện.
/// </summary>
public class DoctorTimeOverlapCrossRuleTests
{
    private readonly DoctorTimeOverlapCrossRule _rule = new();

    private static Xml130BatchHoso HosoDvkt(
        string maLk,
        string hoTen,
        string nguoiThucHien,
        string ngayThYl,
        string? ngayKq = null,
        string? maGiuong = null)
    {
        var fields = new List<(string, string)>
        {
            ("TEN_DICH_VU", "Siêu âm ổ bụng"),
            ("MA_KHOA", "K01"),
            ("NGUOI_THUC_HIEN", nguoiThucHien),
            ("NGAY_TH_YL", ngayThYl),
        };
        if (ngayKq != null)
        {
            fields.Add(("NGAY_KQ", ngayKq));
        }
        if (maGiuong != null)
        {
            fields.Add(("MA_GIUONG", maGiuong));
        }

        return new HosoBuilder()
            .WithXml1(("MA_LK", maLk), ("HO_TEN", hoTen), ("NGAY_VAO", "202607010800"))
            .AddRow("XML3", fields.ToArray())
            .BuildBatch($"{maLk}.xml");
    }

    [Fact]
    public void KhungGioGiaoNhau_HaiBenhNhan_BaoLoi()
    {
        // Cùng người thực hiện, ca 08:00–09:00 và 08:30–09:30 trên 2 bệnh nhân
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "202607010800", "202607010900"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN001", "202607010830", "202607010930"),
        };

        var issues = _rule.Validate(hosos);

        var issue = Assert.Single(issues);
        Assert.Equal("CROSS-BACSI", issue.RuleId);
        Assert.Equal(ValidationSeverity.Error, issue.Severity);
        Assert.True(issue.XuatToanRisk);
        // Kết luận phải trỏ đủ 2 hồ sơ và chọn đúng hồ sơ gốc (ca bắt đầu trước)
        Assert.Equal(2, issue.Hosos.Count);
        Assert.Equal("BA001", issue.Hosos.Single(h => h.PhatSinhTruoc).MaLk);
    }

    [Fact]
    public void TrungPhutBatDau_KhongCoGioKetThuc_BaoLoi()
    {
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "202607010800"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN001", "202607010800"),
        };

        var issues = _rule.Validate(hosos);

        var issue = Assert.Single(issues);
        Assert.Equal("CROSS-BACSI", issue.RuleId);
        Assert.Contains("CÙNG thời điểm", issue.Message);
    }

    [Fact]
    public void KhongGiaoNhau_KhongBaoLoi()
    {
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "202607010800", "202607010830"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN001", "202607010900", "202607010930"),
        };

        Assert.Empty(_rule.Validate(hosos));
    }

    [Fact]
    public void NguoiThucHienKhacNhau_KhongBaoLoi()
    {
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "202607010800", "202607010900"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN002", "202607010800", "202607010900"),
        };

        Assert.Empty(_rule.Validate(hosos));
    }

    [Fact]
    public void DongNgayGiuong_DuocBoQua()
    {
        // Ngày giường trùng khung giờ là bình thường — không cần người túc trực liên tục
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "202607010800", "202607010900", maGiuong: "G01"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN001", "202607010800", "202607010900", maGiuong: "G02"),
        };

        Assert.Empty(_rule.Validate(hosos));
    }

    [Fact]
    public void DuLieuChiCoNgay_KhongDuGioPhut_DuocBoQua()
    {
        // 8 ký tự (chỉ ngày) đem so phút sẽ báo sai hàng loạt — rule phải bỏ qua
        var hosos = new[]
        {
            HosoDvkt("BA001", "Nguyễn Văn A", "CCHN001", "20260701"),
            HosoDvkt("BA002", "Trần Thị B", "CCHN001", "20260701"),
        };

        Assert.Empty(_rule.Validate(hosos));
    }

    [Fact]
    public void CungHoSo_TrungKhungGio_KhongBaoLoi()
    {
        // Hai dịch vụ giao nhau nhưng trên CÙNG một bệnh nhân — không phải case chéo
        var batch = new HosoBuilder()
            .WithXml1(("MA_LK", "BA001"), ("HO_TEN", "Nguyễn Văn A"))
            .AddRow("XML3",
                ("TEN_DICH_VU", "DV 1"), ("MA_KHOA", "K01"),
                ("NGUOI_THUC_HIEN", "CCHN001"),
                ("NGAY_TH_YL", "202607010800"), ("NGAY_KQ", "202607010900"))
            .AddRow("XML3",
                ("TEN_DICH_VU", "DV 2"), ("MA_KHOA", "K01"),
                ("NGUOI_THUC_HIEN", "CCHN001"),
                ("NGAY_TH_YL", "202607010830"), ("NGAY_KQ", "202607010930"))
            .BuildBatch("BA001.xml");

        Assert.Empty(_rule.Validate(new[] { batch }));
    }

    [Fact]
    public void GioYLenhTrungPhut_CungBacSi_HaiBenhNhan_BaoCanhBao()
    {
        // Dấu hiệu sao chép y lệnh: cùng MA_BAC_SI, NGAY_YL trùng đến từng phút
        static Xml130BatchHoso HosoYl(string maLk, string hoTen) => new HosoBuilder()
            .WithXml1(("MA_LK", maLk), ("HO_TEN", hoTen), ("NGAY_VAO", "202607010700"))
            .AddRow("XML3",
                ("TEN_DICH_VU", "Xét nghiệm máu"),
                ("MA_BAC_SI", "BS001"),
                ("NGAY_YL", "202607010815"))
            .BuildBatch($"{maLk}.xml");

        var issues = _rule.Validate(new[] { HosoYl("BA001", "Nguyễn Văn A"), HosoYl("BA002", "Trần Thị B") });

        var issue = Assert.Single(issues);
        Assert.Equal("CROSS-BACSI-YL", issue.RuleId);
        Assert.Equal(ValidationSeverity.Warning, issue.Severity);
        Assert.True(issue.XuatToanRisk);
    }
}
