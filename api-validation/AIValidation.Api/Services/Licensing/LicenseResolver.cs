using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Licensing;
using AIValidation.Api.Providers.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AIValidation.Api.Services.Licensing;

/// <summary>Vì sao một khóa bị từ chối — quyết định thông báo trả về người dùng.</summary>
public enum LicenseStatus
{
    /// <summary>Khóa hợp lệ, còn hiệu lực.</summary>
    Valid,

    /// <summary>Request không gửi khóa nào.</summary>
    Missing,

    /// <summary>Khóa không có trong hệ thống (gõ sai, hoặc khóa bịa).</summary>
    NotFound,

    /// <summary>Khóa có thật nhưng đã bị thu hồi, tạm ngừng, hoặc hết hạn hợp đồng.</summary>
    Expired,
}

/// <summary>Kết quả phân giải một khóa bản quyền.</summary>
/// <param name="Status">Trạng thái khóa.</param>
/// <param name="License">Giấy phép tương ứng (null khi khóa không hợp lệ).</param>
public sealed record LicenseResolution(LicenseStatus Status, FacilityLicense? License)
{
    /// <summary>Khóa dùng được.</summary>
    public bool IsValid => Status == LicenseStatus.Valid && License is not null;

    /// <summary>Thông báo tiếng Việt trả về cho người dùng cuối.</summary>
    public string Message => Status switch
    {
        LicenseStatus.Valid => string.Empty,
        LicenseStatus.Missing =>
            "Chưa khai báo khóa bản quyền. Mở phần cài đặt của tiện ích và nhập khóa "
            + "được cấp cho đơn vị.",
        LicenseStatus.NotFound =>
            "Khóa bản quyền không đúng. Kiểm tra lại khóa đã nhập trong phần cài đặt của tiện ích.",
        LicenseStatus.Expired =>
            "Khóa bản quyền đã hết hiệu lực hoặc bị tạm ngừng. Liên hệ đơn vị cung cấp dịch vụ.",
        _ => "Khóa bản quyền không dùng được.",
    };
}

/// <summary>
/// Phân giải khóa bản quyền thành giấy phép, và trả lời câu hỏi "giấy phép này có
/// phủ cơ sở KCB kia không".
///
/// Đây là chỗ duy nhất được phép quyết định chủ thể trả tiền. Mã MACSKCB trong file
/// XML 130 do người gửi TỰ KHAI nên tuyệt đối không dùng để tính tiền — chỉ dùng để
/// đối chiếu xem có nằm trong phạm vi giấy phép hay không.
/// </summary>
public interface ILicenseResolver
{
    /// <summary>Tra giấy phép từ khóa client gửi lên (header X-License-Key).</summary>
    Task<LicenseResolution> ResolveAsync(string? key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Giấy phép có phủ cơ sở KCB <paramref name="facilityCode"/> hay không:
    /// đúng đơn vị đứng tên, hoặc là đơn vị cấp dưới trong cây khi hợp đồng bật
    /// <see cref="FacilityLicense.CoversSubtree"/>.
    /// </summary>
    Task<bool> CoversFacilityAsync(
        FacilityLicense license, string? facilityCode, CancellationToken cancellationToken = default);

    /// <summary>Ghi nhận khóa vừa được dùng (cập nhật LastUsedAt, gộp theo phút để đỡ ghi DB).</summary>
    Task TouchAsync(long licenseId, CancellationToken cancellationToken = default);

    /// <summary>Xóa cache giấy phép — gọi sau khi cấp/sửa/thu hồi.</summary>
    void Invalidate();
}

/// <inheritdoc />
public sealed class LicenseResolver : ILicenseResolver
{
    /// <summary>
    /// Cache ngắn: mỗi hồ sơ kiểm tra là một request nên không thể tra DB mỗi lần,
    /// nhưng thu hồi khóa cũng phải có hiệu lực gần như tức thì. Một phút là mức
    /// cân bằng — thu hồi xong chậm nhất một phút là chặn được.
    /// </summary>
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(1);

    /// <summary>Chỉ ghi LastUsedAt tối đa mỗi 5 phút một lần cho mỗi giấy phép.</summary>
    private static readonly TimeSpan TouchInterval = TimeSpan.FromMinutes(5);

    private const string CachePrefix = "license:";
    private const string TouchPrefix = "license-touch:";

    /// <summary>
    /// Số thế hệ cache, nhét vào khóa cache. Tăng số này là toàn bộ mục cũ thành
    /// không tra tới được — cách duy nhất để xóa theo tiền tố với IMemoryCache.
    ///
    /// Tĩnh vì cache là của cả tiến trình. Lưu ý: chạy nhiều pod thì mỗi pod có
    /// cache riêng, gọi thu hồi chỉ làm mới pod nhận request đó — các pod còn lại
    /// chờ hết hạn tự nhiên (tối đa <see cref="CacheDuration"/>).
    /// </summary>
    private static long _generation;

    private readonly AppDbContext _db;
    private readonly ILicenseKeyGenerator _keyGenerator;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LicenseResolver> _logger;

    public LicenseResolver(
        AppDbContext db,
        ILicenseKeyGenerator keyGenerator,
        IFacilityTreeProvider facilityTree,
        IMemoryCache cache,
        ILogger<LicenseResolver> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _keyGenerator = keyGenerator ?? throw new ArgumentNullException(nameof(keyGenerator));
        _facilityTree = facilityTree ?? throw new ArgumentNullException(nameof(facilityTree));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<LicenseResolution> ResolveAsync(
        string? key, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return new LicenseResolution(LicenseStatus.Missing, null);
        }

        var hash = _keyGenerator.Hash(key);

        // Cache theo BĂM khóa, không bao giờ theo khóa gốc — tránh khóa thật nằm
        // trong bộ nhớ tiến trình dài hơn mức cần thiết.
        var cacheKey = $"{CachePrefix}{Interlocked.Read(ref _generation)}:{hash}";
        if (!_cache.TryGetValue<FacilityLicense?>(cacheKey, out var license))
        {
            license = await _db.FacilityLicenses
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.KeyHash == hash, cancellationToken);

            // Cache cả kết quả "không có" để một khóa bịa gửi liên tục không thành
            // đường tra DB miễn phí.
            _cache.Set(cacheKey, license, CacheDuration);
        }

        if (license is null)
        {
            return new LicenseResolution(LicenseStatus.NotFound, null);
        }

        return license.IsUsableAt(DateTime.UtcNow)
            ? new LicenseResolution(LicenseStatus.Valid, license)
            : new LicenseResolution(LicenseStatus.Expired, license);
    }

    public async Task<bool> CoversFacilityAsync(
        FacilityLicense license, string? facilityCode, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(license);

        // Hồ sơ không khai mã cơ sở → không có gì để mâu thuẫn, tính cho đơn vị đứng tên
        if (string.IsNullOrWhiteSpace(facilityCode))
        {
            return true;
        }

        var code = facilityCode.Trim();
        if (string.Equals(code, license.FacilityCode, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!license.CoversSubtree)
        {
            return false;
        }

        // Đi ngược từ đơn vị phát sinh lên gốc; gặp đơn vị đứng tên hợp đồng là được phủ.
        // Dùng GetAncestorChainAsync chứ KHÔNG dùng GetCatalogChainAsync — xem chú thích
        // ở IFacilityTreeProvider về việc tách kế thừa danh mục khỏi phạm vi thương mại.
        var ancestors = await _facilityTree.GetAncestorChainAsync(code, cancellationToken);
        return ancestors.Any(a => string.Equals(a, license.FacilityCode, StringComparison.OrdinalIgnoreCase));
    }

    public async Task TouchAsync(long licenseId, CancellationToken cancellationToken = default)
    {
        var touchKey = TouchPrefix + licenseId;
        if (_cache.TryGetValue(touchKey, out _))
        {
            return;
        }
        _cache.Set(touchKey, true, TouchInterval);

        try
        {
            await _db.FacilityLicenses
                .Where(l => l.Id == licenseId)
                .ExecuteUpdateAsync(s => s.SetProperty(l => l.LastUsedAt, DateTime.UtcNow), cancellationToken);
        }
        catch (Exception ex)
        {
            // Chỉ là dấu vết "khóa còn sống" — hỏng thì thôi, không ảnh hưởng nghiệp vụ.
            _logger.LogWarning(ex, "Không cập nhật được LastUsedAt cho giấy phép {LicenseId}", licenseId);
        }
    }

    public void Invalidate()
    {
        // Tăng thế hệ → mọi mục cache cũ không còn tra tới được, mục mới nạp lại từ DB.
        // Mục cũ tự rụng khi hết hạn nên không rò rỉ bộ nhớ.
        var generation = Interlocked.Increment(ref _generation);
        _logger.LogDebug("Làm mới cache giấy phép, thế hệ {Generation}", generation);
    }
}
