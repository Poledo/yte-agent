using System.Text.Json;
using System.Text.RegularExpressions;

namespace AIValidation.Api.Providers.ICD.Services;

/// <summary>
/// Cấu hình lịch tự động đồng bộ danh mục ICD (đổi được từ web admin, lưu bền ra
/// file JSON trong Storage/ — cùng pattern với LlmSettingsService).
/// </summary>
public class IcdSyncScheduleState
{
    /// <summary>Cho phép tự động lấy dữ liệu ICD từ nguồn công bố (tracuu-icd10.web.app).</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Giờ chạy hằng ngày, định dạng "HH:mm" theo giờ máy chủ. Mặc định 00:00 (12h đêm).</summary>
    public string Time { get; set; } = "00:00";

    /// <summary>Lần chạy tự động/thủ công gần nhất (giờ máy chủ).</summary>
    public DateTime? LastRunAt { get; set; }

    /// <summary>Kết quả lần chạy gần nhất (thông điệp tiếng Việt để hiển thị).</summary>
    public string? LastRunResult { get; set; }
}

/// <summary>Nguồn sự thật cho lịch đồng bộ ICD — singleton, đọc/ghi có khóa.</summary>
public interface IIcdSyncSchedule
{
    IcdSyncScheduleState State { get; }

    /// <summary>Cập nhật bật/tắt + giờ chạy. Ném ArgumentException nếu giờ sai định dạng HH:mm.</summary>
    Task UpdateAsync(bool enabled, string time, CancellationToken cancellationToken = default);

    /// <summary>Ghi nhận một lần chạy (kể cả chạy tay qua nút "Đồng bộ ngay").</summary>
    Task RecordRunAsync(string result, CancellationToken cancellationToken = default);

    /// <summary>Giờ chạy đã parse; false nếu chuỗi hỏng (giữ nguyên không chạy).</summary>
    bool TryGetTime(out int hour, out int minute);
}

/// <inheritdoc />
public sealed partial class IcdSyncScheduleService : IIcdSyncSchedule
{
    private readonly string _statePath;
    private readonly ILogger<IcdSyncScheduleService> _logger;
    private readonly object _lock = new();
    private IcdSyncScheduleState _state;

    [GeneratedRegex(@"^([01]?\d|2[0-3]):([0-5]\d)$")]
    private static partial Regex TimeRegex();

    public IcdSyncScheduleService(IWebHostEnvironment env, ILogger<IcdSyncScheduleService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _statePath = Path.Combine(env.ContentRootPath, "Storage", "icd-sync-settings.json");
        _state = LoadState();
    }

    public IcdSyncScheduleState State
    {
        get { lock (_lock) return Clone(_state); }
    }

    public async Task UpdateAsync(bool enabled, string time, CancellationToken cancellationToken = default)
    {
        time = (time ?? "").Trim();
        if (!TimeRegex().IsMatch(time))
        {
            throw new ArgumentException($"Giờ chạy \"{time}\" không hợp lệ — dùng định dạng HH:mm, ví dụ 00:00 hoặc 23:30.");
        }

        IcdSyncScheduleState snapshot;
        lock (_lock)
        {
            _state.Enabled = enabled;
            _state.Time = time;
            snapshot = Clone(_state);
        }
        await SaveAsync(snapshot, cancellationToken);
        _logger.LogInformation("Lịch đồng bộ ICD: {Status}, giờ chạy {Time}", enabled ? "BẬT" : "TẮT", time);
    }

    public async Task RecordRunAsync(string result, CancellationToken cancellationToken = default)
    {
        IcdSyncScheduleState snapshot;
        lock (_lock)
        {
            _state.LastRunAt = DateTime.Now;
            _state.LastRunResult = result;
            snapshot = Clone(_state);
        }
        await SaveAsync(snapshot, cancellationToken);
    }

    public bool TryGetTime(out int hour, out int minute)
    {
        var match = TimeRegex().Match(State.Time ?? "");
        if (!match.Success)
        {
            hour = minute = 0;
            return false;
        }
        hour = int.Parse(match.Groups[1].Value);
        minute = int.Parse(match.Groups[2].Value);
        return true;
    }

    private static IcdSyncScheduleState Clone(IcdSyncScheduleState s) => new()
    {
        Enabled = s.Enabled,
        Time = s.Time,
        LastRunAt = s.LastRunAt,
        LastRunResult = s.LastRunResult
    };

    private async Task SaveAsync(IcdSyncScheduleState state, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
        await File.WriteAllTextAsync(
            _statePath,
            JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true }),
            cancellationToken);
    }

    private IcdSyncScheduleState LoadState()
    {
        try
        {
            if (File.Exists(_statePath))
            {
                var loaded = JsonSerializer.Deserialize<IcdSyncScheduleState>(File.ReadAllText(_statePath));
                if (loaded != null)
                {
                    return loaded;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được {Path} — dùng lịch mặc định (bật, 00:00)", _statePath);
        }
        return new IcdSyncScheduleState();
    }
}

/// <summary>
/// Chạy nền: mỗi phút kiểm tra lịch; tới giờ (và hôm nay chưa chạy) thì đồng bộ ICD.
/// Có "chạy bù": app khởi động sau giờ hẹn mà hôm nay chưa chạy thì chạy luôn —
/// máy chủ tắt lúc 12h đêm không làm mất lượt của ngày đó.
/// Lỗi mạng chỉ ghi log và chờ lượt sau — validate không ảnh hưởng vì luôn dùng file local.
/// </summary>
public class IcdSyncBackgroundService : BackgroundService
{
    private readonly IIcdSyncSchedule _schedule;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IcdSyncBackgroundService> _logger;

    public IcdSyncBackgroundService(
        IIcdSyncSchedule schedule,
        IServiceScopeFactory scopeFactory,
        ILogger<IcdSyncBackgroundService> logger)
    {
        _schedule = schedule ?? throw new ArgumentNullException(nameof(schedule));
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await RunIfDueAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Lượt đồng bộ ICD tự động gặp lỗi — chờ lượt sau");
                }
            }
        }
        catch (OperationCanceledException)
        {
            // App tắt — thoát êm
        }
    }

    private async Task RunIfDueAsync(CancellationToken cancellationToken)
    {
        var state = _schedule.State;
        if (!state.Enabled || !_schedule.TryGetTime(out var hour, out var minute))
        {
            return;
        }

        var now = DateTime.Now;
        var dueToday = now.Date.AddHours(hour).AddMinutes(minute);
        if (now < dueToday || (state.LastRunAt != null && state.LastRunAt >= dueToday))
        {
            return; // chưa tới giờ, hoặc lượt hôm nay đã chạy (kể cả chạy tay sau giờ hẹn)
        }

        _logger.LogInformation("Tới giờ đồng bộ ICD tự động ({Time}) — bắt đầu kiểm tra phiên bản", state.Time);
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<IIcdSyncService>();
        try
        {
            var result = await syncService.SyncAsync(force: false, cancellationToken);
            await _schedule.RecordRunAsync(result.Message, cancellationToken);
            _logger.LogInformation("Đồng bộ ICD tự động: {Message}", result.Message);
        }
        catch (Exception ex) when (ex is HttpRequestException or InvalidOperationException)
        {
            await _schedule.RecordRunAsync($"Lỗi: {ex.Message}", cancellationToken);
            _logger.LogWarning("Đồng bộ ICD tự động thất bại ({Message}) — dữ liệu local giữ nguyên, chờ lượt sau", ex.Message);
        }
    }
}
