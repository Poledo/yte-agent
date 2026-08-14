using AIValidation.Api.Data.Entities;
using Xunit;

namespace AIValidation.Tests.Catalog;

/// <summary>
/// Test thứ bậc và nhãn của tuyến cơ sở KCB.
///
/// Bối cảnh: thứ bậc tuyến lấy thẳng từ số của enum thay vì một bảng tra riêng, nên
/// chèn thêm một tuyến vào giữa enum là mọi phép so cao thấp đổi theo. Bộ test này
/// chốt lại thứ tự trung ương → tỉnh đa khoa → chuyên khoa → xã để lần sửa enum sau
/// mà đặt sai chỗ thì hỏng ngay tại đây, chứ không lặng lẽ báo nhầm cho người quản trị
/// rằng trạm y tế đang ở tuyến cao hơn bệnh viện tỉnh.
/// </summary>
public class FacilityTuyenTests
{
    [Fact]
    public void TuyenTrenCoBacNhoHonTuyenDuoi()
    {
        Assert.True(FacilityTuyen.TrungUong.Rank() < FacilityTuyen.TinhDaKhoa.Rank());
        Assert.True(FacilityTuyen.TinhDaKhoa.Rank() < FacilityTuyen.ChuyenKhoa.Rank());
        Assert.True(FacilityTuyen.ChuyenKhoa.Rank() < FacilityTuyen.Xa.Rank());
    }

    [Fact]
    public void ChuaPhanTuyenThiKhongDemDeSoCaoThap()
    {
        // Bậc của KhongXacDinh là 0, nhỏ hơn cả trung ương. Không loại nó ra trước khi
        // so thì đơn vị chưa khai tuyến bị hiểu nhầm là tuyến trên của tất cả.
        Assert.False(FacilityTuyen.KhongXacDinh.IsSet());
        Assert.True(FacilityTuyen.TrungUong.IsSet());
        Assert.True(FacilityTuyen.Xa.IsSet());
    }

    [Theory]
    [InlineData(FacilityTuyen.TrungUong, "Tuyến trung ương")]
    [InlineData(FacilityTuyen.TinhDaKhoa, "Tuyến 1 - tỉnh, đa khoa")]
    [InlineData(FacilityTuyen.ChuyenKhoa, "Tuyến 2-3 - chuyên khoa")]
    [InlineData(FacilityTuyen.Xa, "Tuyến 4 - TYT, xã phường")]
    [InlineData(FacilityTuyen.KhongXacDinh, "Chưa phân tuyến")]
    public void NhanTiengVietDungChoTungTuyen(FacilityTuyen tuyen, string expected)
    {
        Assert.Equal(expected, tuyen.Label());
    }

    [Fact]
    public void MoiTuyenDeuCoNhanRieng()
    {
        // Thêm tuyến mới mà quên bổ sung nhãn thì rơi vào nhánh mặc định "Chưa phân
        // tuyến" - hai tuyến khác nhau hiện cùng một chữ trên màn hình.
        var labels = Enum.GetValues<FacilityTuyen>().Select(t => t.Label()).ToList();
        Assert.Equal(labels.Count, labels.Distinct(StringComparer.Ordinal).Count());
    }
}
