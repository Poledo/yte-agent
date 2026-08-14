namespace AIValidation.Api.Data.Entities;

/// <summary>
/// Tuyến của cơ sở khám chữa bệnh, theo cách phân của ngành:
/// Tuyến trung ương → Tuyến 1 (tỉnh, đa khoa) → Tuyến 2-3 (chuyên khoa) → Tuyến 4 (TYT, xã phường).
///
/// Lưu xuống CSDL bằng TÊN chứ không phải số: cột tuyến hay bị người vận hành đọc
/// thẳng bằng SQL, thấy 'TinhDaKhoa' hiểu ngay còn thấy '2' thì phải đi tra bảng.
/// Đổi lại, số của enum mang ý nghĩa riêng - xem <see cref="FacilityTuyenInfo.Rank"/>.
/// </summary>
public enum FacilityTuyen
{
    /// <summary>Chưa phân tuyến. Là giá trị của mọi đơn vị có sẵn trước khi thêm cột này.</summary>
    KhongXacDinh = 0,

    /// <summary>Tuyến trung ương: bệnh viện thuộc Bộ Y tế.</summary>
    TrungUong = 1,

    /// <summary>Tuyến 1: bệnh viện đa khoa tỉnh, thành phố.</summary>
    TinhDaKhoa = 2,

    /// <summary>Tuyến 2-3: bệnh viện chuyên khoa (sản, nhi, lao, mắt, y học cổ truyền...).</summary>
    ChuyenKhoa = 3,

    /// <summary>Tuyến 4: trạm y tế xã, phường, thị trấn.</summary>
    Xa = 4
}

/// <summary>Nhãn tiếng Việt và thứ bậc của <see cref="FacilityTuyen"/>.</summary>
public static class FacilityTuyenInfo
{
    /// <summary>
    /// Thứ bậc để so cao thấp: số càng NHỎ càng là tuyến trên. Trùng với số của enum
    /// nên không cần bảng tra riêng — thêm tuyến mới phải chèn đúng chỗ trong enum.
    /// <see cref="FacilityTuyen.KhongXacDinh"/> có bậc 0 nhưng không mang nghĩa
    /// "trên trung ương": mọi phép so đều phải loại nó ra trước.
    /// </summary>
    public static int Rank(this FacilityTuyen tuyen) => (int)tuyen;

    /// <summary>True nếu tuyến đã được khai (dùng được để so cao thấp).</summary>
    public static bool IsSet(this FacilityTuyen tuyen) => tuyen != FacilityTuyen.KhongXacDinh;

    /// <summary>Nhãn hiển thị cho người dùng và cho thông báo lỗi.</summary>
    public static string Label(this FacilityTuyen tuyen) => tuyen switch
    {
        FacilityTuyen.TrungUong => "Tuyến trung ương",
        FacilityTuyen.TinhDaKhoa => "Tuyến 1 - tỉnh, đa khoa",
        FacilityTuyen.ChuyenKhoa => "Tuyến 2-3 - chuyên khoa",
        FacilityTuyen.Xa => "Tuyến 4 - TYT, xã phường",
        _ => "Chưa phân tuyến"
    };
}
