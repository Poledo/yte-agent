using System.Data.Common;
using System.Globalization;
using System.Text;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Chỉ mục ngữ nghĩa chạy bằng PGVECTOR: vector lưu ở cột <c>embedding_vec vector(N)</c>
/// của bảng document_chunks, tìm kiếm bằng <c>ORDER BY embedding_vec &lt;=&gt; query</c>
/// với chỉ mục HNSW — phù hợp kho lớn (100 nghìn+ đoạn) vì không phải nạp toàn bộ
/// vector vào RAM và không quét tuyến tính mỗi câu hỏi.
///
/// Tự lo hạ tầng ở lần dùng đầu tiên: CREATE EXTENSION vector, thêm cột, tạo chỉ mục
/// HNSW. Nếu PostgreSQL CHƯA cài binary pgvector thì tự rơi về <see cref="EmbeddingIndex"/>
/// (bộ nhớ) — hệ thống vẫn chạy, chỉ log cảnh báo hướng dẫn cài.
///
/// Cột bytea "Embedding" vẫn là nơi lưu gốc (EF ghi khi ingest); cột embedding_vec là
/// bản sao phục vụ tìm kiếm, đồng bộ qua <see cref="UpsertAsync"/> và
/// <see cref="SyncFromStoredAsync"/> — nhờ vậy kho 105 nghìn đoạn đã embed KHÔNG phải
/// embed lại khi chuyển sang pgvector.
/// </summary>
public class PgVectorEmbeddingIndex : IEmbeddingIndex
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly EmbeddingIndex _fallback;
    private readonly ILogger<PgVectorEmbeddingIndex> _logger;
    private readonly bool _enabled;
    private readonly int _dimensions;

    /// <summary>0 = chưa thăm dò; 1 = pgvector sẵn sàng; -1 = không khả dụng (dùng bộ nhớ).</summary>
    private static int _state;
    private static string _stateReason = "";
    private static readonly SemaphoreSlim ProbeLock = new(1, 1);

    /// <summary>
    /// Chỉ mục HNSW: 0 = chưa có, 1 = đang build nền, 2 = đã có/không build nữa.
    /// Cố ý build SAU khi dữ liệu đã chép xong (khuyến cáo pgvector) — build trước thì
    /// mỗi dòng UPDATE đều phải chèn vào cây HNSW, đồng bộ 100 nghìn dòng chậm hơn hàng chục lần.
    /// Chưa có chỉ mục thì truy vấn vẫn ĐÚNG (seq scan), chỉ chậm hơn chút.
    /// </summary>
    private static int _indexState;

    public PgVectorEmbeddingIndex(
        IServiceScopeFactory scopeFactory,
        EmbeddingIndex fallback,
        IConfiguration config,
        ILogger<PgVectorEmbeddingIndex> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _fallback = fallback ?? throw new ArgumentNullException(nameof(fallback));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _enabled = !string.Equals(config["Embedding:UsePgvector"], "false", StringComparison.OrdinalIgnoreCase);
        _dimensions = int.TryParse(config["Embedding:Dimensions"], out var d) && d > 0 ? d : 1024; // bge-m3
    }

    public void Invalidate() => _fallback.Invalidate();

    /// <summary>
    /// Thăm dò một lần: tạo extension + cột + chỉ mục HNSW nếu chưa có.
    /// CREATE EXTENSION cần binary pgvector đã cài vào PostgreSQL — thiếu thì trả false.
    /// </summary>
    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!_enabled)
        {
            return false;
        }
        if (_state != 0)
        {
            return _state == 1;
        }

        await ProbeLock.WaitAsync(cancellationToken);
        try
        {
            if (_state != 0)
            {
                return _state == 1;
            }

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.OpenConnectionAsync(cancellationToken);
            var conn = db.Database.GetDbConnection();
            try
            {
                await ExecAsync(conn, "CREATE EXTENSION IF NOT EXISTS vector", cancellationToken);
                await ExecAsync(conn,
                    $"ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector({_dimensions})",
                    cancellationToken);
                _state = 1;
                _stateReason = "";
                _logger.LogInformation("pgvector sẵn sàng — tìm kiếm ngữ nghĩa chạy bằng SQL (cột embedding_vec, {Dims} chiều)", _dimensions);

                // Chỉ mục HNSW đã tồn tại từ lần chạy trước? (build mới để dành cho lúc
                // dữ liệu đồng bộ xong — xem TriggerIndexBuild)
                await using (var check = conn.CreateCommand())
                {
                    check.CommandText =
                        "SELECT 1 FROM pg_indexes WHERE schemaname = 'public' " +
                        "AND indexname = 'ix_document_chunks_embedding_vec'";
                    _indexState = await check.ExecuteScalarAsync(cancellationToken) != null ? 2 : 0;
                }
            }
            catch (Exception ex)
            {
                _state = -1;
                _stateReason = ex.Message;
                _logger.LogWarning(
                    "pgvector CHƯA khả dụng ({Message}) — tạm dùng chỉ mục bộ nhớ. " +
                    "Cách bật: cài extension pgvector cho PostgreSQL (copy vector.dll vào lib/, " +
                    "vector.control + vector--*.sql vào share/extension/, restart PostgreSQL) rồi restart API.",
                    ex.Message);
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        finally
        {
            ProbeLock.Release();
        }
        return _state == 1;
    }

    public async Task<List<(long ChunkId, double Score)>> SearchAsync(
        float[] query, int top, CancellationToken cancellationToken = default)
    {
        if (!await IsAvailableAsync(cancellationToken) || query.Length != _dimensions)
        {
            return await _fallback.SearchAsync(query, top, cancellationToken);
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.OpenConnectionAsync(cancellationToken);
            var conn = db.Database.GetDbConnection();
            try
            {
                await using var cmd = conn.CreateCommand();
                // <=> = khoảng cách cosine của pgvector (0 = trùng khớp) → score = 1 - distance
                cmd.CommandText = """
                    SELECT c."Id", 1 - (c.embedding_vec <=> @q::vector) AS score
                    FROM public.document_chunks c
                    JOIN public.medical_documents d ON d."Id" = c."DocumentId"
                    WHERE c.embedding_vec IS NOT NULL
                      AND d."IsActive" = TRUE
                      AND (d."ExpiryDate" IS NULL OR d."ExpiryDate" > now())
                      AND (d."EffectiveDate" IS NULL OR d."EffectiveDate" <= now())
                    ORDER BY c.embedding_vec <=> @q::vector
                    LIMIT @top
                    """;
                AddParam(cmd, "@q", ToLiteral(query));
                AddParam(cmd, "@top", top);

                var results = new List<(long, double)>();
                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    results.Add((reader.GetInt64(0), reader.GetDouble(1)));
                }
                return results;
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Truy vấn pgvector lỗi ({Message}) — dùng chỉ mục bộ nhớ cho lần này", ex.Message);
            return await _fallback.SearchAsync(query, top, cancellationToken);
        }
    }

    /// <summary>Ghi vector của một đoạn vào cột pgvector (gọi ngay sau khi embed lúc ingest/rebuild).</summary>
    public async Task UpsertAsync(long chunkId, float[] vector, CancellationToken cancellationToken = default)
    {
        _fallback.Invalidate(); // phòng khi đang chạy chế độ bộ nhớ
        if (!await IsAvailableAsync(cancellationToken) || vector.Length != _dimensions)
        {
            return;
        }
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.OpenConnectionAsync(cancellationToken);
            var conn = db.Database.GetDbConnection();
            try
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = """UPDATE public.document_chunks SET embedding_vec = @v::vector WHERE "Id" = @id""";
                AddParam(cmd, "@v", ToLiteral(vector));
                AddParam(cmd, "@id", chunkId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Không ghi được vector đoạn {ChunkId} vào pgvector: {Message}", chunkId, ex.Message);
        }
    }

    /// <summary>
    /// Chép embedding ĐÃ CÓ từ cột bytea sang cột pgvector, mỗi lần tối đa
    /// <paramref name="maxRows"/> dòng — kho 105 nghìn đoạn không phải embed lại.
    /// Trả số dòng xử lý; 0 nghĩa là đã đồng bộ xong (hoặc pgvector không khả dụng).
    /// </summary>
    public async Task<int> SyncFromStoredAsync(int maxRows, CancellationToken cancellationToken = default)
    {
        if (!await IsAvailableAsync(cancellationToken))
        {
            return 0;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.OpenConnectionAsync(cancellationToken);
        var conn = db.Database.GetDbConnection();
        try
        {
            var rows = new List<(long Id, byte[] Bytes)>();
            await using (var select = conn.CreateCommand())
            {
                // Chỉ đồng bộ đoạn của văn bản ĐANG hiệu lực. Nhờ vậy vector đã gỡ
                // (DetachInactiveAsync đặt embedding_vec = NULL khi xóa file) KHÔNG bị
                // nạp lại vào HNSW; còn khi khôi phục văn bản (IsActive=true) thì lần
                // đồng bộ sau tự chép vector từ bytea về — xóa/khôi phục đều tự động.
                select.CommandText = """
                    SELECT c."Id", c."Embedding" FROM public.document_chunks c
                    JOIN public.medical_documents d ON d."Id" = c."DocumentId"
                    WHERE c."Embedding" IS NOT NULL AND c.embedding_vec IS NULL AND d."IsActive" = TRUE
                    ORDER BY c."Id" LIMIT @max
                    """;
                AddParam(select, "@max", maxRows);
                await using var reader = await select.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    rows.Add((reader.GetInt64(0), (byte[])reader.GetValue(1)));
                }
            }
            if (rows.Count == 0)
            {
                TriggerIndexBuild(); // dữ liệu đã chép xong — giờ mới build HNSW một lần cho nhanh
                return 0;
            }

            // Gom một transaction cho nhanh; vector sai kích thước (đổi model cũ?) thì bỏ qua
            await using var tx = await conn.BeginTransactionAsync(cancellationToken);
            var written = 0;
            foreach (var (id, bytes) in rows)
            {
                var vector = EmbeddingCodec.ToFloats(bytes);
                await using var update = conn.CreateCommand();
                update.Transaction = tx;
                if (vector.Length == _dimensions)
                {
                    update.CommandText = """UPDATE public.document_chunks SET embedding_vec = @v::vector WHERE "Id" = @id""";
                    AddParam(update, "@v", ToLiteral(vector));
                    written++;
                }
                else
                {
                    // Đánh dấu đã xử lý bằng cách xóa bytea lệch chiều — tránh lặp vô hạn
                    update.CommandText = """UPDATE public.document_chunks SET "Embedding" = NULL WHERE "Id" = @id""";
                    _logger.LogWarning("Đoạn {ChunkId} có vector {Len} chiều (kỳ vọng {Dims}) — bỏ qua, cần embed lại", id, vector.Length, _dimensions);
                }
                AddParam(update, "@id", id);
                await update.ExecuteNonQueryAsync(cancellationToken);
            }
            await tx.CommitAsync(cancellationToken);
            if (written > 0)
            {
                _logger.LogInformation("Đồng bộ {Count} vector bytea → pgvector", written);
            }
            return rows.Count;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    /// <inheritdoc />
    public async Task<int> DetachInactiveAsync(CancellationToken cancellationToken = default)
    {
        if (!await IsAvailableAsync(cancellationToken))
        {
            return 0;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.OpenConnectionAsync(cancellationToken);
        var conn = db.Database.GetDbConnection();
        try
        {
            await using var cmd = conn.CreateCommand();
            // Xóa vector khỏi cây HNSW cho MỌI văn bản đã gỡ; bytea "Embedding" giữ lại
            // để khôi phục còn nạp về được. Idempotent — chạy lại không hại.
            cmd.CommandText = """
                UPDATE public.document_chunks c
                SET embedding_vec = NULL
                FROM public.medical_documents d
                WHERE c."DocumentId" = d."Id" AND d."IsActive" = FALSE AND c.embedding_vec IS NOT NULL
                """;
            var removed = await cmd.ExecuteNonQueryAsync(cancellationToken);
            if (removed > 0)
            {
                _logger.LogInformation("Gỡ {Count} vector của văn bản đã xóa khỏi chỉ mục HNSW", removed);
            }
            return removed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Không gỡ được vector văn bản đã xóa khỏi pgvector: {Message}", ex.Message);
            return 0;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    public async Task<string> DescribeAsync(CancellationToken cancellationToken = default)
    {
        if (!await IsAvailableAsync(cancellationToken))
        {
            var reason = _enabled ? _stateReason : "tắt trong cấu hình (Embedding:UsePgvector = false)";
            return $"Chỉ mục BỘ NHỚ — pgvector không khả dụng ({reason})";
        }
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.OpenConnectionAsync(cancellationToken);
            var conn = db.Database.GetDbConnection();
            try
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = """
                    SELECT count(*) FILTER (WHERE c.embedding_vec IS NOT NULL),
                           count(*) FILTER (WHERE c."Embedding" IS NOT NULL AND c.embedding_vec IS NULL AND d."IsActive" = TRUE)
                    FROM public.document_chunks c
                    JOIN public.medical_documents d ON d."Id" = c."DocumentId"
                    """;
                await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                await reader.ReadAsync(cancellationToken);
                var withVec = reader.GetInt64(0);
                var pending = reader.GetInt64(1);
                var hnsw = _indexState switch
                {
                    1 => "đang build HNSW nền...",
                    2 => "HNSW",
                    _ => "chưa có HNSW"
                };
                return pending > 0
                    ? $"Chỉ mục PGVECTOR ({hnsw}): {withVec:N0} vector — còn {pending:N0} đoạn chờ đồng bộ (bấm \"Chỉ mục ngữ nghĩa\")"
                    : $"Chỉ mục PGVECTOR ({hnsw}): {withVec:N0} vector, {_dimensions} chiều";
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        catch (Exception ex)
        {
            return $"Chỉ mục PGVECTOR — không đọc được thống kê ({ex.Message})";
        }
    }

    /// <summary>
    /// Build chỉ mục HNSW ở NỀN (một lần): CONCURRENTLY để không khóa bảng, timeout dài
    /// vì 100 nghìn vector build mất vài phút. Trong lúc build, tìm kiếm vẫn đúng (seq scan).
    /// </summary>
    private void TriggerIndexBuild()
    {
        if (Interlocked.CompareExchange(ref _indexState, 1, 0) != 0)
        {
            return; // đã build xong hoặc đang build
        }
        _ = Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation("Bắt đầu build chỉ mục HNSW cho embedding_vec (chạy nền, có thể mất vài phút)...");
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.OpenConnectionAsync();
                var conn = db.Database.GetDbConnection();
                try
                {
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandTimeout = 3600;
                    cmd.CommandText =
                        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_document_chunks_embedding_vec " +
                        "ON public.document_chunks USING hnsw (embedding_vec vector_cosine_ops)";
                    await cmd.ExecuteNonQueryAsync();
                    _indexState = 2;
                    _logger.LogInformation("Đã build xong chỉ mục HNSW — tìm kiếm ngữ nghĩa đạt tốc độ tối đa");
                }
                finally
                {
                    await db.Database.CloseConnectionAsync();
                }
            }
            catch (Exception ex)
            {
                _indexState = 2; // không thử lại vòng lặp — thiếu HNSW thì seq scan vẫn đúng
                _logger.LogWarning("Không build được chỉ mục HNSW ({Message}) — tìm kiếm vẫn chạy, chỉ chậm hơn (pgvector >= 0.5 mới có HNSW)", ex.Message);
            }
        });
    }

    /// <summary>Chuỗi literal pgvector: "[0.1,0.2,...]" (InvariantCulture — dấu chấm thập phân).</summary>
    private static string ToLiteral(float[] vector)
    {
        var sb = new StringBuilder(vector.Length * 10);
        sb.Append('[');
        for (var i = 0; i < vector.Length; i++)
        {
            if (i > 0)
            {
                sb.Append(',');
            }
            sb.Append(vector[i].ToString("G9", CultureInfo.InvariantCulture));
        }
        sb.Append(']');
        return sb.ToString();
    }

    // CA2100 cảnh báo câu lệnh SQL dựng bằng chuỗi. Ở đây là DDL khởi tạo (CREATE
    // EXTENSION / ALTER TABLE ... vector(N)) và PostgreSQL không cho tham số hóa
    // tên kiểu hay số chiều. Chỉ có duy nhất một giá trị được ghép vào: _dimensions,
    // là int đọc từ cấu hình (int.TryParse, mặc định 1024) — không phải dữ liệu người
    // dùng nhập. Hai lời gọi ExecAsync đều nằm trong lớp này, không public ra ngoài.
    [System.Diagnostics.CodeAnalysis.SuppressMessage(
        "Security", "CA2100:Review SQL queries for security vulnerabilities",
        Justification = "DDL khởi tạo pgvector, chỉ ghép số chiều kiểu int từ cấu hình, không có đầu vào người dùng.")]
    private static async Task ExecAsync(DbConnection conn, string sql, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddParam(DbCommand cmd, string name, object value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value;
        cmd.Parameters.Add(p);
    }
}
