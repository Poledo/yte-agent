using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AIValidation.Api.Providers.Xml130;
using ExcelDataReader;

namespace AIValidation.Api.Services.Xml130;

/// <summary>Kết quả import đặc tả trường XML130 (để hiển thị cho người dùng biết đã đổi gì).</summary>
public record Xml130FieldSpecImportResult
{
    public required string Message { get; init; }
    public int TableCount { get; init; }
    public int FieldCount { get; init; }
    public int Added { get; init; }
    public int Updated { get; init; }
    public int Removed { get; init; }
    public int Unchanged { get; init; }
    public int InferredDates { get; init; }
    public int InferredEnums { get; init; }

    /// <summary>Sheet không map được sang bảng XML1..XML15 (ví dụ "Bang Check-in") — bỏ qua.</summary>
    public List<string> SkippedSheets { get; init; } = new();

    /// <summary>Tóm tắt thay đổi từng bảng.</summary>
    public List<Xml130TableImportSummary> Tables { get; init; } = new();
}

public record Xml130TableImportSummary
{
    public required string TableId { get; init; }
    public string? TableName { get; init; }
    public int Fields { get; init; }
    public int Added { get; init; }
    public int Updated { get; init; }
    public int Removed { get; init; }
}

/// <summary>
/// Nạp lại đặc tả trường XML130 từ file Excel "Bảng chỉ tiêu dữ liệu" (QĐ130 + QĐ4750 +
/// điều chỉnh 2024). File này chỉ có: tên trường, kiểu (Chuỗi/Số), kích thước tối đa,
/// diễn giải. Vì vậy import theo cơ chế GỘP THÔNG MINH:
/// - Cập nhật kiểu dữ liệu + kích thước + diễn giải theo file; thêm/bớt trường theo file.
/// - Tự SUY LUẬN từ chính diễn giải: định dạng ngày (yyyymmdd/yyyyMMddHHmm) và danh mục
///   giá trị cho phép (các mã "02": ...; "03": ...).
/// - GIỮ nguyên required + định dạng + enum đã curate cho các trường còn tồn tại khi
///   không suy luận được, để không làm yếu validation.
/// </summary>
public interface IXml130FieldSpecImportService
{
    Task<Xml130FieldSpecImportResult> ImportAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class Xml130FieldSpecImportService : IXml130FieldSpecImportService
{
    private readonly IXml130SpecProvider _specProvider;
    private readonly ILogger<Xml130FieldSpecImportService> _logger;

    // Tên trường XML130 là mã ASCII in hoa + gạch dưới (MA_LK, HO_TEN...). Dùng để lọc
    // các dòng thật sự là trường, bỏ dòng ghi chú/tiêu đề lẫn trong bảng.
    private static readonly Regex FieldNamePattern = new(@"^[A-Z0-9_]{2,50}$", RegexOptions.Compiled);
    private static readonly Regex SheetNumberPattern = new(@"B[aả]ng\s*0*(\d{1,2})", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // "mã "02": Điều trị ngoại trú;" hoặc ""1": Chủ tịch" — bắt cặp mã + nhãn để suy ra enum.
    private static readonly Regex EnumEntryPattern = new(
        "(?:m[ãa]\\s*)?[\"“”']([A-Za-z0-9]{1,6})[\"“”']\\s*:\\s*([^;.\\n\\r]{1,120})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    static Xml130FieldSpecImportService()
    {
        // ExcelDataReader cần code page Windows-1252 để đọc .xls đời cũ
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public Xml130FieldSpecImportService(
        IXml130SpecProvider specProvider,
        ILogger<Xml130FieldSpecImportService> logger)
    {
        _specProvider = specProvider ?? throw new ArgumentNullException(nameof(specProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Xml130FieldSpecImportResult> ImportAsync(
        Stream fileStream, string fileName, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is not (".xls" or ".xlsx" or ".xlsm"))
        {
            throw new NotSupportedException(
                $"Định dạng {ext} không phải file Excel. Chấp nhận file đặc tả .xls hoặc .xlsx.");
        }

        // Đọc TẤT CẢ sheet của file thành các bảng trường thô
        var parsedTables = ParseWorkbook(fileStream, out var skippedSheets);
        if (parsedTables.Count == 0)
        {
            throw new FormatException(
                "Không nhận ra bảng chỉ tiêu nào (sheet cần đặt tên dạng \"Bảng 1_...\" đến \"Bảng 15_...\" "
                + "và có cột \"Chỉ tiêu\", \"Kiểu dữ liệu\", \"Kích thước tối đa\").");
        }

        // Gộp lên đặc tả hiện hành
        var current = await _specProvider.GetSpecsAsync(cancellationToken);
        var existingByTable = current.Tables.ToDictionary(
            t => t.TableId,
            t => t.Fields.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase),
            StringComparer.OrdinalIgnoreCase);

        var merged = new Xml130FieldSpecs();
        int totalAdded = 0, totalUpdated = 0, totalRemoved = 0, totalUnchanged = 0, inferredDates = 0, inferredEnums = 0;
        var tableSummaries = new List<Xml130TableImportSummary>();

        // Giữ nguyên thứ tự XML1..XML15
        foreach (var parsed in parsedTables.OrderBy(t => TableOrder(t.TableId)))
        {
            existingByTable.TryGetValue(parsed.TableId, out var existingFields);
            var existingTable = current.Tables.FirstOrDefault(t => t.TableId.Equals(parsed.TableId, StringComparison.OrdinalIgnoreCase));

            var tableSpec = new Xml130TableSpec
            {
                TableId = parsed.TableId,
                // Giữ tên bảng đã đặt (TONG_HOP, CHI_TIET_THUOC...) nếu có
                TableName = existingTable?.TableName ?? parsed.TableName
            };

            int added = 0, updated = 0;
            foreach (var raw in parsed.Fields)
            {
                Xml130FieldSpec? existing = null;
                existingFields?.TryGetValue(raw.Name, out existing);

                var (field, isDate, isEnum) = BuildField(raw, existing);
                if (isDate) inferredDates++;
                if (isEnum) inferredEnums++;

                if (existing == null)
                {
                    added++;
                }
                else if (HasChanged(existing, field))
                {
                    updated++;
                }
                else
                {
                    totalUnchanged++;
                }

                tableSpec.Fields.Add(field);
            }

            // Trường có trong bản cũ nhưng KHÔNG còn trong file → bị loại (cấu trúc đổi)
            var newNames = tableSpec.Fields.Select(f => f.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var removed = existingFields?.Keys.Count(n => !newNames.Contains(n)) ?? 0;

            totalAdded += added;
            totalUpdated += updated;
            totalRemoved += removed;

            merged.Tables.Add(tableSpec);
            tableSummaries.Add(new Xml130TableImportSummary
            {
                TableId = parsed.TableId,
                TableName = tableSpec.TableName,
                Fields = tableSpec.Fields.Count,
                Added = added,
                Updated = updated,
                Removed = removed
            });
        }

        // Bảng có trong bản cũ nhưng file không đụng tới → giữ nguyên (tránh mất mát ngoài ý muốn)
        foreach (var old in current.Tables)
        {
            if (!merged.Tables.Any(t => t.TableId.Equals(old.TableId, StringComparison.OrdinalIgnoreCase)))
            {
                merged.Tables.Add(old);
            }
        }
        merged.Tables = merged.Tables.OrderBy(t => TableOrder(t.TableId)).ToList();

        await _specProvider.SaveAsync(merged, cancellationToken);

        var fieldCount = merged.Tables.Sum(t => t.Fields.Count);
        var message =
            $"Đã cập nhật đặc tả XML130 từ \"{fileName}\": {merged.Tables.Count} bảng, {fieldCount} trường "
            + $"(thêm {totalAdded}, sửa {totalUpdated}, bỏ {totalRemoved}). "
            + $"Tự nhận diện {inferredDates} trường ngày và {inferredEnums} trường có danh mục giá trị từ diễn giải. "
            + "Điều kiện kiểm tra hồ sơ đã đổi theo file ngay lập tức.";

        _logger.LogInformation("Import đặc tả XML130: {Message}", message);

        return new Xml130FieldSpecImportResult
        {
            Message = message,
            TableCount = merged.Tables.Count,
            FieldCount = fieldCount,
            Added = totalAdded,
            Updated = totalUpdated,
            Removed = totalRemoved,
            Unchanged = totalUnchanged,
            InferredDates = inferredDates,
            InferredEnums = inferredEnums,
            SkippedSheets = skippedSheets,
            Tables = tableSummaries
        };
    }

    /// <summary>Dựng một field spec từ dòng file, gộp với bản cũ và suy luận date/enum từ diễn giải.</summary>
    private static (Xml130FieldSpec field, bool inferredDate, bool inferredEnum) BuildField(
        RawField raw, Xml130FieldSpec? existing)
    {
        var field = new Xml130FieldSpec
        {
            Name = raw.Name,
            DataType = raw.DataType,
            MaxLength = raw.MaxLength,
            Description = string.IsNullOrWhiteSpace(raw.Description) ? existing?.Description : raw.Description,
            SourceNote = raw.SourceNote ?? existing?.SourceNote,
            // required không có trong file → giữ giá trị đã curate; trường mới suy từ diễn giải
            Required = existing?.Required ?? InferRequired(raw)
        };

        var desc = raw.Description ?? existing?.Description ?? string.Empty;

        // --- ĐỊNH DẠNG NGÀY ---
        // GIỮ định dạng đã curate cho trường còn tồn tại (tránh làm yếu/đổi sai validation);
        // chỉ SUY LUẬN cho trường mới hoặc trường trước đây chưa được đánh định dạng.
        bool inferredDate = false;
        if (existing?.Format != null)
        {
            field.Format = existing.Format;
            field.DataType = "date";
        }
        else
        {
            var inferredFormat = InferDateFormat(desc);
            if (inferredFormat != null)
            {
                field.Format = inferredFormat;
                field.DataType = "date";
                inferredDate = true;
            }
        }

        // --- Suy luận DANH MỤC GIÁ TRỊ (enum) ---
        bool inferredEnum = false;
        if (existing?.AllowedValues is { Count: > 0 })
        {
            // Giữ enum đã curate
            field.AllowedValues = existing.AllowedValues;
            field.ValueLabels = existing.ValueLabels;
        }
        else
        {
            var (values, labels) = InferEnum(desc, field.MaxLength);
            if (values.Count >= 2)
            {
                field.AllowedValues = values;
                field.ValueLabels = labels;
                inferredEnum = true;
            }
        }

        return (field, inferredDate, inferredEnum);
    }

    private static bool HasChanged(Xml130FieldSpec a, Xml130FieldSpec b)
        => a.DataType != b.DataType
           || a.MaxLength != b.MaxLength
           || a.Required != b.Required
           || a.Format != b.Format
           || (a.AllowedValues?.Count ?? 0) != (b.AllowedValues?.Count ?? 0)
           || !string.Equals(a.Description, b.Description, StringComparison.Ordinal);

    /// <summary>Suy required: PRIMARY KEY / "bắt buộc" trong diễn giải, hoặc trường khóa liên kết.</summary>
    private static bool InferRequired(RawField raw)
    {
        if (raw.Name is "MA_LK" or "STT")
        {
            return true;
        }
        var d = raw.Description ?? string.Empty;
        return d.Contains("PRIMARY KEY", StringComparison.OrdinalIgnoreCase)
               || d.Contains("bắt buộc", StringComparison.OrdinalIgnoreCase);
    }

    private static string? InferDateFormat(string description)
    {
        if (string.IsNullOrEmpty(description))
        {
            return null;
        }
        var d = description.ToLowerInvariant();
        if (d.Contains("yyyymmddhhmm"))
        {
            return "yyyyMMddHHmm";
        }
        if (d.Contains("yyyymmdd"))
        {
            return "yyyyMMdd";
        }
        return null;
    }

    /// <summary>Suy danh mục giá trị từ diễn giải. Chỉ nhận khi các mã ngắn (đúng kiểu enum thật).</summary>
    private static (List<string> values, Dictionary<string, string> labels) InferEnum(string description, int? maxLength)
    {
        var values = new List<string>();
        var labels = new Dictionary<string, string>();
        if (string.IsNullOrEmpty(description))
        {
            return (values, labels);
        }

        foreach (Match m in EnumEntryPattern.Matches(description))
        {
            var code = m.Groups[1].Value.Trim();
            var label = m.Groups[2].Value.Trim().TrimEnd(';', ',', '.', ' ');
            // enum thật thường là mã ngắn (02, 03, 1, 2, KT...). Bỏ chuỗi dài trông như câu chữ.
            if (code.Length is < 1 or > 6)
            {
                continue;
            }
            if (!labels.ContainsKey(code))
            {
                values.Add(code);
                labels[code] = label;
            }
        }

        // Trường mô tả tự do (maxLength lớn) hiếm khi là enum — tránh dương tính giả
        if (maxLength is > 20 && values.Count < 3)
        {
            return (new List<string>(), new Dictionary<string, string>());
        }

        return (values, labels);
    }

    // ------------------------------------------------------------------
    // Đọc workbook: mỗi sheet "Bảng N_..." → bảng XMLN; các sheet khác bỏ qua.
    // ------------------------------------------------------------------

    private record RawField
    {
        public required string Name { get; init; }
        public string DataType { get; init; } = "string";
        public int? MaxLength { get; init; }
        public string? Description { get; init; }
        public string? SourceNote { get; init; }
    }

    private record ParsedTable
    {
        public required string TableId { get; init; }
        public string? TableName { get; init; }
        public List<RawField> Fields { get; init; } = new();
    }

    private List<ParsedTable> ParseWorkbook(Stream stream, out List<string> skippedSheets)
    {
        skippedSheets = new List<string>();
        var tables = new List<ParsedTable>();

        using var reader = ExcelReaderFactory.CreateReader(stream, new ExcelReaderConfiguration { LeaveOpen = true });
        do
        {
            var sheetName = reader.Name?.Trim() ?? string.Empty;
            var match = SheetNumberPattern.Match(sheetName);
            // Đọc toàn bộ dòng của sheet để phân tích (dù có bỏ qua hay không, vẫn phải Read hết)
            var rows = new List<List<string>>();
            while (reader.Read())
            {
                var cells = new List<string>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    cells.Add(FormatCell(reader.GetValue(i)));
                }
                rows.Add(cells);
            }

            if (!match.Success)
            {
                if (!string.IsNullOrEmpty(sheetName))
                {
                    skippedSheets.Add(sheetName);
                }
                continue;
            }

            var tableId = "XML" + int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
            var parsed = ParseSheet(tableId, sheetName, rows);
            if (parsed != null && parsed.Fields.Count > 0)
            {
                tables.Add(parsed);
            }
        } while (reader.NextResult());

        return tables;
    }

    private static ParsedTable? ParseSheet(string tableId, string sheetName, List<List<string>> rows)
    {
        // Tìm dòng tiêu đề: có ô "Chỉ tiêu" và ô "Kiểu dữ liệu"
        int headerIdx = -1, idxName = -1, idxType = -1, idxLen = -1;
        var descCols = new List<(int index, string header)>();

        for (var r = 0; r < rows.Count; r++)
        {
            var cells = rows[r];
            var localName = cells.FindIndex(c => c.Equals("Chỉ tiêu", StringComparison.OrdinalIgnoreCase));
            var localType = cells.FindIndex(c => c.Contains("Kiểu dữ liệu", StringComparison.OrdinalIgnoreCase));
            if (localName >= 0 && localType >= 0)
            {
                headerIdx = r;
                idxName = localName;
                idxType = localType;
                idxLen = cells.FindIndex(c => c.Contains("Kích thước", StringComparison.OrdinalIgnoreCase));
                var descStart = Math.Max(idxLen, idxType) + 1;
                for (var c = descStart; c < cells.Count; c++)
                {
                    descCols.Add((c, cells[c]));
                }
                break;
            }
        }

        if (headerIdx < 0)
        {
            return null;
        }

        // Tên bảng lấy từ dòng tiêu đề bảng phía trên (nếu có), ví dụ "Bảng 1. Chỉ tiêu tổng hợp..."
        var titleRow = headerIdx > 0 ? rows[headerIdx - 1].FirstOrDefault(c => !string.IsNullOrWhiteSpace(c)) : null;
        var table = new ParsedTable { TableId = tableId, TableName = CleanTableName(titleRow) ?? sheetName };

        for (var r = headerIdx + 1; r < rows.Count; r++)
        {
            var cells = rows[r];
            if (idxName >= cells.Count)
            {
                continue;
            }
            var name = cells[idxName].Trim().ToUpperInvariant();
            if (!FieldNamePattern.IsMatch(name))
            {
                continue; // bỏ dòng ghi chú/tiêu đề phụ
            }
            if (table.Fields.Any(f => f.Name == name))
            {
                continue; // trùng tên trong cùng bảng — giữ dòng đầu
            }

            var typeText = idxType < cells.Count ? cells[idxType] : string.Empty;
            var lenText = idxLen >= 0 && idxLen < cells.Count ? cells[idxLen] : string.Empty;

            // Diễn giải: lấy cột sửa đổi mới nhất (bên phải) có nội dung
            string? desc = null, sourceNote = null;
            for (var i = descCols.Count - 1; i >= 0; i--)
            {
                var (colIdx, header) = descCols[i];
                if (colIdx < cells.Count && !string.IsNullOrWhiteSpace(cells[colIdx]))
                {
                    desc = CleanText(cells[colIdx]);
                    sourceNote = SourceNoteFromHeader(header);
                    break;
                }
            }

            table.Fields.Add(new RawField
            {
                Name = name,
                DataType = MapDataType(typeText),
                MaxLength = ParseMaxLength(lenText),
                Description = desc,
                SourceNote = sourceNote
            });
        }

        return table;
    }

    private static string MapDataType(string text)
    {
        var t = text.Trim().ToLowerInvariant();
        if (t.Contains("ngày"))
        {
            return "date";
        }
        if (t.StartsWith("số") || t == "so" || t.Contains("number") || t.Contains("numeric"))
        {
            return "number";
        }
        return "string";
    }

    private static int? ParseMaxLength(string text)
    {
        var t = text.Trim();
        if (string.IsNullOrEmpty(t))
        {
            return null;
        }
        // "n" (độ dài thay đổi) hoặc bất kỳ ký tự không phải số → không giới hạn
        var dot = t.IndexOf('.');
        if (dot >= 0)
        {
            t = t[..dot];
        }
        return int.TryParse(t, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) && n > 0 ? n : (int?)null;
    }

    private static string? SourceNoteFromHeader(string header)
    {
        var h = header.ToLowerInvariant();
        if (h.Contains("sửa đổi") || h.Contains("điều chỉnh"))
        {
            return "Điều chỉnh 2024";
        }
        if (h.Contains("4750"))
        {
            return "QĐ4750";
        }
        return "QĐ130";
    }

    private static string? CleanTableName(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return null;
        }
        // Lấy phần sau "Bảng N." và trước dấu xuống dòng (bỏ dòng "Ban hành kèm theo...")
        var firstLine = title.Split('\n', '\r').FirstOrDefault(l => !string.IsNullOrWhiteSpace(l))?.Trim();
        return string.IsNullOrWhiteSpace(firstLine) ? null : firstLine;
    }

    private static string CleanText(string text)
    {
        var cleaned = Regex.Replace(text, @"\s*[\r\n]+\s*", " ").Trim();
        return Regex.Replace(cleaned, @"[ \t]{2,}", " ");
    }

    private static string FormatCell(object? value)
    {
        return value switch
        {
            null => "",
            double d when Math.Abs(d % 1) < 0.0000001 && Math.Abs(d) < 1e15
                => ((long)d).ToString(CultureInfo.InvariantCulture),
            double d => d.ToString(CultureInfo.InvariantCulture),
            DateTime dt => dt.ToString("yyyy-MM-dd HH:mm:ss"),
            _ => value.ToString()?.Trim() ?? ""
        };
    }

    private static int TableOrder(string tableId)
        => int.TryParse(tableId.Replace("XML", "", StringComparison.OrdinalIgnoreCase), out var n) ? n : 999;
}
