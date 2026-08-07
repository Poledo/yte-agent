using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Providers.Catalog;

/// <summary>
/// Tra cứu danh mục phục vụ rule kiểm tra hồ sơ XML 130.
///
/// Danh mục gắn với từng cơ sở KCB: chỉ đối chiếu hồ sơ của cơ sở nào khi
/// đã nạp danh mục của chính cơ sở đó — tránh báo sai hàng loạt khi hồ sơ
/// thuộc cơ sở chưa có danh mục trong hệ thống.
///
/// KẾ THỪA THEO CÂY ĐƠN VỊ: cơ sở tuyến dưới (trạm y tế xã) thường không tự nạp
/// danh mục mà dùng chung danh mục do tuyến trên ban hành. Nên với mỗi LOẠI danh mục,
/// hệ thống ưu tiên danh mục của CHÍNH cơ sở đó; chưa có thì mượn của đơn vị cha,
/// rồi ông (xem <see cref="IFacilityTreeProvider"/>). Xét theo từng loại nên một cơ sở
/// có thể dùng danh mục thuốc của riêng mình mà vẫn mượn danh mục nhân viên của cha.
/// </summary>
public interface ICatalogLookupProvider
{
    /// <summary>True nếu đã có danh mục thuộc loại này cho cơ sở KCB (kể cả mượn của đơn vị cha).</summary>
    Task<bool> HasCatalogAsync(string catalogType, string facilityCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tìm MỌI mục có cùng mã DMDC trong một loại danh mục của cơ sở.
    /// Trả về danh sách vì một mã hoạt chất ứng với nhiều biệt dược khác giá
    /// (vd 40.807: Metformin 500 giá 680đ, Metformin Denk giá 600đ).
    /// </summary>
    Task<List<CatalogItem>> FindByCodeAsync(
        string catalogType, string facilityCode, string code, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tìm mã dịch vụ trong tất cả danh mục dịch vụ (DVKT, CĐHA, xét nghiệm, giường)
    /// của một cơ sở — dùng cho XML3 vì một mã có thể nằm ở bất kỳ danh mục nào,
    /// và một mã dịch vụ kỹ thuật cũng có thể ứng với nhiều dòng khác giá.
    /// </summary>
    Task<List<CatalogItem>> FindServiceByCodeAsync(
        string facilityCode, string code, CancellationToken cancellationToken = default);

    /// <summary>True nếu cơ sở có ít nhất một danh mục dịch vụ bất kỳ.</summary>
    Task<bool> HasAnyServiceCatalogAsync(string facilityCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy toàn bộ mục có mã của một loại danh mục thuộc cơ sở.
    /// Dùng khi rule cần so khớp có chuẩn hóa (vd số CCHN có/không có số 0 ở đầu)
    /// nên không so bằng truy vấn khớp tuyệt đối được. Chỉ dùng cho danh mục nhỏ.
    /// </summary>
    Task<List<CatalogItem>> GetAllWithCodeAsync(
        string catalogType, string facilityCode, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class CatalogLookupProvider : ICatalogLookupProvider
{
    /// <summary>Các loại danh mục chứa mã dịch vụ kỹ thuật xuất hiện ở bảng XML3.</summary>
    public static readonly string[] ServiceCatalogTypes =
    {
        "MedicalService", "Imaging", "LabTest", "BedType"
    };

    private readonly AppDbContext _db;
    private readonly IFacilityTreeProvider _facilityTree;

    public CatalogLookupProvider(AppDbContext db, IFacilityTreeProvider facilityTree)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _facilityTree = facilityTree ?? throw new ArgumentNullException(nameof(facilityTree));
    }

    public async Task<bool> HasCatalogAsync(
        string catalogType, string facilityCode, CancellationToken cancellationToken = default)
    {
        var effective = await ResolveEffectiveAsync(
            facilityCode, new[] { catalogType }, cancellationToken);
        return effective.Count > 0;
    }

    public async Task<List<CatalogItem>> FindByCodeAsync(
        string catalogType, string facilityCode, string code, CancellationToken cancellationToken = default)
    {
        var effective = await ResolveEffectiveAsync(
            facilityCode, new[] { catalogType }, cancellationToken);
        if (!effective.TryGetValue(catalogType, out var owner))
        {
            return new List<CatalogItem>();
        }

        return await _db.CatalogItems
            .Where(i => i.CatalogType == catalogType
                && i.FacilityCode == owner
                && i.Code == code
                && i.Source!.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<CatalogItem>> FindServiceByCodeAsync(
        string facilityCode, string code, CancellationToken cancellationToken = default)
    {
        var effective = await ResolveEffectiveAsync(
            facilityCode, ServiceCatalogTypes, cancellationToken);
        if (effective.Count == 0)
        {
            return new List<CatalogItem>();
        }

        // Mỗi loại danh mục dịch vụ có thể thuộc một đơn vị khác nhau trong chuỗi
        // (vd DVKT của chính cơ sở, giường mượn của cha). Truy vấn một lần theo cả
        // chuỗi rồi giữ lại đúng đơn vị hiệu lực của từng loại — số dòng ứng với một
        // mã dịch vụ rất nhỏ nên lọc trong bộ nhớ rẻ hơn ghép điều kiện tuple trong SQL.
        var owners = effective.Values.Distinct().ToList();
        var candidates = await _db.CatalogItems
            .Where(i => ServiceCatalogTypes.Contains(i.CatalogType)
                && i.FacilityCode != null
                && owners.Contains(i.FacilityCode)
                && i.Code == code
                && i.Source!.IsActive)
            .ToListAsync(cancellationToken);

        return candidates
            .Where(i => effective.TryGetValue(i.CatalogType, out var owner) && owner == i.FacilityCode)
            .ToList();
    }

    public async Task<bool> HasAnyServiceCatalogAsync(
        string facilityCode, CancellationToken cancellationToken = default)
    {
        var effective = await ResolveEffectiveAsync(
            facilityCode, ServiceCatalogTypes, cancellationToken);
        return effective.Count > 0;
    }

    public async Task<List<CatalogItem>> GetAllWithCodeAsync(
        string catalogType, string facilityCode, CancellationToken cancellationToken = default)
    {
        var effective = await ResolveEffectiveAsync(
            facilityCode, new[] { catalogType }, cancellationToken);
        if (!effective.TryGetValue(catalogType, out var owner))
        {
            return new List<CatalogItem>();
        }

        return await _db.CatalogItems
            .Where(i => i.CatalogType == catalogType
                && i.FacilityCode == owner
                && i.Code != null
                && i.Source!.IsActive)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Với mỗi loại danh mục, xác định đơn vị nào thực sự cung cấp danh mục đó cho
    /// cơ sở đang kiểm tra: đơn vị đứng TRƯỚC NHẤT trong chuỗi [chính nó, cha, ông...]
    /// mà có nạp loại danh mục này. Loại nào không đơn vị nào có thì không xuất hiện
    /// trong kết quả — rule sẽ bỏ qua thay vì báo sai hàng loạt.
    /// </summary>
    private async Task<Dictionary<string, string>> ResolveEffectiveAsync(
        string facilityCode, IReadOnlyCollection<string> catalogTypes, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(facilityCode))
        {
            return result;
        }

        var chain = await _facilityTree.GetCatalogChainAsync(facilityCode, cancellationToken);
        if (chain.Count == 0)
        {
            return result;
        }

        var chainList = chain.ToList();
        var types = catalogTypes.ToList();
        var available = await _db.CatalogSources
            .Where(s => s.IsActive
                && types.Contains(s.CatalogType)
                && s.FacilityCode != null
                && chainList.Contains(s.FacilityCode))
            .Select(s => new { s.CatalogType, s.FacilityCode })
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var group in available.GroupBy(a => a.CatalogType, StringComparer.Ordinal))
        {
            // Vị trí trong chuỗi = mức ưu tiên: 0 là chính cơ sở, càng lớn càng xa lên trên
            var nearest = group
                .Select(a => new { a.FacilityCode, Rank = chainList.IndexOf(a.FacilityCode!) })
                .Where(a => a.Rank >= 0)
                .OrderBy(a => a.Rank)
                .FirstOrDefault();

            if (nearest != null)
            {
                result[group.Key] = nearest.FacilityCode!;
            }
        }

        return result;
    }
}
