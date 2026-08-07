using System.Globalization;

namespace AIValidation.Api.Models.Xml130;

/// <summary>
/// Kết quả parse một file XML 130 (QĐ 130/QĐ-BYT) — cấu trúc GIAMDINHHS.
/// Dữ liệu được giữ dạng generic (bảng → dòng → trường) để engine kiểm tra
/// theo đặc tả field_specs.json mà không cần model cứng cho ~400 trường.
/// </summary>
public class Xml130File
{
    /// <summary>Mã cơ sở KCB lấy từ THONGTINDONVI/MACSKCB.</summary>
    public string? MaCskcb { get; set; }

    /// <summary>Ngày lập hồ sơ (yyyyMMdd) từ THONGTINHOSO/NGAYLAP.</summary>
    public string? NgayLap { get; set; }

    /// <summary>Danh sách hồ sơ bệnh án trong file.</summary>
    public List<Xml130Hoso> HoSos { get; set; } = new();
}

/// <summary>
/// Một hồ sơ KCB (một thẻ HOSO) gồm nhiều bảng XML1..XML15.
/// </summary>
public class Xml130Hoso
{
    /// <summary>
    /// Các bảng dữ liệu, key là mã bảng ("XML1".."XML15"),
    /// value là danh sách dòng (XML1 luôn 1 dòng; XML2/XML3 nhiều dòng chi tiết).
    /// </summary>
    public Dictionary<string, List<Xml130Row>> Tables { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Mã liên kết hồ sơ (MA_LK của bảng XML1 nếu có).</summary>
    public string? MaLk => GetField("XML1", "MA_LK");

    /// <summary>
    /// Mã cơ sở KCB của hồ sơ, do parser gán khi đọc file.
    ///
    /// Thứ tự ưu tiên: MA_CSKCB của bảng XML1 (khai trong từng hồ sơ) → MACSKCB ở
    /// thẻ THONGTINDONVI của file. Nhiều phần mềm HIS KHÔNG xuất MA_CSKCB trong XML1
    /// mà chỉ khai một lần ở đầu file, nên chỉ đọc XML1 sẽ mất mã và mọi rule đối
    /// chiếu danh mục im lặng bỏ qua hồ sơ.
    /// </summary>
    public string? FacilityCode { get; set; }

    /// <summary>Lấy giá trị một trường của dòng đầu tiên trong bảng, null nếu không có.</summary>
    public string? GetField(string tableId, string fieldName)
    {
        if (!Tables.TryGetValue(tableId, out var rows) || rows.Count == 0)
        {
            return null;
        }
        return rows[0].Get(fieldName);
    }

    /// <summary>Lấy toàn bộ dòng của một bảng (rỗng nếu bảng không tồn tại).</summary>
    public IReadOnlyList<Xml130Row> GetRows(string tableId)
        => Tables.TryGetValue(tableId, out var rows) ? rows : Array.Empty<Xml130Row>();
}

/// <summary>
/// Một dòng dữ liệu (record) trong một bảng XML 130.
/// </summary>
public class Xml130Row
{
    /// <summary>Mã bảng chứa dòng này ("XML1".."XML15").</summary>
    public required string TableId { get; set; }

    /// <summary>Số thứ tự dòng trong bảng (bắt đầu từ 1) — dùng cho thông báo lỗi.</summary>
    public int RowIndex { get; set; }

    /// <summary>Giá trị các trường: tên thẻ XML → nội dung text (đã trim).</summary>
    public Dictionary<string, string> Fields { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Lấy giá trị trường, null nếu không tồn tại hoặc rỗng.</summary>
    public string? Get(string fieldName)
        => Fields.TryGetValue(fieldName, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    /// <summary>
    /// Lấy giá trị số thập phân của trường, null nếu không parse được.
    /// Dùng InvariantCulture vì XML 130 ghi số kiểu "257100.000" — nếu parse theo
    /// culture tiếng Việt (dấu '.' là phân cách nghìn) sẽ đọc sai thành 257.100.000.
    /// </summary>
    public decimal? GetDecimal(string fieldName)
        => decimal.TryParse(Get(fieldName), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : null;
}
