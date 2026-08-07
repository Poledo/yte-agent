using System.Text;
using ExcelDataReader;

namespace AIValidation.Api.Providers.Catalog;

/// <summary>
/// Bảng dữ liệu thô đọc từ file Excel danh mục.
/// </summary>
public record ExcelSheet
{
    /// <summary>Tên cột theo đúng thứ tự trong file.</summary>
    public required List<string> Columns { get; init; }

    /// <summary>Các dòng dữ liệu: tên cột → giá trị dạng chuỗi (đã trim).</summary>
    public required List<Dictionary<string, string>> Rows { get; init; }
}

/// <summary>
/// Đọc file danh mục Excel. Hỗ trợ cả .xls (định dạng nhị phân cũ mà HIS xuất ra)
/// lẫn .xlsx nhờ ExcelDataReader.
/// </summary>
public interface IExcelCatalogReader
{
    /// <summary>
    /// Đọc sheet đầu tiên của file. headerRowIndex: dòng chứa tiêu đề cột (0-based) —
    /// một số báo cáo HIS để tiêu đề ở dòng thứ hai.
    /// </summary>
    ExcelSheet Read(Stream stream, string fileName, int headerRowIndex = 0);
}

/// <inheritdoc />
public class ExcelCatalogReader : IExcelCatalogReader
{
    static ExcelCatalogReader()
    {
        // ExcelDataReader cần code page Windows-1252 để đọc .xls đời cũ
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public ExcelSheet Read(Stream stream, string fileName, int headerRowIndex = 0)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is not (".xls" or ".xlsx" or ".xlsm"))
        {
            throw new NotSupportedException(
                $"Định dạng {ext} không phải file Excel danh mục. Chấp nhận: .xls, .xlsx.");
        }

        // LeaveOpen: mặc định ExcelDataReader đóng stream khi dispose, khiến không
        // đọc lại được file (trường hợp phải đọc lần hai theo đúng dòng tiêu đề).
        using var reader = ExcelReaderFactory.CreateReader(
            stream, new ExcelReaderConfiguration { LeaveOpen = true });

        // Bỏ qua các dòng phía trên dòng tiêu đề
        for (var i = 0; i < headerRowIndex; i++)
        {
            if (!reader.Read())
            {
                throw new FormatException($"File không có dòng tiêu đề tại dòng {headerRowIndex + 1}.");
            }
        }

        if (!reader.Read())
        {
            throw new FormatException("File Excel rỗng.");
        }

        // Đọc tiêu đề cột; cột trống được đặt tên Column{n} để không mất vị trí
        var columns = new List<string>();
        for (var i = 0; i < reader.FieldCount; i++)
        {
            var raw = reader.GetValue(i)?.ToString()?.Trim();
            columns.Add(string.IsNullOrEmpty(raw) ? $"Column{i + 1}" : raw);
        }

        var rows = new List<Dictionary<string, string>>();
        var values = new List<string>(columns.Count);
        while (reader.Read())
        {
            values.Clear();
            var hasValue = false;

            for (var i = 0; i < columns.Count && i < reader.FieldCount; i++)
            {
                var value = FormatCell(reader.GetValue(i));
                values.Add(value);
                if (!string.IsNullOrEmpty(value))
                {
                    hasValue = true;
                }
            }

            if (!hasValue || IsRepeatedHeader(columns, values))
            {
                continue;
            }

            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < values.Count; i++)
            {
                row[columns[i]] = values[i];
            }
            rows.Add(row);
        }

        return new ExcelSheet { Columns = columns, Rows = rows };
    }

    /// <summary>
    /// Nhận biết dòng tiêu đề bị in lại giữa file. HIS xuất danh mục theo trang nên
    /// cứ hết một trang lại chèn một dòng trống + một dòng tiêu đề y hệt dòng đầu.
    /// Không loại ra thì dòng đó thành một mục danh mục rác, và tệ hơn là cột mã cơ
    /// sở nhận thêm giá trị "DVTT" khiến file bị coi là gộp nhiều cơ sở KCB.
    /// </summary>
    private static bool IsRepeatedHeader(List<string> columns, List<string> values)
    {
        var matched = 0;
        for (var i = 0; i < columns.Count && i < values.Count; i++)
        {
            // Cột trống được đặt tên Column{n}, không dùng để so khớp
            if (columns[i].StartsWith("Column", StringComparison.Ordinal))
            {
                continue;
            }
            if (!string.Equals(columns[i], values[i], StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
            matched++;
        }
        return matched >= 2;
    }

    /// <summary>
    /// Chuẩn hóa giá trị ô thành chuỗi. Số nguyên dạng double (1234.0 do Excel lưu)
    /// được ghi lại là "1234" để mã danh mục không bị đuôi ".0".
    /// </summary>
    private static string FormatCell(object? value)
    {
        return value switch
        {
            null => "",
            double d when Math.Abs(d % 1) < 0.0000001 && Math.Abs(d) < 1e15
                => ((long)d).ToString(System.Globalization.CultureInfo.InvariantCulture),
            double d => d.ToString(System.Globalization.CultureInfo.InvariantCulture),
            DateTime dt => dt.ToString("yyyy-MM-dd HH:mm:ss"),
            _ => value.ToString()?.Trim() ?? ""
        };
    }
}
