using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services.Licensing;

namespace AIValidation.Api.Services.Tenancy;

/// <summary>
/// Những cơ sở KCB mà kho tri thức của request hiện tại được phép TRA RA.
///
/// Cố ý đi NGƯỢC chiều với <see cref="ITenantScope"/>:
/// <list type="bullet">
/// <item><see cref="ITenantScope"/> trả nhánh ĐI XUỐNG — "tôi quản lý dữ liệu của ai".</item>
/// <item>Ở đây là chuỗi ĐI LÊN — "văn bản của ai áp dụng cho tôi". Sở Y tế nạp một
/// công văn thì cả nhánh bệnh viện bên dưới phải tra ra, đúng như cách danh mục HIS
/// kế thừa theo chuỗi cha (<see cref="IFacilityTreeProvider.GetAncestorChainAsync"/>).</item>
/// </list>
///
/// Văn bản có <c>FacilityId = null</c> là văn bản DÙNG CHUNG (thông tư, nghị định)
/// — mọi cơ sở đều tra ra, không nằm trong danh sách này.
/// </summary>
public interface IKnowledgeScope
{
    /// <summary>
    /// Id các cơ sở có văn bản riêng áp dụng cho người gọi.
    /// <c>null</c> = KHÔNG lọc (quản trị hệ thống, hoặc request không có danh tính cơ sở nào).
    /// </summary>
    Task<long[]?> ApplicableFacilityIdsAsync(CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public sealed class KnowledgeScope : IKnowledgeScope
{
    private readonly ILicenseContext _license;
    private readonly ITenantScope _tenant;
    private readonly IFacilityTreeProvider _facilityTree;
    private long[]? _cached;
    private bool _resolved;

    public KnowledgeScope(
        ILicenseContext license,
        ITenantScope tenant,
        IFacilityTreeProvider facilityTree)
    {
        _license = license;
        _tenant = tenant;
        _facilityTree = facilityTree;
    }

    public async Task<long[]?> ApplicableFacilityIdsAsync(CancellationToken cancellationToken = default)
    {
        if (_resolved)
        {
            return _cached;
        }

        _resolved = true;

        // Ưu tiên khóa bản quyền: extension hỏi trợ lý thì đó là danh tính DUY NHẤT
        // của cơ sở — chưa có phiên đăng nhập nào cả.
        var facilityId = _license.License?.FacilityId ?? _tenant.FacilityId;

        // Không khóa, không claim cơ sở (quản trị hệ thống, hoặc chế độ cấp phép Off
        // mà client chưa nhập khóa): giữ nguyên hành vi cũ — tra toàn kho. Siết ở đây
        // sẽ làm trợ lý im lặng ngay khi ai đó quên nhập khóa, mà lỗi đó nhìn hệt như
        // "AI không biết trả lời".
        if (!facilityId.HasValue)
        {
            return _cached = null;
        }

        var chain = await _facilityTree.GetAncestorChainIdsAsync(facilityId.Value, cancellationToken);
        return _cached = chain.ToArray();
    }
}
