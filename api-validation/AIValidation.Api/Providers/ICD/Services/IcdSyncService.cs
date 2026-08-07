using System.Text.Json;
using AIValidation.Api.Providers.ICD.Helpers;

namespace AIValidation.Api.Providers.ICD.Services;

/// <summary>
/// Trạng thái so sánh phiên bản dữ liệu ICD local với nguồn công bố.
/// </summary>
public record IcdSyncStatus
{
    /// <summary>Version trong icd_meta.json local (null nếu chưa có file).</summary>
    public string? LocalVersion { get; init; }

    /// <summary>Version trong icd_meta.json trên nguồn công bố.</summary>
    public string? RemoteVersion { get; init; }

    /// <summary>True nếu local đã trùng version mới nhất.</summary>
    public bool UpToDate => LocalVersion != null && LocalVersion == RemoteVersion;

    /// <summary>Nguồn dữ liệu đang đối chiếu.</summary>
    public string? SourceUrl { get; init; }
}

/// <summary>
/// Kết quả một lần đồng bộ.
/// </summary>
public record IcdSyncResult
{
    public bool Synced { get; init; }
    public required string Message { get; init; }
    public string? FromVersion { get; init; }
    public string? ToVersion { get; init; }
    public List<string> UpdatedFiles { get; init; } = new();
}

/// <summary>
/// Đồng bộ danh mục ICD-10 từ nguồn công bố của cơ quan bảo hiểm
/// (https://tracuu-icd10.web.app — trang tĩnh, dữ liệu là các file JSON tại /data/*.json).
///
/// Cách hoạt động (task-030):
/// - Tra cứu ICD lúc validate luôn dùng file local (in-memory, không phụ thuộc mạng).
/// - Service này so sánh trường "version" trong icd_meta.json local với bản trên web;
///   khác version thì tải các file dữ liệu mới về ghi đè (ghi atomic qua file .tmp).
/// - IcdProvider là scoped nên request kế tiếp tự dùng dữ liệu mới, không cần restart.
/// </summary>
public interface IIcdSyncService
{
    /// <summary>So sánh version local với nguồn, không tải dữ liệu.</summary>
    Task<IcdSyncStatus> GetStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>Đồng bộ nếu có version mới (force = true để tải lại bất kể version).</summary>
    Task<IcdSyncResult> SyncAsync(bool force = false, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class IcdSyncService : IIcdSyncService
{
    /// <summary>Nguồn công bố dữ liệu ICD (có thể override qua cấu hình "IcdSync:BaseUrl").</summary>
    public const string DefaultBaseUrl = "https://tracuu-icd10.web.app/data";

    /// <summary>Các file dữ liệu được đồng bộ cùng nhau (meta luôn ghi cuối cùng làm "commit marker").</summary>
    private static readonly string[] DataFiles =
    {
        "icd_rows.json",
        "pl3_drug_rows.json",
        "yhct_rows.json",
        "pl1_pl2_guides.json"
    };

    private readonly HttpClient _httpClient;
    private readonly ILogger<IcdSyncService> _logger;
    private readonly string _baseUrl;

    public IcdSyncService(HttpClient httpClient, IConfiguration configuration, ILogger<IcdSyncService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _baseUrl = (configuration["IcdSync:BaseUrl"] ?? DefaultBaseUrl).TrimEnd('/');
    }

    public async Task<IcdSyncStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var localVersion = ReadLocalVersion();
        var remoteMeta = await FetchRemoteMetaAsync(cancellationToken);

        return new IcdSyncStatus
        {
            LocalVersion = localVersion,
            RemoteVersion = ReadVersion(remoteMeta),
            SourceUrl = _baseUrl
        };
    }

    public async Task<IcdSyncResult> SyncAsync(bool force = false, CancellationToken cancellationToken = default)
    {
        var localVersion = ReadLocalVersion();
        var remoteMetaJson = await FetchRemoteMetaAsync(cancellationToken);
        var remoteVersion = ReadVersion(remoteMetaJson);

        if (remoteVersion == null)
        {
            return new IcdSyncResult
            {
                Synced = false,
                Message = "Không đọc được version từ nguồn công bố — giữ nguyên dữ liệu local.",
                FromVersion = localVersion
            };
        }

        if (!force && localVersion == remoteVersion)
        {
            return new IcdSyncResult
            {
                Synced = false,
                Message = $"Dữ liệu ICD đã ở phiên bản mới nhất ({localVersion}).",
                FromVersion = localVersion,
                ToVersion = remoteVersion
            };
        }

        Directory.CreateDirectory(IcdDataPaths.DataDirectory);
        var updated = new List<string>();

        foreach (var fileName in DataFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var url = $"{_baseUrl}/{fileName}";
            var content = await _httpClient.GetStringAsync(url, cancellationToken);

            // Chặn ghi dữ liệu hỏng: phải parse được JSON; riêng icd_rows phải là mảng đủ lớn
            using (var doc = JsonDocument.Parse(content))
            {
                if (fileName == "icd_rows.json"
                    && (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() < 10_000))
                {
                    throw new InvalidOperationException(
                        $"File {fileName} tải về bất thường ({doc.RootElement.ValueKind}, {(doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.GetArrayLength() : 0)} dòng) — hủy đồng bộ.");
                }
            }

            WriteAtomic(Path.Combine(IcdDataPaths.DataDirectory, fileName), content);
            updated.Add(fileName);
            _logger.LogInformation("Đã cập nhật {File} ({Size} ký tự) từ {Url}", fileName, content.Length, url);
        }

        // Meta ghi cuối cùng: nếu đứt giữa chừng, version local vẫn là cũ → lần sau đồng bộ lại
        WriteAtomic(IcdDataPaths.IcdMetaPath, remoteMetaJson);
        updated.Add("icd_meta.json");

        _logger.LogInformation(
            "Đồng bộ ICD hoàn tất: {From} → {To} ({Count} file)", localVersion ?? "(chưa có)", remoteVersion, updated.Count);

        return new IcdSyncResult
        {
            Synced = true,
            Message = $"Đã cập nhật danh mục ICD từ phiên bản {localVersion ?? "(chưa có)"} lên {remoteVersion}.",
            FromVersion = localVersion,
            ToVersion = remoteVersion,
            UpdatedFiles = updated
        };
    }

    private string? ReadLocalVersion()
    {
        try
        {
            if (!File.Exists(IcdDataPaths.IcdMetaPath))
            {
                return null;
            }
            return ReadVersion(File.ReadAllText(IcdDataPaths.IcdMetaPath));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được icd_meta.json local");
            return null;
        }
    }

    private async Task<string> FetchRemoteMetaAsync(CancellationToken cancellationToken)
        => await _httpClient.GetStringAsync($"{_baseUrl}/icd_meta.json", cancellationToken);

    private static string? ReadVersion(string metaJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(metaJson);
            return doc.RootElement.TryGetProperty("version", out var v) ? v.GetString() : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Ghi qua file .tmp rồi move đè — tránh file hỏng khi ghi dở.</summary>
    private static void WriteAtomic(string path, string content)
    {
        var tmpPath = path + ".tmp";
        File.WriteAllText(tmpPath, content);
        File.Move(tmpPath, path, overwrite: true);
    }
}
