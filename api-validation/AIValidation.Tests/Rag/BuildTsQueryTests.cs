using AIValidation.Api.Services.Rag;
using Xunit;

namespace AIValidation.Tests.Rag;

/// <summary>
/// Test bộ dựng truy vấn full-text của trợ lý hỏi–đáp.
///
/// Bối cảnh: trước đây tầng full-text dùng plainto_tsquery, vốn nối MỌI từ trong câu
/// hỏi bằng AND, mà config 'simple' của PostgreSQL không biết tiếng Việt nên không loại
/// hư từ nào. Hệ quả đo được trên production: hỏi cụt "mức hưởng BHYT đúng tuyến" thì ra
/// trích dẫn, hỏi đủ ý "Mức hưởng bảo hiểm y tế đúng tuyến là bao nhiêu phần trăm?" thì
/// trả lời "không tìm thấy căn cứ" — vì phải có một đoạn chứa đủ cả "là", "bao", "nhiêu".
/// Các test dưới đây khóa lại đúng hành vi chống hiện tượng đó.
/// </summary>
public class BuildTsQueryTests
{
    [Fact]
    public void BoHuTuVaTuDeHoi()
    {
        var q = DocumentSearchService.BuildTsQuery("Ngày vào viện là gì", useAnd: true);

        Assert.Equal("'ngày' & 'vào' & 'viện'", q);
    }

    [Fact]
    public void CauHoiDuY_KhongConTuDeHoi()
    {
        var q = DocumentSearchService.BuildTsQuery(
            "Mức hưởng bảo hiểm y tế đúng tuyến là bao nhiêu phần trăm?", useAnd: true);

        Assert.NotNull(q);
        foreach (var filler in new[] { "'là'", "'bao'", "'nhiêu'", "'phần'", "'trăm'" })
        {
            Assert.DoesNotContain(filler, q);
        }
    }

    [Fact]
    public void DangDayDu_SinhNhomOrVoiVietTat()
    {
        var q = DocumentSearchService.BuildTsQuery("mức hưởng bảo hiểm y tế đúng tuyến", useAnd: true);

        // Văn bản pháp quy viết "BHYT", người hỏi viết đầy đủ — phải khớp được cả hai
        Assert.Equal("('bhyt' | 'bảo' & 'hiểm' & 'y' & 'tế') & 'mức' & 'hưởng' & 'đúng' & 'tuyến'", q);
    }

    [Fact]
    public void VietTat_CungMoRaDangDayDu()
    {
        var q = DocumentSearchService.BuildTsQuery("mức hưởng BHYT đúng tuyến", useAnd: true);

        Assert.Equal("('bhyt' | 'bảo' & 'hiểm' & 'y' & 'tế') & 'mức' & 'hưởng' & 'đúng' & 'tuyến'", q);
    }

    [Fact]
    public void HaiCachHoiCungMotY_ChoRaCungMotTruyVan()
    {
        var ngan = DocumentSearchService.BuildTsQuery("mức hưởng BHYT đúng tuyến", useAnd: true);
        var dai = DocumentSearchService.BuildTsQuery(
            "Mức hưởng bảo hiểm y tế đúng tuyến là bao nhiêu?", useAnd: true);

        Assert.Equal(ngan, dai);
    }

    [Fact]
    public void CumDaiUuTienTruocCumNganLongTrongNo()
    {
        var q = DocumentSearchService.BuildTsQuery("cơ sở khám chữa bệnh tuyến huyện", useAnd: true);

        // "cơ sở khám chữa bệnh" → CSKCB, không bị "khám chữa bệnh" → KCB ăn mất
        Assert.StartsWith("('cskcb' | ", q);
        Assert.DoesNotContain("'kcb'", q);
    }

    [Fact]
    public void CheDoOr_NoiTatCaBangDauGachDung()
    {
        var q = DocumentSearchService.BuildTsQuery("mức hưởng BHYT đúng tuyến", useAnd: false);

        Assert.Equal("('bhyt' | 'bảo' | 'hiểm' | 'y' | 'tế') | 'mức' | 'hưởng' | 'đúng' | 'tuyến'", q);
    }

    [Theory]
    [InlineData("Bảng XML1 gồm những chỉ tiêu nào theo Quyết định 130/QĐ-BYT?")]
    [InlineData("Ngày vào viện ghi ở trường nào của XML1?")]
    [InlineData("!!! ??? &&& ((( :::")]
    public void KhongSinhKyTuCoNghiaCuPhapNgoaiNhomOr(string cauHoi)
    {
        var q = DocumentSearchService.BuildTsQuery(cauHoi, useAnd: true);

        if (q == null)
        {
            return;
        }
        // Mọi ký tự cú pháp của to_tsquery chỉ được xuất hiện do chính ta dựng
        // (dấu & | và cặp ngoặc của nhóm viết tắt), không bao giờ lọt từ input.
        var trongNhay = string.Concat(q.Split('\'').Where((_, i) => i % 2 == 1));
        Assert.DoesNotContain('&', trongNhay);
        Assert.DoesNotContain('|', trongNhay);
        Assert.DoesNotContain('(', trongNhay);
        Assert.DoesNotContain(')', trongNhay);
        Assert.DoesNotContain(':', trongNhay);
        Assert.DoesNotContain('*', trongNhay);
        Assert.DoesNotContain('!', trongNhay);
    }

    [Fact]
    public void CauToanHuTu_VanGiuLaiChuKhongTraNull()
    {
        var q = DocumentSearchService.BuildTsQuery("là gì vậy", useAnd: true);

        Assert.Equal("'là' & 'gì' & 'vậy'", q);
    }

    [Fact]
    public void KhongCoChuSo_TraNull()
    {
        Assert.Null(DocumentSearchService.BuildTsQuery("??? !!!", useAnd: true));
    }

    [Fact]
    public void MaVanBan_GiuLaiPhanSoVaChuVietTat()
    {
        var q = DocumentSearchService.BuildTsQuery("Quyết định 130/QĐ-BYT", useAnd: true);

        Assert.Equal("'quyết' & 'định' & '130' & 'qđ' & 'byt'", q);
    }

    [Fact]
    public void TuLapLai_ChiXuatHienMotLan()
    {
        var q = DocumentSearchService.BuildTsQuery("tuyến tuyến tuyến", useAnd: true);

        Assert.Equal("'tuyến'", q);
    }
}
