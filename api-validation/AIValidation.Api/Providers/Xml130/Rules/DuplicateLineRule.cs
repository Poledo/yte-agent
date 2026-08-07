using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Phát hiện KÊ TRÙNG dòng chi tiết trong cùng MỘT hồ sơ:
/// - XML2 (thuốc): cùng MA_THUOC + cùng NGAY_YL xuất hiện nhiều dòng —
///   dấu hiệu kê đôi một thuốc tại cùng thời điểm y lệnh.
/// - XML3 (DVKT): cùng MA_DICH_VU + cùng NGAY_YL xuất hiện nhiều dòng
///   (loại dòng ngày giường — giường hợp lệ khi lặp theo ngày).
/// Giám định BHXH đối chiếu trùng lặp này để xuất toán phần kê thừa.
/// </summary>
public class DuplicateLineRule : IXml130Rule
{
    public string RuleId => "DUP-LINE";
    public string RuleName => "Kê trùng dòng thuốc / dịch vụ trong một hồ sơ";

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        CheckTable(hoso, "XML2", "MA_THUOC", "Drug", "thuốc", issues);
        CheckTable(hoso, "XML3", "MA_DICH_VU", "Service", "dịch vụ", issues);

        return Task.FromResult(issues);
    }

    private static void CheckTable(
        Xml130Hoso hoso,
        string tableId,
        string codeField,
        string group,
        string loai,
        List<Xml130Issue> issues)
    {
        var duplicates = hoso.GetRows(tableId)
            .Where(r => r.Get(codeField) != null
                && r.Get("NGAY_YL") != null
                // Dòng ngày giường lặp theo ngày là bình thường
                && r.Get("MA_GIUONG") == null)
            .GroupBy(r => (Code: r.Get(codeField)!, NgayYl: r.Get("NGAY_YL")!))
            .Where(g => g.Count() > 1);

        foreach (var dup in duplicates)
        {
            var rows = dup.OrderBy(r => r.RowIndex).ToList();
            var ten = rows[0].Get("TEN_THUOC") ?? rows[0].Get("TEN_DICH_VU") ?? dup.Key.Code;
            var soLuong = rows
                .Select(r => r.GetDecimal("SO_LUONG"))
                .Where(v => v != null)
                .Sum(v => v!.Value);
            var rowText = string.Join(", ", rows.Select(r => r.RowIndex));

            issues.Add(new Xml130Issue
            {
                RuleId = $"{tableId}-DUP01",
                Severity = ValidationSeverity.Warning,
                Group = group,
                Table = tableId,
                Field = $"{codeField};NGAY_YL",
                RowIndex = rows[0].RowIndex,
                Value = dup.Key.Code,
                Message =
                    $"[{tableId}] Kê trùng {loai} \"{ten}\" ({dup.Key.Code}): {rows.Count} dòng cùng giờ y lệnh "
                    + $"{FieldSpecValidator.ParseDate(dup.Key.NgayYl):dd/MM/yyyy HH:mm} (dòng {rowText}"
                    + (soLuong > 0 ? $", tổng số lượng {soLuong:0.##}" : "")
                    + ") — dấu hiệu kê đôi, giám định sẽ xuất toán phần thừa.",
                Suggestion = $"Rà soát lại các dòng {rowText}: nếu kê đôi thì gộp/xóa bớt; nếu thực tế dùng nhiều lần thì sửa giờ y lệnh từng lần cho đúng.",
                XuatToanRisk = true
            });
        }
    }
}
