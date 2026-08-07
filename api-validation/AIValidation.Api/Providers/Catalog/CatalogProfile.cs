using System.Text.Json;
using System.Text.Json.Serialization;

namespace AIValidation.Api.Providers.Catalog;

/// <summary>
/// Profile mô tả cách đọc một loại file danh mục HIS — khai báo bằng JSON
/// (Knowledge/Catalog/catalog_profiles.json) thay vì hardcode trong C#.
///
/// Nhờ vậy khi cơ sở KCB xuất thêm danh mục mới hoặc đổi cấu trúc cột,
/// chỉ cần sửa/bổ sung JSON và khởi động lại API — không phải build lại code.
/// </summary>
public class CatalogProfile
{
    /// <summary>Mã loại danh mục, duy nhất, vd "Drug", "MedicalService".</summary>
    [JsonPropertyName("catalogType")]
    public required string CatalogType { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>Chuỗi con nhận diện trong tên file, vd "dm_duoc_vattu".</summary>
    [JsonPropertyName("fileNamePatterns")]
    public List<string> FileNamePatterns { get; set; } = new();

    /// <summary>Dòng chứa tiêu đề cột (0-based) — một số báo cáo có tiêu đề ở dòng 2.</summary>
    [JsonPropertyName("headerRowIndex")]
    public int HeaderRowIndex { get; set; }

    /// <summary>Cột bắt buộc phải có — dùng xác nhận đúng loại file khi tên file khác.</summary>
    [JsonPropertyName("requiredColumns")]
    public List<string> RequiredColumns { get; set; } = new();

    [JsonPropertyName("facilityColumn")]
    public string? FacilityColumn { get; set; }

    /// <summary>Cột chứa mã DMDC dùng đối chiếu hồ sơ XML 130.</summary>
    [JsonPropertyName("codeColumn")]
    public string? CodeColumn { get; set; }

    [JsonPropertyName("hisCodeColumn")]
    public string? HisCodeColumn { get; set; }

    [JsonPropertyName("nameColumn")]
    public string? NameColumn { get; set; }

    [JsonPropertyName("unitColumn")]
    public string? UnitColumn { get; set; }

    [JsonPropertyName("priceBhytColumn")]
    public string? PriceBhytColumn { get; set; }

    [JsonPropertyName("priceHospitalColumn")]
    public string? PriceHospitalColumn { get; set; }

    [JsonPropertyName("suspendedColumn")]
    public string? SuspendedColumn { get; set; }

    [JsonPropertyName("outsideBhytColumn")]
    public string? OutsideBhytColumn { get; set; }

    [JsonPropertyName("activeColumn")]
    public string? ActiveColumn { get; set; }

    [JsonPropertyName("metadataColumns")]
    public List<string> MetadataColumns { get; set; } = new();

    /// <summary>True nếu danh mục này được dùng để đối chiếu hồ sơ XML 130.</summary>
    [JsonPropertyName("usedForXml130")]
    public bool UsedForXml130 { get; set; }

    [JsonPropertyName("xml130Note")]
    public string? Xml130Note { get; set; }

    /// <summary>True nếu danh mục chứa dữ liệu cá nhân (vd danh sách nhân viên).</summary>
    [JsonPropertyName("containsPersonalData")]
    public bool ContainsPersonalData { get; set; }
}

/// <summary>Gốc file catalog_profiles.json.</summary>
public class CatalogProfileSet
{
    [JsonPropertyName("profiles")]
    public List<CatalogProfile> Profiles { get; set; } = new();
}

/// <summary>
/// Nạp và tra cứu profile danh mục (cache in-memory, thread-safe).
/// </summary>
public interface ICatalogProfileProvider
{
    /// <summary>Toàn bộ profile đã khai báo.</summary>
    Task<IReadOnlyList<CatalogProfile>> GetProfilesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Tìm profile phù hợp với file: ưu tiên khớp tên file, sau đó khớp cột bắt buộc.
    /// Trả null nếu không nhận diện được.
    /// </summary>
    Task<CatalogProfile?> DetectAsync(
        string fileName,
        IReadOnlyCollection<string> columns,
        CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class CatalogProfileProvider : ICatalogProfileProvider
{
    private readonly string _profilePath;
    private readonly ILogger<CatalogProfileProvider> _logger;
    private CatalogProfileSet? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public CatalogProfileProvider(ILogger<CatalogProfileProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _profilePath = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Knowledge", "Catalog", "catalog_profiles.json");
    }

    public async Task<IReadOnlyList<CatalogProfile>> GetProfilesAsync(CancellationToken cancellationToken = default)
    {
        if (_cache != null)
        {
            return _cache.Profiles;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cache != null)
            {
                return _cache.Profiles;
            }

            if (!File.Exists(_profilePath))
            {
                _logger.LogWarning("Không tìm thấy catalog_profiles.json tại {Path}", _profilePath);
                _cache = new CatalogProfileSet();
                return _cache.Profiles;
            }

            await using var stream = File.OpenRead(_profilePath);
            _cache = await JsonSerializer.DeserializeAsync<CatalogProfileSet>(stream, cancellationToken: cancellationToken)
                     ?? new CatalogProfileSet();

            _logger.LogInformation("Đã load catalog_profiles.json: {Count} loại danh mục", _cache.Profiles.Count);
            return _cache.Profiles;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<CatalogProfile?> DetectAsync(
        string fileName,
        IReadOnlyCollection<string> columns,
        CancellationToken cancellationToken = default)
    {
        var profiles = await GetProfilesAsync(cancellationToken);
        var name = Path.GetFileNameWithoutExtension(fileName);

        // Ưu tiên 1: khớp tên file
        var byName = profiles.FirstOrDefault(p =>
            p.FileNamePatterns.Any(pattern => name.Contains(pattern, StringComparison.OrdinalIgnoreCase)));
        if (byName != null)
        {
            return byName;
        }

        // Ưu tiên 2: khớp toàn bộ cột bắt buộc (file đổi tên nhưng cấu trúc giữ nguyên)
        return profiles.FirstOrDefault(p =>
            p.RequiredColumns.Count > 0
            && p.RequiredColumns.All(c => columns.Contains(c, StringComparer.OrdinalIgnoreCase)));
    }
}
