using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Đối chiếu dịch vụ kỹ thuật trong bảng XML3 với danh mục của cơ sở KCB
/// (dịch vụ kỹ thuật, chẩn đoán hình ảnh, xét nghiệm, loại giường):
/// - Mã dịch vụ (MA_DICH_VU) có trong danh mục không.
/// - Dịch vụ đã ngừng hoạt động trong danh mục.
/// - Đơn giá BH kê khai lệch đơn giá danh mục.
///
/// Chỉ chạy khi đã nạp ít nhất một danh mục dịch vụ của đúng cơ sở KCB.
/// </summary>
public class ServiceCatalogRule : IXml130Rule
{
    public string RuleId => "SERVICE-CATALOG";
    public string RuleName => "Đối chiếu dịch vụ kỹ thuật với danh mục cơ sở";

    /// <summary>Sai lệch đơn giá cho phép (đồng).</summary>
    private const decimal PriceTolerance = 1m;

    private readonly ICatalogLookupProvider _catalog;
    private readonly ILogger<ServiceCatalogRule> _logger;

    public ServiceCatalogRule(ICatalogLookupProvider catalog, ILogger<ServiceCatalogRule> logger)
    {
        _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<Xml130Issue>> ValidateAsync(
        Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var rows = hoso.GetRows("XML3");
        if (rows.Count == 0)
        {
            return issues;
        }

        // Mã cơ sở KCB do parser gán: XML1/MA_CSKCB, thiếu thì lấy THONGTINDONVI/MACSKCB của file
        var facilityCode = hoso.FacilityCode;
        if (facilityCode == null)
        {
            return issues;
        }

        if (!await _catalog.HasAnyServiceCatalogAsync(facilityCode, cancellationToken))
        {
            _logger.LogInformation(
                "Chưa nạp danh mục dịch vụ của cơ sở {Facility} — bỏ qua đối chiếu danh mục dịch vụ", facilityCode);
            return issues;
        }

        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var maDichVu = row.Get("MA_DICH_VU");
            var tenDichVu = row.Get("TEN_DICH_VU") ?? $"dòng {row.RowIndex}";
            if (maDichVu == null)
            {
                continue;
            }

            // Một mã dịch vụ kỹ thuật có thể ứng với nhiều dòng danh mục khác giá
            var items = await _catalog.FindServiceByCodeAsync(facilityCode, maDichVu, cancellationToken);
            if (items.Count == 0)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML3-CAT001",
                    Severity = ValidationSeverity.Error,
                    Group = "Service",
                    Table = "XML3",
                    Field = "MA_DICH_VU",
                    RowIndex = row.RowIndex,
                    Value = maDichVu,
                    Message = $"[XML3 dòng {row.RowIndex}] {tenDichVu}: mã dịch vụ \"{maDichVu}\" không có trong danh mục dịch vụ của cơ sở — giám định sẽ từ chối thanh toán.",
                    Suggestion = "Kiểm tra mã dịch vụ kỹ thuật theo Bộ mã danh mục dùng chung, hoặc cập nhật danh mục dịch vụ của cơ sở.",
                    XuatToanRisk = true
                });
                continue;
            }

            // Chỉ cảnh báo khi mọi dòng cùng mã đều đã ngừng hoạt động
            if (items.All(i => !i.IsActive))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML3-CAT002",
                    Severity = ValidationSeverity.Warning,
                    Group = "Service",
                    Table = "XML3",
                    Field = "MA_DICH_VU",
                    RowIndex = row.RowIndex,
                    Value = maDichVu,
                    Message = $"[XML3 dòng {row.RowIndex}] {tenDichVu}: dịch vụ đã NGỪNG hoạt động trong danh mục cơ sở.",
                    XuatToanRisk = true
                });
            }

            var donGiaBh = row.GetDecimal("DON_GIA_BH");
            var prices = items.Where(i => i.PriceBhyt.HasValue).Select(i => i.PriceBhyt!.Value).ToList();
            if (donGiaBh.HasValue && prices.Count > 0
                && !prices.Any(p => Math.Abs(donGiaBh.Value - p) <= PriceTolerance))
            {
                var priceText = prices.Count == 1
                    ? $"{prices[0]:N0}đ"
                    : $"{prices.Min():N0}–{prices.Max():N0}đ ({prices.Count} dòng cùng mã)";

                issues.Add(new Xml130Issue
                {
                    RuleId = "XML3-CAT003",
                    Severity = ValidationSeverity.Warning,
                    Group = "Service",
                    Table = "XML3",
                    Field = "DON_GIA_BH",
                    RowIndex = row.RowIndex,
                    Value = donGiaBh.Value.ToString("N0"),
                    Message = $"[XML3 dòng {row.RowIndex}] {tenDichVu}: đơn giá BH kê khai {donGiaBh:N0}đ không khớp đơn giá danh mục cơ sở ({priceText}) — giám định sẽ xuất toán phần chênh.",
                    XuatToanRisk = true
                });
            }
        }

        return issues;
    }
}
