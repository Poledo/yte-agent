using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Đối chiếu người chỉ định / người thực hiện trong hồ sơ với danh mục nhân viên
/// y tế của cơ sở (file E_nhan_vien — cột Chứng chỉ hành nghề).
///
/// Kiểm tra MA_BAC_SI và NGUOI_THUC_HIEN ở bảng XML2, XML3 có phải số CCHN
/// của nhân viên thuộc cơ sở không.
///
/// Hai lưu ý về dữ liệu thực tế:
/// - Số CCHN trong hồ sơ có số 0 ở đầu ("004840/KH-CCHN") còn danh mục HIS thường
///   không ("4585/KH-CCHN") → phải chuẩn hóa trước khi so.
/// - Danh mục nhân viên thường khai thiếu CCHN cho một phần nhân sự, nên rule
///   chỉ ở mức Cảnh báo, không phải Lỗi.
///
/// Chỉ chạy khi danh mục nhân viên được nạp kèm mã cơ sở (tham số facility).
/// </summary>
public class StaffCatalogRule : IXml130Rule
{
    public string RuleId => "STAFF-CATALOG";
    public string RuleName => "Đối chiếu người chỉ định với danh mục nhân viên";

    private const string CatalogType = "Staff";

    private readonly ICatalogLookupProvider _catalog;
    private readonly ILogger<StaffCatalogRule> _logger;

    public StaffCatalogRule(ICatalogLookupProvider catalog, ILogger<StaffCatalogRule> logger)
    {
        _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<Xml130Issue>> ValidateAsync(
        Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        // Mã cơ sở KCB do parser gán: XML1/MA_CSKCB, thiếu thì lấy THONGTINDONVI/MACSKCB của file
        var facilityCode = hoso.FacilityCode;
        if (facilityCode == null)
        {
            return issues;
        }

        var staff = await _catalog.GetAllWithCodeAsync(CatalogType, facilityCode, cancellationToken);
        if (staff.Count == 0)
        {
            _logger.LogInformation(
                "Chưa nạp danh mục nhân viên (kèm mã cơ sở) của cơ sở {Facility} — bỏ qua đối chiếu người chỉ định",
                facilityCode);
            return issues;
        }

        // Tập số CCHN đã chuẩn hóa để so khớp
        var knownCchn = staff
            .Select(s => NormalizeCchn(s.Code!))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var tableId in new[] { "XML2", "XML3" })
        {
            var group = tableId == "XML2" ? "Drug" : "Service";
            var multiRow = hoso.GetRows(tableId).Count > 1;

            foreach (var row in hoso.GetRows(tableId))
            {
                cancellationToken.ThrowIfCancellationRequested();

                foreach (var field in new[] { "MA_BAC_SI", "NGUOI_THUC_HIEN" })
                {
                    var code = row.Get(field);
                    if (code == null || knownCchn.Contains(NormalizeCchn(code)))
                    {
                        continue;
                    }

                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-CAT020",
                        Severity = ValidationSeverity.Warning,
                        Group = group,
                        Table = tableId,
                        Field = field,
                        RowIndex = multiRow ? row.RowIndex : null,
                        Value = code,
                        Message = $"[{tableId}] Số chứng chỉ hành nghề \"{code}\" không thuộc danh mục nhân viên của cơ sở — kiểm tra lại người chỉ định hoặc cập nhật CCHN trong danh mục nhân sự của HIS.",
                        XuatToanRisk = true
                    });
                }
            }
        }

        return issues;
    }

    /// <summary>
    /// Chuẩn hóa số CCHN để so khớp: bỏ số 0 ở đầu phần số, chuẩn hóa hoa/thường.
    /// "004840/KH-CCHN" và "4840/KH-CCHN" được coi là cùng một chứng chỉ.
    /// </summary>
    internal static string NormalizeCchn(string value)
    {
        var normalized = value.Trim().ToUpperInvariant();
        var slashIndex = normalized.IndexOf('/');

        if (slashIndex <= 0)
        {
            return normalized.TrimStart('0');
        }

        var number = normalized[..slashIndex].TrimStart('0');
        var suffix = normalized[slashIndex..];
        return number + suffix;
    }
}
