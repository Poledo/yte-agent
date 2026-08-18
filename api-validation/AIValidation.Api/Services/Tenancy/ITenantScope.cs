using AIValidation.Api.Providers.Catalog;

namespace AIValidation.Api.Services.Tenancy;

/// <summary>
/// Phạm vi dữ liệu mà người đang gọi được thấy, quy về một câu hỏi duy nhất:
/// "những cơ sở KCB nào?".
///
/// Hai loại phạm vi:
/// <list type="bullet">
/// <item>PHẠM VI HỆ THỐNG — quản trị toàn hệ thống hoặc tài khoản không gắn cơ sở nào:
/// thấy hết, không lọc.</item>
/// <item>PHẠM VI CƠ SỞ — thấy cơ sở của mình và TOÀN BỘ nhánh cấp dưới.</item>
/// </list>
///
/// Cố ý KHÔNG dùng global query filter của EF: phạm vi phải tra cây đơn vị (bất đồng bộ)
/// và quản trị hệ thống phải tắt được nó. EF làm hai việc đó rất vụng, kết cục là
/// <c>IgnoreQueryFilters()</c> rải khắp nơi — mỗi chỗ quên một cái là một lỗ rò dữ liệu
/// im lặng. Lọc tường minh ở từng truy vấn thì đọc code là thấy ngay có lọc hay không.
/// </summary>
public interface ITenantScope
{
    /// <summary>Thấy toàn hệ thống, không lọc theo cơ sở.</summary>
    bool IsSystemScope { get; }

    /// <summary>Cơ sở gốc của tài khoản; null khi <see cref="IsSystemScope"/>.</summary>
    long? FacilityId { get; }

    /// <summary>Người gọi đã đăng nhập chưa (extension gọi bằng khóa bản quyền thì chưa).</summary>
    bool IsAuthenticated { get; }

    /// <summary>Bộ lọc đã phân giải sẵn cho một request — tra cây một lần rồi dùng lại.</summary>
    Task<TenantFilter> GetFilterAsync(CancellationToken cancellationToken = default);

    /// <summary>Được phép đọc/ghi dữ liệu của cơ sở này không.</summary>
    Task<bool> CanAccessAsync(long facilityId, CancellationToken cancellationToken = default);

    /// <summary>Như <see cref="CanAccessAsync(long, CancellationToken)"/> nhưng theo mã cơ sở.</summary>
    Task<bool> CanAccessAsync(string facilityCode, CancellationToken cancellationToken = default);
}

/// <summary>
/// Danh sách cơ sở được thấy, ở dạng EF dịch được sang SQL.
///
/// Dùng mảng chứ không dùng <see cref="ISet{T}"/>: Npgsql dịch
/// <c>array.Contains(cột)</c> thành <c>= ANY(@p)</c> — một tham số, một lần quét chỉ mục.
/// Kiểu tập hợp qua giao diện thì EF hay bỏ cuộc và kéo cả bảng về lọc trong bộ nhớ.
/// </summary>
public sealed class TenantFilter
{
    private readonly HashSet<long> _idLookup;
    private readonly HashSet<string> _codeLookup;

    public TenantFilter(bool isSystemScope, IReadOnlySet<long> facilityIds, IReadOnlySet<string> facilityCodes)
    {
        IsSystemScope = isSystemScope;
        Ids = facilityIds.ToArray();
        Codes = facilityCodes.ToArray();
        _idLookup = new HashSet<long>(facilityIds);
        _codeLookup = new HashSet<string>(facilityCodes, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>Thấy hết — mọi mệnh đề lọc bên dưới phải được bỏ qua.</summary>
    public bool IsSystemScope { get; }

    /// <summary>Id cơ sở được thấy (chính nó + nhánh dưới). Rỗng khi <see cref="IsSystemScope"/>.</summary>
    public long[] Ids { get; }

    /// <summary>Mã cơ sở tương ứng <see cref="Ids"/> — bảng danh mục HIS lọc theo mã.</summary>
    public string[] Codes { get; }

    /// <summary>Kiểm một Id đơn lẻ (dùng khi nhận dữ liệu ghi từ client).</summary>
    public bool Allows(long? facilityId) =>
        IsSystemScope || (facilityId.HasValue && _idLookup.Contains(facilityId.Value));

    /// <summary>Kiểm một mã đơn lẻ.</summary>
    public bool Allows(string? facilityCode) =>
        IsSystemScope || (!string.IsNullOrWhiteSpace(facilityCode) && _codeLookup.Contains(facilityCode.Trim()));

    /// <summary>Phạm vi hệ thống: không lọc gì cả.</summary>
    public static TenantFilter System { get; } = new(
        true,
        new HashSet<long>(),
        new HashSet<string>(StringComparer.OrdinalIgnoreCase));
}

/// <inheritdoc />
public sealed class TenantScope : ITenantScope
{
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private TenantFilter? _cachedFilter;

    public TenantScope(IFacilityTreeProvider facilityTree, IHttpContextAccessor httpContextAccessor)
    {
        _facilityTree = facilityTree;
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated == true;

    public long? FacilityId
    {
        get
        {
            var raw = _httpContextAccessor.HttpContext?.User
                .FindFirst(Authorization.Dynamic.RbacClaimTypes.FacilityId)?.Value;

            return long.TryParse(raw, System.Globalization.NumberStyles.Integer,
                System.Globalization.CultureInfo.InvariantCulture, out var id)
                ? id
                : null;
        }
    }

    public bool IsSystemScope
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;

            // Chưa đăng nhập KHÔNG phải phạm vi hệ thống. Đây là mặc định an toàn cho
            // các endpoint [AllowAnonymous] có lỡ hỏi tới phạm vi: không có danh tính
            // thì không thấy gì, chứ không phải thấy tất.
            if (user?.Identity?.IsAuthenticated != true)
            {
                return false;
            }

            if (string.Equals(
                    user.FindFirst(Authorization.Dynamic.RbacClaimTypes.IsSuperAdmin)?.Value,
                    "true",
                    StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Tài khoản không gắn cơ sở nào = tài khoản cấp hệ thống.
            return !FacilityId.HasValue;
        }
    }

    public async Task<TenantFilter> GetFilterAsync(CancellationToken cancellationToken = default)
    {
        if (_cachedFilter != null)
        {
            return _cachedFilter;
        }

        if (IsSystemScope)
        {
            return _cachedFilter = TenantFilter.System;
        }

        var facilityId = FacilityId;
        if (!facilityId.HasValue)
        {
            // Chưa đăng nhập: phạm vi rỗng — mọi truy vấn có lọc sẽ trả về 0 dòng.
            return _cachedFilter = new TenantFilter(
                false,
                new HashSet<long>(),
                new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        }

        var ids = await _facilityTree.GetDescendantIdsAsync(facilityId.Value, cancellationToken);
        var codes = await _facilityTree.GetDescendantCodesAsync(facilityId.Value, cancellationToken);

        return _cachedFilter = new TenantFilter(false, ids, codes);
    }

    public async Task<bool> CanAccessAsync(long facilityId, CancellationToken cancellationToken = default)
    {
        var filter = await GetFilterAsync(cancellationToken);
        return filter.Allows(facilityId);
    }

    public async Task<bool> CanAccessAsync(string facilityCode, CancellationToken cancellationToken = default)
    {
        var filter = await GetFilterAsync(cancellationToken);
        return filter.Allows(facilityCode);
    }
}
