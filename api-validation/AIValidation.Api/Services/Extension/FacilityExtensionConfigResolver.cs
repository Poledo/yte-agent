using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AIValidation.Api.Configuration;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Services.Licensing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AIValidation.Api.Services.Extension;

/// <summary>
/// Cấu hình robot có hiệu lực cho một cơ sở, kèm nguồn gốc để màn hình quản trị nói
/// rõ "đang thừa hưởng của ai" thay vì để người dùng đoán vì sao sửa xong không đổi.
/// </summary>
/// <param name="State">Cấu hình đã chuẩn hóa.</param>
/// <param name="ETag">Dấu vân tay nội dung — extension gửi lại qua If-None-Match.</param>
/// <param name="SourceFacilityId">Cơ sở sở hữu cấu hình đang dùng; null = cấu hình chung.</param>
/// <param name="SourceFacilityCode">Mã cơ sở nguồn (null nếu dùng cấu hình chung).</param>
/// <param name="SourceFacilityName">Tên cơ sở nguồn (null nếu dùng cấu hình chung).</param>
/// <param name="IsOwn">Cấu hình này do chính cơ sở được hỏi đặt (không phải thừa hưởng).</param>
public sealed record EffectiveExtensionConfig(
    ExtensionConfigState State,
    string ETag,
    long? SourceFacilityId,
    string? SourceFacilityCode,
    string? SourceFacilityName,
    bool IsOwn);

public interface IFacilityExtensionConfigResolver
{
    /// <summary>
    /// Cấu hình robot hiệu lực cho một cơ sở: cấu hình riêng của nó, không có thì lần
    /// ngược lên cây cha, hết cây thì rơi về cấu hình chung. facilityId null = cấu hình chung.
    /// </summary>
    Task<EffectiveExtensionConfig> ResolveAsync(long? facilityId, CancellationToken ct = default);

    /// <summary>Như trên nhưng bắt đầu từ khóa bản quyền extension gửi lên.</summary>
    Task<EffectiveExtensionConfig> ResolveByLicenseKeyAsync(string? licenseKey, CancellationToken ct = default);

    /// <summary>Cấu hình RIÊNG của một cơ sở (null nếu cơ sở đó không tự đặt).</summary>
    Task<ExtensionConfigState?> GetOwnAsync(long facilityId, CancellationToken ct = default);

    /// <summary>Ghi đè cấu hình riêng cho một cơ sở. Trả về bản đã chuẩn hóa.</summary>
    Task<ExtensionConfigState> SaveAsync(
        long facilityId, ExtensionConfigState state, string? updatedBy, CancellationToken ct = default);

    /// <summary>Bỏ cấu hình riêng để cơ sở quay lại thừa hưởng cấp trên. False nếu vốn không có.</summary>
    Task<bool> ClearAsync(long facilityId, CancellationToken ct = default);
}

/// <inheritdoc />
public sealed class FacilityExtensionConfigResolver : IFacilityExtensionConfigResolver
{
    /// <summary>
    /// Cache ngắn: mỗi lần mở một trang HIS là một lần hỏi cấu hình, không cache thì
    /// mỗi tab mở ra là một truy vấn. Nửa phút đủ để đổi diện mạo xong là thấy gần như ngay.
    /// </summary>
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

    private const string CachePrefix = "facility-ext-config:";

    /// <summary>
    /// Thế hệ cache: sửa cấu hình của cha phải làm mới cả nhánh con đang thừa hưởng,
    /// mà IMemoryCache không xóa được theo tiền tố — tăng số này là mọi khóa cũ thành
    /// không tra tới được.
    /// </summary>
    private static long _generation;

    private readonly AppDbContext _db;
    private readonly IExtensionConfigStore _globalStore;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly ILicenseResolver _licenseResolver;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FacilityExtensionConfigResolver> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public FacilityExtensionConfigResolver(
        AppDbContext db,
        IExtensionConfigStore globalStore,
        IFacilityTreeProvider facilityTree,
        ILicenseResolver licenseResolver,
        IMemoryCache cache,
        ILogger<FacilityExtensionConfigResolver> logger)
    {
        _db = db;
        _globalStore = globalStore;
        _facilityTree = facilityTree;
        _licenseResolver = licenseResolver;
        _cache = cache;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<EffectiveExtensionConfig> ResolveByLicenseKeyAsync(
        string? licenseKey, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(licenseKey))
        {
            return await ResolveAsync(null, ct);
        }

        var resolution = await _licenseResolver.ResolveAsync(licenseKey, ct);

        // Khóa sai/hết hạn KHÔNG chặn: đây chỉ là cấu hình diện mạo, chặn ở đây là làm
        // robot biến mất khỏi màn hình HIS vì một lý do chẳng liên quan gì tới nó.
        // Chuyện thu tiền và chặn dịch vụ do cổng giấy phép ở các endpoint nghiệp vụ lo.
        if (!resolution.IsValid)
        {
            return await ResolveAsync(null, ct);
        }

        return await ResolveAsync(resolution.License!.FacilityId, ct);
    }

    /// <inheritdoc />
    public async Task<EffectiveExtensionConfig> ResolveAsync(long? facilityId, CancellationToken ct = default)
    {
        var key = $"{CachePrefix}{Interlocked.Read(ref _generation)}:{facilityId?.ToString() ?? "global"}";
        if (_cache.TryGetValue(key, out EffectiveExtensionConfig? cached) && cached != null)
        {
            return cached;
        }

        var effective = await ResolveUncachedAsync(facilityId, ct);
        _cache.Set(key, effective, CacheDuration);
        return effective;
    }

    private async Task<EffectiveExtensionConfig> ResolveUncachedAsync(long? facilityId, CancellationToken ct)
    {
        if (!facilityId.HasValue)
        {
            return BuildGlobal();
        }

        // Chuỗi đi LÊN: [chính nó, cha, ông...]. Sở Y tế đặt một bộ diện mạo là cả nhánh
        // dùng chung, cơ sở nào muốn khác thì tự ghi đè mà không ảnh hưởng ai.
        var chain = await _facilityTree.GetAncestorChainIdsAsync(facilityId.Value, ct);
        if (chain.Count == 0)
        {
            // Cơ sở chưa khai trong cây đơn vị: vẫn phải tra cấu hình riêng của chính nó
            chain = new[] { facilityId.Value };
        }

        var chainArray = chain.ToArray();
        var rows = await _db.FacilityExtensionConfigs
            .AsNoTracking()
            .Where(c => chainArray.Contains(c.FacilityId))
            .ToListAsync(ct);

        if (rows.Count == 0)
        {
            return BuildGlobal();
        }

        // Thứ tự ưu tiên là thứ tự CHUỖI CÂY, không phải thứ tự CSDL trả về: gần mình
        // nhất thắng. Sắp theo Id hay UpdatedAt là để cấu hình của ông nội đè lên của cha.
        var byId = rows.ToDictionary(r => r.FacilityId);
        foreach (var id in chain)
        {
            if (!byId.TryGetValue(id, out var row))
            {
                continue;
            }

            var state = Deserialize(row);
            if (state == null)
            {
                continue;
            }

            var facility = await _facilityTree.FindByIdAsync(id, ct);
            return new EffectiveExtensionConfig(
                State: state,
                ETag: ComputeETag(state),
                SourceFacilityId: id,
                SourceFacilityCode: facility?.Code,
                SourceFacilityName: facility?.Name,
                IsOwn: id == facilityId.Value);
        }

        return BuildGlobal();
    }

    /// <inheritdoc />
    public async Task<ExtensionConfigState?> GetOwnAsync(long facilityId, CancellationToken ct = default)
    {
        var row = await _db.FacilityExtensionConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.FacilityId == facilityId, ct);

        return row == null ? null : Deserialize(row);
    }

    /// <inheritdoc />
    public async Task<ExtensionConfigState> SaveAsync(
        long facilityId, ExtensionConfigState state, string? updatedBy, CancellationToken ct = default)
    {
        // Chuẩn hóa bằng đúng bộ luật của cấu hình chung: màu hex sai, cỡ ngoài khoảng,
        // logo quá to đều bị nắn ở đây chứ không để extension tự xoay xở.
        var normalized = ExtensionConfigService.Normalize(state);
        var json = JsonSerializer.Serialize(normalized);

        var row = await _db.FacilityExtensionConfigs
            .FirstOrDefaultAsync(c => c.FacilityId == facilityId, ct);

        if (row == null)
        {
            row = new FacilityExtensionConfig { FacilityId = facilityId };
            _db.FacilityExtensionConfigs.Add(row);
        }

        row.ConfigJson = json;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = updatedBy;

        await _db.SaveChangesAsync(ct);
        Invalidate();

        return normalized;
    }

    /// <inheritdoc />
    public async Task<bool> ClearAsync(long facilityId, CancellationToken ct = default)
    {
        var row = await _db.FacilityExtensionConfigs
            .FirstOrDefaultAsync(c => c.FacilityId == facilityId, ct);

        if (row == null)
        {
            return false;
        }

        _db.FacilityExtensionConfigs.Remove(row);
        await _db.SaveChangesAsync(ct);
        Invalidate();
        return true;
    }

    /// <summary>Làm mới toàn bộ cache — sửa cấu hình của cha ảnh hưởng cả nhánh con.</summary>
    private static void Invalidate() => Interlocked.Increment(ref _generation);

    private EffectiveExtensionConfig BuildGlobal()
    {
        var state = _globalStore.Current;
        return new EffectiveExtensionConfig(state, ComputeETag(state), null, null, null, false);
    }

    private ExtensionConfigState? Deserialize(FacilityExtensionConfig row)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<ExtensionConfigState>(row.ConfigJson, JsonOptions);
            return parsed == null ? null : ExtensionConfigService.Normalize(parsed);
        }
        catch (JsonException ex)
        {
            // Bỏ qua dòng hỏng và đi tiếp lên cây: robot vẫn phải hiện, chỉ là hiện
            // diện mạo của tuyến trên thay vì tắt ngóm vì một chuỗi JSON lỗi.
            _logger.LogWarning(ex,
                "Cấu hình robot của cơ sở {FacilityId} không đọc được — bỏ qua, dùng cấu hình tuyến trên",
                row.FacilityId);
            return null;
        }
    }

    /// <summary>
    /// ETag tính từ NỘI DUNG hiệu lực chứ không từ UpdatedAt của một dòng: cấu hình mà
    /// extension nhận được là kết quả của cả chuỗi thừa hưởng, nên chỉ có nội dung cuối
    /// cùng mới nói đúng "có gì đổi so với bản bạn đang giữ không".
    /// </summary>
    private static string ComputeETag(ExtensionConfigState state)
    {
        var json = JsonSerializer.Serialize(state);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(json));
        return $"\"{Convert.ToHexString(hash, 0, 8).ToLowerInvariant()}\"";
    }
}
