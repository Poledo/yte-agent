using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Đối chiếu thuốc trong bảng XML2 với danh mục thuốc của cơ sở KCB đã nạp:
/// - Mã hoạt chất (MA_THUOC) có trong danh mục không.
/// - Thuốc đang tạm ngưng / ngoài danh mục BHYT.
/// - Đơn giá kê khai lệch so với đơn giá danh mục.
///
/// Chỉ chạy khi đã nạp danh mục thuốc của đúng cơ sở KCB trong hồ sơ
/// (MA_CSKCB) — chưa có danh mục thì bỏ qua, không báo sai.
/// </summary>
public class DrugCatalogRule : IXml130Rule
{
    public string RuleId => "DRUG-CATALOG";
    public string RuleName => "Đối chiếu thuốc với danh mục cơ sở";

    private const string CatalogType = "Drug";

    /// <summary>Sai lệch đơn giá cho phép (đồng) — dung sai làm tròn của HIS.</summary>
    private const decimal PriceTolerance = 1m;

    private readonly ICatalogLookupProvider _catalog;
    private readonly ILogger<DrugCatalogRule> _logger;

    public DrugCatalogRule(ICatalogLookupProvider catalog, ILogger<DrugCatalogRule> logger)
    {
        _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<Xml130Issue>> ValidateAsync(
        Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var rows = hoso.GetRows("XML2");
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

        if (!await _catalog.HasCatalogAsync(CatalogType, facilityCode, cancellationToken))
        {
            _logger.LogInformation(
                "Chưa nạp danh mục thuốc của cơ sở {Facility} — bỏ qua đối chiếu danh mục thuốc", facilityCode);
            return issues;
        }

        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var maThuoc = row.Get("MA_THUOC");
            var tenThuoc = row.Get("TEN_THUOC") ?? $"dòng {row.RowIndex}";
            if (maThuoc == null)
            {
                continue; // trường bắt buộc đã do FieldSpecValidator xử lý
            }

            // Một mã hoạt chất ứng với nhiều biệt dược khác giá → lấy toàn bộ dòng cùng mã
            var items = await _catalog.FindByCodeAsync(CatalogType, facilityCode, maThuoc, cancellationToken);
            if (items.Count == 0)
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML2-CAT001",
                    Severity = ValidationSeverity.Error,
                    Group = "Drug",
                    Table = "XML2",
                    Field = "MA_THUOC",
                    RowIndex = row.RowIndex,
                    Value = maThuoc,
                    Message = $"[XML2 dòng {row.RowIndex}] {tenThuoc}: mã hoạt chất \"{maThuoc}\" không có trong danh mục thuốc của cơ sở — giám định sẽ từ chối thanh toán.",
                    Suggestion = "Kiểm tra lại mã hoạt chất theo Bộ mã danh mục dùng chung, hoặc cập nhật danh mục thuốc của cơ sở.",
                    XuatToanRisk = true
                });
                continue;
            }

            // Chỉ báo lỗi khi MỌI thuốc cùng mã đều tạm ngưng / ngoài danh mục —
            // còn một biệt dược dùng được thì hồ sơ vẫn hợp lệ.
            if (items.All(i => i.IsSuspended))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML2-CAT002",
                    Severity = ValidationSeverity.Error,
                    Group = "Drug",
                    Table = "XML2",
                    Field = "MA_THUOC",
                    RowIndex = row.RowIndex,
                    Value = maThuoc,
                    Message = $"[XML2 dòng {row.RowIndex}] {tenThuoc}: thuốc đang TẠM NGƯNG sử dụng trong danh mục cơ sở — chi phí sẽ bị xuất toán.",
                    XuatToanRisk = true
                });
            }

            if (items.All(i => i.IsOutsideBhyt))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML2-CAT003",
                    Severity = ValidationSeverity.Error,
                    Group = "Drug",
                    Table = "XML2",
                    Field = "MA_THUOC",
                    RowIndex = row.RowIndex,
                    Value = maThuoc,
                    Message = $"[XML2 dòng {row.RowIndex}] {tenThuoc}: thuốc NGOÀI danh mục thuộc phạm vi thanh toán BHYT — quỹ BHYT không chi trả.",
                    Suggestion = "Chuyển sang phần bệnh nhân tự trả hoặc dùng thuốc trong danh mục BHYT.",
                    XuatToanRisk = true
                });
            }

            // Đơn giá: hợp lệ nếu khớp bất kỳ biệt dược nào cùng mã hoạt chất
            var donGia = row.GetDecimal("DON_GIA");
            var prices = items.Where(i => i.PriceBhyt.HasValue).Select(i => i.PriceBhyt!.Value).ToList();
            if (donGia.HasValue && prices.Count > 0
                && !prices.Any(p => Math.Abs(donGia.Value - p) <= PriceTolerance))
            {
                var priceText = prices.Count == 1
                    ? $"{prices[0]:N0}đ"
                    : $"{prices.Min():N0}–{prices.Max():N0}đ ({prices.Count} biệt dược cùng hoạt chất)";

                issues.Add(new Xml130Issue
                {
                    RuleId = "XML2-CAT004",
                    Severity = ValidationSeverity.Warning,
                    Group = "Drug",
                    Table = "XML2",
                    Field = "DON_GIA",
                    RowIndex = row.RowIndex,
                    Value = donGia.Value.ToString("N0"),
                    Message = $"[XML2 dòng {row.RowIndex}] {tenThuoc}: đơn giá kê khai {donGia:N0}đ không khớp đơn giá nào trong danh mục cơ sở ({priceText}) — giám định sẽ xuất toán phần chênh.",
                    XuatToanRisk = true
                });
            }
        }

        return issues;
    }
}
