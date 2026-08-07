using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Đối chiếu cơ sở chuyển tuyến với danh mục đơn vị chuyển tuyến của cơ sở KCB
/// (file E_chuyen_vien do HIS xuất ra — chứa mã cơ sở đích, tên, tuyến, cự ly).
///
/// Kiểm tra:
/// - XML13.MA_CSKCB_DEN và XML1.MA_NOI_DEN có trong danh mục đơn vị chuyển tuyến không.
/// - Đơn vị chuyển tuyến đã ngừng hoạt động trong danh mục.
///
/// Chỉ chạy khi danh mục được nạp kèm mã cơ sở (tham số facility khi import)
/// và khớp cơ sở của hồ sơ — file HIS xuất ra không có cột mã cơ sở nên nếu
/// người dùng không chỉ định, rule bỏ qua để tránh báo sai cho cơ sở khác.
/// </summary>
public class TransferCatalogRule : IXml130Rule
{
    public string RuleId => "TRANSFER-CATALOG";
    public string RuleName => "Đối chiếu đơn vị chuyển tuyến với danh mục";

    private const string CatalogType = "Transfer";

    private readonly ICatalogLookupProvider _catalog;
    private readonly ILogger<TransferCatalogRule> _logger;

    public TransferCatalogRule(ICatalogLookupProvider catalog, ILogger<TransferCatalogRule> logger)
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

        if (!await _catalog.HasCatalogAsync(CatalogType, facilityCode, cancellationToken))
        {
            _logger.LogInformation(
                "Chưa nạp danh mục đơn vị chuyển tuyến của cơ sở {Facility} — bỏ qua đối chiếu chuyển tuyến",
                facilityCode);
            return issues;
        }

        // Mã cơ sở chuyển đến xuất hiện ở cả XML13 (giấy chuyển tuyến) và XML1 (nơi đến)
        var targets = new List<(string Table, string Field, string? Code, int? RowIndex)>
        {
            ("XML1", "MA_NOI_DEN", hoso.GetField("XML1", "MA_NOI_DEN"), null)
        };

        foreach (var row in hoso.GetRows("XML13"))
        {
            targets.Add(("XML13", "MA_CSKCB_DEN", row.Get("MA_CSKCB_DEN"), row.RowIndex));
        }

        foreach (var (table, field, code, rowIndex) in targets)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (code == null)
            {
                continue;
            }

            var items = await _catalog.FindByCodeAsync(CatalogType, facilityCode, code, cancellationToken);
            if (items.Count == 0)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = $"{table}-CAT010",
                    Severity = ValidationSeverity.Warning,
                    Group = "Admin",
                    Table = table,
                    Field = field,
                    RowIndex = rowIndex,
                    Value = code,
                    Message = $"[{table}] Cơ sở chuyển đến \"{code}\" không có trong danh mục đơn vị chuyển tuyến của cơ sở — kiểm tra lại mã cơ sở hoặc bổ sung vào danh mục HIS.",
                    XuatToanRisk = true
                });
                continue;
            }

            var item = items[0];
            if (!item.IsActive)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = $"{table}-CAT011",
                    Severity = ValidationSeverity.Warning,
                    Group = "Admin",
                    Table = table,
                    Field = field,
                    RowIndex = rowIndex,
                    Value = code,
                    Message = $"[{table}] Đơn vị chuyển tuyến \"{code}\" ({item.Name}) đã ngừng hoạt động trong danh mục cơ sở.",
                    XuatToanRisk = false
                });
            }
        }

        return issues;
    }
}
