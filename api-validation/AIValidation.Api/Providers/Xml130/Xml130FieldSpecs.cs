using System.Text.Json;
using System.Text.Json.Serialization;

namespace AIValidation.Api.Providers.Xml130;

/// <summary>
/// Model đặc tả trường dữ liệu XML 130, load từ Knowledge/Xml130/field_specs.json
/// (sinh từ file Excel "Các rules kiểm tra file xml130.xls" — QĐ 130 + QĐ 4750).
/// </summary>
public class Xml130FieldSpecs
{
    [JsonPropertyName("tables")]
    public List<Xml130TableSpec> Tables { get; set; } = new();
}

public class Xml130TableSpec
{
    [JsonPropertyName("tableId")]
    public required string TableId { get; set; }

    [JsonPropertyName("tableName")]
    public string? TableName { get; set; }

    [JsonPropertyName("fields")]
    public List<Xml130FieldSpec> Fields { get; set; } = new();
}

public class Xml130FieldSpec
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>"string" | "number" | "date".</summary>
    [JsonPropertyName("dataType")]
    public string DataType { get; set; } = "string";

    [JsonPropertyName("maxLength")]
    public int? MaxLength { get; set; }

    [JsonPropertyName("required")]
    public bool Required { get; set; }

    /// <summary>"yyyyMMdd" | "yyyyMMddHHmm" | null.</summary>
    [JsonPropertyName("format")]
    public string? Format { get; set; }

    [JsonPropertyName("allowedValues")]
    public List<string>? AllowedValues { get; set; }

    [JsonPropertyName("valueLabels")]
    public Dictionary<string, string>? ValueLabels { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>Nguồn của diễn giải: "QĐ130" | "QĐ4750" | "Điều chỉnh 2024".</summary>
    [JsonPropertyName("sourceNote")]
    public string? SourceNote { get; set; }
}

/// <summary>
/// Loader đọc field_specs.json từ thư mục Knowledge (cache in-memory, thread-safe).
/// </summary>
public interface IXml130SpecProvider
{
    /// <summary>Lấy đặc tả các bảng XML 130 (load lần đầu, cache các lần sau).</summary>
    Task<Xml130FieldSpecs> GetSpecsAsync(CancellationToken cancellationToken = default);

    /// <summary>Xóa cache — lần lấy sau sẽ nạp lại từ file (dùng sau khi import bản mới).</summary>
    void Invalidate();

    /// <summary>
    /// Ghi bản đặc tả mới đè lên bản override (thư mục Storage bền trên PVC) rồi làm mới
    /// cache. Bản baseline trong image (Knowledge/Xml130) không bị đụng tới — vẫn là bản
    /// gốc để so sánh/khôi phục.
    /// </summary>
    Task SaveAsync(Xml130FieldSpecs specs, CancellationToken cancellationToken = default);

    /// <summary>true nếu đang dùng bản đặc tả đã import (override) thay cho bản gốc trong image.</summary>
    bool HasOverride { get; }
}

/// <inheritdoc />
public class Xml130SpecProvider : IXml130SpecProvider
{
    // Bản gốc đóng gói trong image (chỉ đọc). Bản override do người dùng import lưu trên
    // PVC Storage để bền qua restart/rollout — GIỐNG cách llm-settings.json được lưu.
    private readonly string _baselinePath;
    private readonly string _overridePath;
    private readonly ILogger<Xml130SpecProvider> _logger;
    private Xml130FieldSpecs? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public Xml130SpecProvider(IWebHostEnvironment env, ILogger<Xml130SpecProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _baselinePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Knowledge", "Xml130", "field_specs.json");
        _overridePath = Path.Combine(env.ContentRootPath, "Storage", "field_specs.json");
    }

    public bool HasOverride => File.Exists(_overridePath);

    /// <summary>File đang có hiệu lực: ưu tiên bản import (override) rồi mới tới bản gốc.</summary>
    private string ActivePath => File.Exists(_overridePath) ? _overridePath : _baselinePath;

    public async Task<Xml130FieldSpecs> GetSpecsAsync(CancellationToken cancellationToken = default)
    {
        if (_cache != null)
        {
            return _cache;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cache != null)
            {
                return _cache;
            }

            var path = ActivePath;
            if (!File.Exists(path))
            {
                _logger.LogWarning("Không tìm thấy field_specs.json tại {Path} — bỏ qua kiểm tra theo đặc tả trường", path);
                _cache = new Xml130FieldSpecs();
                return _cache;
            }

            await using var stream = File.OpenRead(path);
            _cache = await JsonSerializer.DeserializeAsync<Xml130FieldSpecs>(stream, cancellationToken: cancellationToken)
                     ?? new Xml130FieldSpecs();

            _logger.LogInformation(
                "Đã load field_specs.json ({Source}): {TableCount} bảng, {FieldCount} trường",
                path == _overridePath ? "bản import" : "bản gốc",
                _cache.Tables.Count, _cache.Tables.Sum(t => t.Fields.Count));

            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Invalidate() => _cache = null;

    public async Task SaveAsync(Xml130FieldSpecs specs, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(specs);

        await _lock.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_overridePath)!);
            await using (var stream = File.Create(_overridePath))
            {
                await JsonSerializer.SerializeAsync(stream, specs, WriteOptions, cancellationToken);
            }

            _cache = specs;
            _logger.LogInformation(
                "Đã lưu đặc tả XML130 mới vào {Path}: {TableCount} bảng, {FieldCount} trường",
                _overridePath, specs.Tables.Count, specs.Tables.Sum(t => t.Fields.Count));
        }
        finally
        {
            _lock.Release();
        }
    }
}
