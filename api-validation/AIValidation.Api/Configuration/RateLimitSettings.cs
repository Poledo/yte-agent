using System.Text.Json;

namespace AIValidation.Api.Configuration;

/// <summary>
/// Ngưỡng chống spam request (rate limit) có thể đổi lúc runtime, lưu bền ra JSON.
/// Đơn vị: số request tối đa / phút / IP. Tối thiểu 1 (không cho tắt hẳn bảo vệ).
/// </summary>
public class RateLimitState
{
    /// <summary>Giới hạn CHUNG cho mọi request (mặc định 100/phút/IP).</summary>
    public int GlobalPerMinute { get; set; } = 100;

    /// <summary>Đăng nhập — chống dò mật khẩu (mặc định 5/phút/IP).</summary>
    public int LoginPerMinute { get; set; } = 5;

    /// <summary>Quên mật khẩu — chống spam gửi mail đặt lại (mặc định 3/phút/IP).</summary>
    public int ForgotPasswordPerMinute { get; set; } = 3;

    /// <summary>Hỏi đáp AI — kiểm soát chi phí LLM (mặc định 10/phút/IP).</summary>
    public int AskPerMinute { get; set; } = 10;

    /// <summary>Nạp đặc tả XML130 — chặn spam parse Excel tốn CPU (mặc định 5/phút/IP).</summary>
    public int ImportPerMinute { get; set; } = 5;
}

/// <summary>
/// Nguồn sự thật cho ngưỡng rate limit đang hiệu lực. Cho phép admin chỉnh ngưỡng
/// từ web admin mà KHÔNG cần restart: factory rate limiter đọc <see cref="State"/>
/// theo từng request; <see cref="Generation"/> được gắn vào khóa phân vùng nên khi
/// admin lưu, mọi IP lập tức rơi vào bộ đếm mới với ngưỡng mới (áp dụng ngay).
/// </summary>
public interface IRateLimitSettings
{
    /// <summary>Ngưỡng đang hiệu lực.</summary>
    RateLimitState State { get; }

    /// <summary>Số phiên bản cấu hình — tăng mỗi lần cập nhật để làm mới bộ đếm.</summary>
    int Generation { get; }

    /// <summary>Cập nhật ngưỡng (áp dụng ngay) và lưu bền. Trả về ngưỡng đã chuẩn hóa.</summary>
    Task<RateLimitState> UpdateAsync(RateLimitState state, CancellationToken ct = default);
}

/// <inheritdoc />
public sealed class RateLimitSettingsService : IRateLimitSettings
{
    private const int MinPerMinute = 1;

    private readonly string _statePath;
    private readonly ILogger<RateLimitSettingsService> _logger;
    private readonly object _lock = new();

    private RateLimitState _state;
    private int _generation = 1;

    public RateLimitSettingsService(IWebHostEnvironment env, ILogger<RateLimitSettingsService> logger)
    {
        _logger = logger;
        _statePath = Path.Combine(env.ContentRootPath, "Storage", "ratelimit-settings.json");
        _state = Normalize(LoadState());

        _logger.LogInformation(
            "Ngưỡng chống spam khởi động: chung={Global}, login={Login}, forgot={Forgot}, ask={Ask}, import={Import} (req/phút/IP)",
            _state.GlobalPerMinute, _state.LoginPerMinute, _state.ForgotPasswordPerMinute,
            _state.AskPerMinute, _state.ImportPerMinute);
    }

    /// <inheritdoc />
    public RateLimitState State
    {
        get { lock (_lock) return _state; }
    }

    /// <inheritdoc />
    public int Generation
    {
        get { lock (_lock) return _generation; }
    }

    /// <inheritdoc />
    public async Task<RateLimitState> UpdateAsync(RateLimitState state, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(state);
        var normalized = Normalize(state);

        lock (_lock)
        {
            _state = normalized;
            _generation++; // đổi khóa phân vùng → mọi IP nhận ngưỡng mới ngay
        }

        Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
        await File.WriteAllTextAsync(
            _statePath,
            JsonSerializer.Serialize(normalized, new JsonSerializerOptions { WriteIndented = true }),
            ct);

        _logger.LogInformation(
            "Đã đổi ngưỡng chống spam: chung={Global}, login={Login}, forgot={Forgot}, ask={Ask}, import={Import} (req/phút/IP)",
            normalized.GlobalPerMinute, normalized.LoginPerMinute, normalized.ForgotPasswordPerMinute,
            normalized.AskPerMinute, normalized.ImportPerMinute);
        return normalized;
    }

    /// <summary>Ép mọi ngưỡng &gt;= tối thiểu để admin không vô tình tắt bảo vệ.</summary>
    private static RateLimitState Normalize(RateLimitState s) => new()
    {
        GlobalPerMinute = Math.Max(MinPerMinute, s.GlobalPerMinute),
        LoginPerMinute = Math.Max(MinPerMinute, s.LoginPerMinute),
        ForgotPasswordPerMinute = Math.Max(MinPerMinute, s.ForgotPasswordPerMinute),
        AskPerMinute = Math.Max(MinPerMinute, s.AskPerMinute),
        ImportPerMinute = Math.Max(MinPerMinute, s.ImportPerMinute),
    };

    private RateLimitState LoadState()
    {
        try
        {
            if (File.Exists(_statePath))
            {
                var loaded = JsonSerializer.Deserialize<RateLimitState>(File.ReadAllText(_statePath));
                if (loaded != null)
                {
                    return loaded;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được {Path} — dùng ngưỡng mặc định", _statePath);
        }
        return new RateLimitState();
    }
}
