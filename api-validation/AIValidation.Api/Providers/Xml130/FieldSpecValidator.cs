using System.Globalization;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;

namespace AIValidation.Api.Providers.Xml130;

/// <summary>
/// Kiểm tra từng trường của hồ sơ XML 130 theo đặc tả field_specs.json:
/// bắt buộc, kiểu dữ liệu, độ dài tối đa, định dạng ngày, giá trị cho phép.
/// </summary>
public interface IFieldSpecValidator
{
    Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class FieldSpecValidator : IFieldSpecValidator
{
    private readonly IXml130SpecProvider _specProvider;

    /// <summary>Map mã bảng → nhóm hiển thị mặc định cho cảnh báo cấp trường.</summary>
    private static readonly Dictionary<string, string> TableGroups = new(StringComparer.OrdinalIgnoreCase)
    {
        ["XML1"] = "PatientInfo",
        ["XML2"] = "Drug",
        ["XML3"] = "Service",
        ["XML4"] = "Service",
        ["XML5"] = "Diagnosis",
        ["XML6"] = "Admin",
        ["XML7"] = "Admin",
        ["XML8"] = "Admin",
        ["XML9"] = "Admin",
        ["XML10"] = "Admin",
        ["XML11"] = "Admin",
        ["XML12"] = "Admin",
        ["XML13"] = "Admin",
        ["XML14"] = "Admin",
        ["XML15"] = "Admin"
    };

    public FieldSpecValidator(IXml130SpecProvider specProvider)
    {
        _specProvider = specProvider ?? throw new ArgumentNullException(nameof(specProvider));
    }

    public async Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);

        var specs = await _specProvider.GetSpecsAsync(cancellationToken);
        var issues = new List<Xml130Issue>();

        foreach (var tableSpec in specs.Tables)
        {
            var rows = hoso.GetRows(tableSpec.TableId);
            if (rows.Count == 0)
            {
                continue;
            }

            var group = TableGroups.GetValueOrDefault(tableSpec.TableId, "Admin");
            var multiRow = rows.Count > 1;

            foreach (var row in rows)
            {
                foreach (var fieldSpec in tableSpec.Fields)
                {
                    ValidateField(row, fieldSpec, tableSpec.TableId, group, multiRow, issues);
                }
            }
        }

        return issues;
    }

    private static void ValidateField(
        Xml130Row row,
        Xml130FieldSpec spec,
        string tableId,
        string group,
        bool multiRow,
        List<Xml130Issue> issues)
    {
        int? rowIndex = multiRow ? row.RowIndex : null;
        var value = row.Get(spec.Name);

        if (value == null)
        {
            if (spec.Required && row.Fields.ContainsKey(spec.Name))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = $"SPEC-REQUIRED-{tableId}",
                    Severity = ValidationSeverity.Error,
                    Group = group,
                    Table = tableId,
                    Field = spec.Name,
                    RowIndex = rowIndex,
                    Message = $"[{tableId}] Trường bắt buộc {spec.Name} đang để trống — hồ sơ có thể bị từ chối tiếp nhận.",
                    Suggestion = spec.Description,
                    XuatToanRisk = true
                });
            }
            return;
        }

        // Độ dài tối đa
        if (spec.MaxLength is > 0 && value.Length > spec.MaxLength)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = $"SPEC-MAXLEN-{tableId}",
                Severity = ValidationSeverity.Error,
                Group = group,
                Table = tableId,
                Field = spec.Name,
                RowIndex = rowIndex,
                Value = value,
                Message = $"[{tableId}] {spec.Name} dài {value.Length} ký tự, vượt giới hạn {spec.MaxLength} ký tự theo QĐ 130.",
                XuatToanRisk = false
            });
        }

        // Kiểu số
        if (spec.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
            && !decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            issues.Add(new Xml130Issue
            {
                RuleId = $"SPEC-NUMBER-{tableId}",
                Severity = ValidationSeverity.Error,
                Group = group,
                Table = tableId,
                Field = spec.Name,
                RowIndex = rowIndex,
                Value = value,
                Message = $"[{tableId}] {spec.Name} phải là số nhưng đang có giá trị \"{value}\".",
                XuatToanRisk = true
            });
        }

        // Định dạng ngày yyyyMMdd / yyyyMMddHHmm
        if (spec.Format is "yyyyMMdd" or "yyyyMMddHHmm" && !IsValidDate(value, spec.Format))
        {
            issues.Add(new Xml130Issue
            {
                RuleId = $"SPEC-DATE-{tableId}",
                Severity = ValidationSeverity.Error,
                Group = group,
                Table = tableId,
                Field = spec.Name,
                RowIndex = rowIndex,
                Value = value,
                Message = $"[{tableId}] {spec.Name} sai định dạng ngày ({spec.Format}): \"{value}\".",
                Suggestion = $"Nhập theo định dạng {spec.Format}, ví dụ {(spec.Format == "yyyyMMdd" ? "20260714" : "202607140705")}.",
                XuatToanRisk = true
            });
        }

        // Danh sách giá trị cho phép
        if (spec.AllowedValues is { Count: > 0 } && !spec.AllowedValues.Contains(value, StringComparer.OrdinalIgnoreCase))
        {
            var labels = spec.ValueLabels != null
                ? string.Join("; ", spec.ValueLabels.Select(kv => $"{kv.Key}: {kv.Value}"))
                : string.Join(", ", spec.AllowedValues);

            issues.Add(new Xml130Issue
            {
                RuleId = $"SPEC-ENUM-{tableId}",
                Severity = ValidationSeverity.Error,
                Group = group,
                Table = tableId,
                Field = spec.Name,
                RowIndex = rowIndex,
                Value = value,
                Message = $"[{tableId}] {spec.Name} có giá trị \"{value}\" không thuộc danh mục cho phép ({labels}).",
                XuatToanRisk = true
            });
        }
    }

    /// <summary>
    /// Kiểm tra chuỗi ngày QĐ130. Chấp nhận trường hợp đặc biệt tháng/ngày "0000"
    /// (không rõ ngày sinh, tháng sinh) đối với chuỗi 12 ký tự NGAY_SINH.
    /// </summary>
    internal static bool IsValidDate(string value, string format)
    {
        var expectedLength = format == "yyyyMMdd" ? 8 : 12;
        if (value.Length != expectedLength || !value.All(char.IsDigit))
        {
            return false;
        }

        var year = int.Parse(value[..4]);
        var month = int.Parse(value.Substring(4, 2));
        var day = int.Parse(value.Substring(6, 2));

        if (year is < 1900 or > 2100)
        {
            return false;
        }

        // NGAY_SINH cho phép tháng/ngày 00 khi không rõ thông tin
        if (month == 0 && day == 0)
        {
            return true;
        }

        if (month is < 1 or > 12 || day < 1 || day > DateTime.DaysInMonth(year, Math.Max(month, 1)))
        {
            return false;
        }

        if (expectedLength == 12)
        {
            var hour = int.Parse(value.Substring(8, 2));
            var minute = int.Parse(value.Substring(10, 2));
            if (hour > 23 || minute > 59)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>Parse chuỗi ngày QĐ130 (8 hoặc 12 ký tự) thành DateTime, null nếu không hợp lệ.</summary>
    internal static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.All(char.IsDigit))
        {
            return null;
        }

        var format = value.Length switch
        {
            8 => "yyyyMMdd",
            12 => "yyyyMMddHHmm",
            _ => null
        };

        if (format == null)
        {
            return null;
        }

        return DateTime.TryParseExact(value, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt)
            ? dt
            : null;
    }
}
