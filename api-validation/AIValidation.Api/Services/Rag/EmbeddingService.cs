using System.Text;
using System.Text.Json;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Tạo vector embedding (tìm kiếm NGỮ NGHĨA) qua Ollama chạy local — miễn phí, offline.
/// Model khuyên dùng: bge-m3 (đa ngữ, tiếng Việt tốt). Cấu hình mục "Embedding" trong
/// appsettings: Enabled / OllamaUrl / Model. Ollama không chạy thì hệ thống tự bỏ qua
/// tầng ngữ nghĩa và hoạt động như cũ (chỉ keyword) — không lỗi.
/// </summary>
public interface IEmbeddingService
{
    /// <summary>Bật trong cấu hình (chưa chắc Ollama đang chạy — lỗi kết nối sẽ tự tắt tới khi restart).</summary>
    bool IsConfigured { get; }

    Task<float[]?> EmbedAsync(string text, CancellationToken cancellationToken = default);

    /// <summary>Embed nhiều đoạn một lần (nhanh hơn gọi lẻ). Phần tử null = đoạn đó thất bại.</summary>
    Task<List<float[]?>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kiểm tra Ollama thật sự hoạt động (embed thử 1 từ, timeout ngắn).
    /// Trả null nếu OK — và đồng thời MỞ LẠI tầng ngữ nghĩa nếu trước đó bị đánh dấu
    /// chết; trả chuỗi mô tả lỗi nếu không.
    /// </summary>
    Task<string?> CheckAsync(CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class OllamaEmbeddingService : IEmbeddingService
{
    private readonly HttpClient _http;
    private readonly ILogger<OllamaEmbeddingService> _logger;
    private readonly bool _enabled;
    private readonly string _url;
    private readonly string _model;

    /// <summary>Ollama chết thì đánh dấu để các lần sau không chờ timeout — reset khi restart app.</summary>
    private static volatile bool _unavailable;

    public OllamaEmbeddingService(HttpClient http, IConfiguration config, ILogger<OllamaEmbeddingService> logger)
    {
        _http = http ?? throw new ArgumentNullException(nameof(http));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _enabled = !string.Equals(config["Embedding:Enabled"], "false", StringComparison.OrdinalIgnoreCase);
        _url = (config["Embedding:OllamaUrl"] ?? "http://localhost:11434").TrimEnd('/');
        _model = config["Embedding:Model"] ?? "bge-m3";
    }

    public bool IsConfigured => _enabled && !_unavailable;

    public async Task<float[]?> EmbedAsync(string text, CancellationToken cancellationToken = default)
        => (await EmbedBatchAsync(new[] { text }, cancellationToken)).FirstOrDefault();

    public async Task<List<float[]?>> EmbedBatchAsync(
        IReadOnlyList<string> texts, CancellationToken cancellationToken = default)
    {
        var empty = texts.Select(_ => (float[]?)null).ToList();
        if (!IsConfigured || texts.Count == 0)
        {
            return empty;
        }

        try
        {
            var body = JsonSerializer.Serialize(new { model = _model, input = texts });
            using var response = await _http.PostAsync(
                $"{_url}/api/embed",
                new StringContent(body, Encoding.UTF8, "application/json"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                MarkUnavailable($"Ollama trả về HTTP {(int)response.StatusCode} — kiểm tra đã `ollama pull {_model}` chưa.");
                return empty;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            if (!doc.RootElement.TryGetProperty("embeddings", out var embeddings)
                || embeddings.ValueKind != JsonValueKind.Array)
            {
                MarkUnavailable("Response Ollama không có mảng embeddings.");
                return empty;
            }

            var result = new List<float[]?>();
            foreach (var vector in embeddings.EnumerateArray())
            {
                result.Add(vector.EnumerateArray().Select(v => (float)v.GetDouble()).ToArray());
            }
            while (result.Count < texts.Count)
            {
                result.Add(null);
            }
            return result;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            MarkUnavailable($"Không gọi được Ollama tại {_url}: {ex.Message}");
            return empty;
        }
    }

    public async Task<string?> CheckAsync(CancellationToken cancellationToken = default)
    {
        if (!_enabled)
        {
            return "Tầng ngữ nghĩa đang TẮT trong cấu hình (Embedding:Enabled = false).";
        }
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            var body = JsonSerializer.Serialize(new { model = _model, input = new[] { "ping" } });
            using var response = await _http.PostAsync(
                $"{_url}/api/embed",
                new StringContent(body, Encoding.UTF8, "application/json"),
                cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                return $"Ollama tại {_url} trả về HTTP {(int)response.StatusCode} — đã chạy `ollama pull {_model}` chưa?";
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cts.Token));
            if (!doc.RootElement.TryGetProperty("embeddings", out _))
            {
                return "Ollama phản hồi nhưng không có embeddings — phiên bản Ollama quá cũ? Cập nhật rồi thử lại.";
            }

            _unavailable = false; // Ollama sống lại — mở lại tầng ngữ nghĩa không cần restart
            return null;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return $"Không kết nối được Ollama tại {_url} ({ex.Message}) — Ollama đã cài và đang chạy chưa? (ollama.com)";
        }
    }

    private void MarkUnavailable(string reason)
    {
        if (!_unavailable)
        {
            _unavailable = true;
            _logger.LogWarning(
                "Tắt tầng tìm kiếm ngữ nghĩa tới khi restart: {Reason} (cài Ollama: ollama.com, rồi `ollama pull {Model}`)",
                reason, _model);
        }
    }
}

/// <summary>Đổi qua lại float[] ↔ bytes để lưu embedding vào cột bytea.</summary>
public static class EmbeddingCodec
{
    public static byte[] ToBytes(float[] vector)
    {
        var bytes = new byte[vector.Length * sizeof(float)];
        Buffer.BlockCopy(vector, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    public static float[] ToFloats(byte[] bytes)
    {
        var vector = new float[bytes.Length / sizeof(float)];
        Buffer.BlockCopy(bytes, 0, vector, 0, bytes.Length);
        return vector;
    }
}

/// <summary>
/// Chỉ mục embedding trong BỘ NHỚ: nạp toàn bộ vector của các đoạn thuộc văn bản còn
/// hiệu lực, tính cosine ngay trong app — không cần pgvector. Tự làm mới mỗi 60 giây
/// khi phát hiện dữ liệu đổi; Invalidate() để ép nạp lại ngay sau khi ingest.
/// </summary>
public interface IEmbeddingIndex
{
    Task<List<(long ChunkId, double Score)>> SearchAsync(float[] query, int top, CancellationToken cancellationToken = default);

    /// <summary>Ghi/cập nhật vector của một đoạn vào chỉ mục (pgvector: UPDATE cột; bộ nhớ: chỉ cần invalidate).</summary>
    Task UpsertAsync(long chunkId, float[] vector, CancellationToken cancellationToken = default);

    /// <summary>
    /// Đồng bộ embedding ĐÃ CÓ (cột bytea) sang chỉ mục — dùng khi bật pgvector trên
    /// kho đã đánh chỉ mục sẵn: không phải embed lại. Trả số dòng xử lý (0 = hết).
    /// </summary>
    Task<int> SyncFromStoredAsync(int maxRows, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gỡ khỏi chỉ mục tìm kiếm mọi vector của văn bản ĐÃ GỠ (IsActive=false): đặt
    /// embedding_vec = NULL để HNSW không còn trả về (xóa file → tự rời cây HNSW ngay).
    /// Cột bytea "Embedding" giữ nguyên nên khôi phục văn bản + đồng bộ lại sẽ nạp vector
    /// về. Trả số vector đã gỡ.
    /// </summary>
    Task<int> DetachInactiveAsync(CancellationToken cancellationToken = default);

    /// <summary>Mô tả chỉ mục đang dùng (pgvector/bộ nhớ + số vector) — cho endpoint status.</summary>
    Task<string> DescribeAsync(CancellationToken cancellationToken = default);

    void Invalidate();
}

/// <inheritdoc />
public class EmbeddingIndex : IEmbeddingIndex
{
    private sealed record Entry(long ChunkId, float[] Vector, double Norm);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmbeddingIndex> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private List<Entry> _entries = new();
    private DateTime _loadedAt = DateTime.MinValue;
    private (int Count, long MaxId) _stamp;

    public EmbeddingIndex(IServiceScopeFactory scopeFactory, ILogger<EmbeddingIndex> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void Invalidate() => _loadedAt = DateTime.MinValue;

    /// <summary>Bộ nhớ đọc thẳng cột bytea khi nạp lại — chỉ cần đánh dấu cache cũ.</summary>
    public Task UpsertAsync(long chunkId, float[] vector, CancellationToken cancellationToken = default)
    {
        Invalidate();
        return Task.CompletedTask;
    }

    /// <summary>Bộ nhớ không cần đồng bộ — nó đọc trực tiếp từ cột bytea.</summary>
    public Task<int> SyncFromStoredAsync(int maxRows, CancellationToken cancellationToken = default)
        => Task.FromResult(0);

    /// <summary>Bộ nhớ lọc IsActive ngay lúc nạp lại — chỉ cần đánh dấu cache cũ.</summary>
    public Task<int> DetachInactiveAsync(CancellationToken cancellationToken = default)
    {
        Invalidate();
        return Task.FromResult(0);
    }

    public Task<string> DescribeAsync(CancellationToken cancellationToken = default)
        => Task.FromResult($"Chỉ mục BỘ NHỚ (brute-force cosine, {_entries.Count} vector đang cache)");

    public async Task<List<(long ChunkId, double Score)>> SearchAsync(
        float[] query, int top, CancellationToken cancellationToken = default)
    {
        await EnsureLoadedAsync(cancellationToken);

        var queryNorm = Math.Sqrt(query.Sum(v => (double)v * v));
        if (queryNorm == 0 || _entries.Count == 0)
        {
            return new List<(long, double)>();
        }

        return _entries
            .Select(e => (e.ChunkId, Score: Cosine(query, queryNorm, e)))
            .OrderByDescending(x => x.Score)
            .Take(top)
            .ToList();
    }

    private static double Cosine(float[] query, double queryNorm, Entry entry)
    {
        var length = Math.Min(query.Length, entry.Vector.Length);
        double dot = 0;
        for (var i = 0; i < length; i++)
        {
            dot += (double)query[i] * entry.Vector[i];
        }
        return entry.Norm == 0 ? 0 : dot / (queryNorm * entry.Norm);
    }

    private async Task EnsureLoadedAsync(CancellationToken cancellationToken)
    {
        if ((DateTime.UtcNow - _loadedAt).TotalSeconds < 60)
        {
            return;
        }
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if ((DateTime.UtcNow - _loadedAt).TotalSeconds < 60)
            {
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;

            var baseQuery = db.DocumentChunks
                .Where(c => c.Embedding != null
                    && c.Document!.IsActive
                    && (c.Document.ExpiryDate == null || c.Document.ExpiryDate > now)
                    && (c.Document.EffectiveDate == null || c.Document.EffectiveDate <= now));

            // Đổi dữ liệu mới nạp lại — kiểm tra rẻ bằng (số đoạn, id lớn nhất)
            var stamp = (
                Count: await baseQuery.CountAsync(cancellationToken),
                MaxId: await baseQuery.MaxAsync(c => (long?)c.Id, cancellationToken) ?? 0);
            if (stamp != _stamp || _entries.Count == 0)
            {
                var rows = await baseQuery
                    .Select(c => new { c.Id, c.Embedding })
                    .ToListAsync(cancellationToken);
                _entries = rows
                    .Select(r =>
                    {
                        var vector = EmbeddingCodec.ToFloats(r.Embedding!);
                        return new Entry(r.Id, vector, Math.Sqrt(vector.Sum(v => (double)v * v)));
                    })
                    .ToList();
                _stamp = stamp;
                _logger.LogInformation("Chỉ mục ngữ nghĩa: nạp {Count} vector vào bộ nhớ", _entries.Count);
            }
            _loadedAt = DateTime.UtcNow;
        }
        finally
        {
            _lock.Release();
        }
    }
}
