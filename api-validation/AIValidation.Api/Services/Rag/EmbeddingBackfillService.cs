using System.Diagnostics;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Đánh thức worker chỉ mục ngữ nghĩa chạy nền (xem <see cref="EmbeddingBackfillService"/>).
/// </summary>
public interface IEmbeddingBackfill
{
    /// <summary>Yêu cầu worker chạy ngay (gọi sau khi nạp văn bản / bấm nút trên UI).</summary>
    void Poke();

    /// <summary>Worker đang trong một lượt chỉ mục — cho endpoint status/UI hiển thị.</summary>
    bool IsRunning { get; }
}

/// <summary>
/// Worker CHỈ MỤC NGỮ NGHĨA chạy nền phía server — thay cho việc client phải giữ tab
/// mở và gọi lặp endpoint rebuild từng đợt 40 giây:
/// - Khởi động API: tự quét và chỉ mục các đoạn còn thiếu ("chỉ mục trước").
/// - Nạp văn bản mới: <see cref="DocumentIngestService"/> poke — chỉ mục ngay sau upload,
///   upload không phải chờ embed nên trả về nhanh.
/// - Không giới hạn thời gian mỗi lượt (không đi qua HTTP nên không sợ timeout IIS);
///   embed theo lô lớn, nhiều lô song song (Embedding:BatchSize / Embedding:Parallel).
/// - Ollama chết giữa chừng: dừng lượt, tự thử lại ở chu kỳ sau (mỗi 5 phút) hoặc khi
///   được poke — tiến độ đã lưu theo từng lô nên không mất gì.
/// </summary>
public class EmbeddingBackfillService : BackgroundService, IEmbeddingBackfill
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEmbeddingService _embedding;
    private readonly IEmbeddingIndex _embeddingIndex;
    private readonly ILogger<EmbeddingBackfillService> _logger;
    private readonly int _batchSize;
    private readonly int _parallel;

    /// <summary>Đếm tối đa 1 để nhiều poke liên tiếp gộp thành một lượt chạy.</summary>
    private readonly SemaphoreSlim _signal = new(0, 1);

    private volatile bool _running;

    public EmbeddingBackfillService(
        IServiceScopeFactory scopeFactory,
        IEmbeddingService embedding,
        IEmbeddingIndex embeddingIndex,
        IConfiguration config,
        ILogger<EmbeddingBackfillService> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _embedding = embedding ?? throw new ArgumentNullException(nameof(embedding));
        _embeddingIndex = embeddingIndex ?? throw new ArgumentNullException(nameof(embeddingIndex));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _batchSize = int.TryParse(config["Embedding:BatchSize"], out var b) && b > 0 ? b : 32;
        _parallel = int.TryParse(config["Embedding:Parallel"], out var p) && p > 0 ? p : 2;
    }

    public bool IsRunning => _running;

    public void Poke()
    {
        try
        {
            _signal.Release();
        }
        catch (SemaphoreFullException)
        {
            // Đã có tín hiệu chờ sẵn — lượt sắp chạy sẽ vét hết việc, không cần thêm
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ app lên hẳn (migration, DI) rồi mới chạy lượt đầu
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _running = true;
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Lượt chỉ mục ngữ nghĩa nền gặp lỗi — sẽ thử lại ở chu kỳ sau");
            }
            finally
            {
                _running = false;
            }

            // Ngủ tới khi được poke; 5 phút không ai gọi thì tự dậy quét một lần
            // (bắt các trường hợp Ollama sống lại hoặc dữ liệu đổi ngoài luồng)
            try
            {
                await _signal.WaitAsync(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    /// <summary>
    /// Một lượt: đồng bộ vector sẵn có sang pgvector, rồi embed toàn bộ đoạn còn thiếu.
    /// </summary>
    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        // BƯỚC 1 — chép embedding đã có (cột bytea) sang cột pgvector: không cần Ollama
        while (await _embeddingIndex.SyncFromStoredAsync(2000, cancellationToken) > 0)
        {
        }

        if (!_embedding.IsConfigured)
        {
            // Tắt trong cấu hình, hoặc Ollama từng chết — thử ping cho nó sống lại
            if (await _embedding.CheckAsync(cancellationToken) != null)
            {
                return;
            }
        }

        // BƯỚC 2 — embed các đoạn chưa có, lô lớn + song song, lưu sau mỗi vòng
        var stopwatch = Stopwatch.StartNew();
        var done = 0;
        while (!cancellationToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var chunks = await db.DocumentChunks
                .Where(c => c.Embedding == null && c.Document!.IsActive)
                .OrderBy(c => c.Id)
                .Take(_batchSize * _parallel)
                .ToListAsync(cancellationToken);
            if (chunks.Count == 0)
            {
                break;
            }

            var batches = chunks.Chunk(_batchSize).ToList();
            var results = await Task.WhenAll(batches.Select(batch =>
                _embedding.EmbedBatchAsync(batch.Select(c => c.Content).ToList(), cancellationToken)));

            var progressed = false;
            for (var b = 0; b < batches.Count; b++)
            {
                for (var i = 0; i < batches[b].Length; i++)
                {
                    if (results[b][i] != null)
                    {
                        batches[b][i].Embedding = EmbeddingCodec.ToBytes(results[b][i]!);
                        done++;
                        progressed = true;
                    }
                }
            }
            if (!progressed)
            {
                _logger.LogWarning(
                    "Ollama không trả embedding — tạm dừng chỉ mục nền, còn thiếu sẽ chạy tiếp ở chu kỳ sau");
                break;
            }

            // Token RỖNG: lô vừa embed là công sức thật — app có shutdown cũng lưu nốt
            await db.SaveChangesAsync(CancellationToken.None);
            foreach (var batch in batches)
            {
                for (var i = 0; i < batch.Length; i++)
                {
                    if (batch[i].Embedding != null)
                    {
                        await _embeddingIndex.UpsertAsync(
                            batch[i].Id, EmbeddingCodec.ToFloats(batch[i].Embedding!), CancellationToken.None);
                    }
                }
            }
        }

        if (done > 0)
        {
            _embeddingIndex.Invalidate();
            _logger.LogInformation(
                "Chỉ mục ngữ nghĩa nền: embed xong {Done} đoạn trong {Elapsed:mm\\:ss}",
                done, stopwatch.Elapsed);
        }
    }
}
