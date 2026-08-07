using System.Text.Json;
using System.Text.RegularExpressions;

namespace AIValidation.Api.Configuration;

/// <summary>
/// Diện mạo robot chỉnh nhanh từ web-admin (task-003 Part 2): màu thương hiệu, cỡ, logo.
/// Chỉ áp cho hình hài 3D ('three'); các hình hài khác bỏ qua.
/// </summary>
public sealed class RobotAppearance
{
    /// <summary>Màu thương hiệu dạng hex #RRGGBB. Rỗng/không hợp lệ = mặc định xanh VNPT.</summary>
    public string? Color { get; set; }

    /// <summary>Cỡ robot theo phần trăm (100 = mặc định). Kẹp trong [40, 200].</summary>
    public int Scale { get; set; } = 100;

    /// <summary>Hiện logo trên ngực robot hay không (mặc định KHÔNG — logo mặc định là placeholder xấu, chỉ bật khi admin upload logo riêng).</summary>
    public bool ShowLogo { get; set; } = false;

    /// <summary>
    /// Logo tuỳ chỉnh dạng data URL (data:image/...;base64,...). Rỗng = dùng logo VNPT
    /// mặc định đóng gói sẵn. Có giới hạn kích thước để không phình cấu hình.
    /// </summary>
    public string? LogoDataUrl { get; set; }
}

/// <summary>Một mốc ghi đè thời gian của một stage trong hệ sinh hoạt robot (theo id).</summary>
public sealed class RobotStageThreshold
{
    /// <summary>Id stage (khớp với id trong RobotLifeConfig của extension).</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Thời điểm kích hoạt (mili-giây kể từ khi bắt đầu chờ).</summary>
    public long AtMs { get; set; }
}

/// <summary>Ghi đè ngưỡng thời gian cho ba nhóm stage (chỉ đổi atMs theo id).</summary>
public sealed class RobotLifeThresholds
{
    /// <summary>Leo thang khi chờ AI lâu.</summary>
    public List<RobotStageThreshold> WaitEscalation { get; set; } = new();

    /// <summary>Bốn mùa khi chờ AI cực lâu.</summary>
    public List<RobotStageThreshold> Seasons { get; set; } = new();

    /// <summary>Hoá già theo thời gian chờ.</summary>
    public List<RobotStageThreshold> Aging { get; set; } = new();

    /// <summary>
    /// Bật chế độ NGẪU NHIÊN cho leo thang chờ AI: robot đổi hoạt động ngẫu nhiên theo
    /// thời gian ngẫu nhiên thay vì leo thang theo mốc cố định. Mặc định tắt (false).
    /// </summary>
    public bool WaitEscalationRandom { get; set; }
}

/// <summary>
/// Cấu hình extension đổi được lúc runtime từ web-admin (task-003 §1.6 + Part 2):
/// chọn hình hài robot ('svg' | 'svgAnim' | 'three') và ghi đè các mốc thời gian.
/// Lưu bền ra file JSON để không mất khi restart.
/// </summary>
public sealed class ExtensionConfigState
{
    /// <summary>Hình hài robot extension sẽ dựng: 'svg' | 'svgAnim' | 'three'.</summary>
    public string RobotRenderer { get; set; } = ExtensionConfigService.DefaultRenderer;

    /// <summary>Ghi đè ngưỡng thời gian (rỗng = extension dùng mặc định cứng của nó).</summary>
    public RobotLifeThresholds Life { get; set; } = new();

    /// <summary>Diện mạo robot 3D (màu/cỡ/logo). Mặc định = xanh VNPT, 100%, có logo.</summary>
    public RobotAppearance Appearance { get; set; } = new();
}

/// <summary>Nguồn sự thật cho cấu hình extension đang hiệu lực.</summary>
public interface IExtensionConfigStore
{
    /// <summary>Cấu hình hiện tại (đã kiểm chứng).</summary>
    ExtensionConfigState Current { get; }

    /// <summary>Cập nhật cấu hình và lưu bền. Trả về cấu hình đã kiểm chứng.</summary>
    Task<ExtensionConfigState> UpdateAsync(ExtensionConfigState state, CancellationToken ct = default);
}

/// <inheritdoc />
public sealed class ExtensionConfigService : IExtensionConfigStore
{
    /// <summary>Hình hài mặc định khi chưa cấu hình / giá trị không hợp lệ.</summary>
    public const string DefaultRenderer = "svg";

    /// <summary>Các hình hài hợp lệ (khớp RobotRendererId của extension).</summary>
    private static readonly HashSet<string> AllowedRenderers = new(StringComparer.Ordinal)
    {
        "svg",
        "svgAnim",
        "three",
    };

    private readonly string _statePath;
    private readonly ILogger<ExtensionConfigService> _logger;
    private readonly object _lock = new();

    private ExtensionConfigState _current;

    public ExtensionConfigService(IWebHostEnvironment env, ILogger<ExtensionConfigService> logger)
    {
        _logger = logger;
        _statePath = Path.Combine(env.ContentRootPath, "Storage", "extension-config.json");
        _current = Normalize(LoadState());

        _logger.LogInformation(
            "Cấu hình extension khởi động: robotRenderer={Renderer}", _current.RobotRenderer);
    }

    /// <inheritdoc />
    public ExtensionConfigState Current
    {
        get { lock (_lock) return _current; }
    }

    /// <inheritdoc />
    public async Task<ExtensionConfigState> UpdateAsync(ExtensionConfigState state, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(state);
        var normalized = Normalize(state);

        lock (_lock)
        {
            _current = normalized;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
        await File.WriteAllTextAsync(
            _statePath,
            JsonSerializer.Serialize(normalized, new JsonSerializerOptions { WriteIndented = true }),
            ct);

        _logger.LogInformation("Đã đổi cấu hình extension: robotRenderer={Renderer}", normalized.RobotRenderer);
        return normalized;
    }

    /// <summary>Hex #RRGGBB hợp lệ cho màu thương hiệu robot.</summary>
    private static readonly Regex HexColor = new("^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

    /// <summary>Giới hạn độ dài data URL logo (~512KB ảnh mã base64) để cấu hình không phình.</summary>
    private const int MaxLogoDataUrlLength = 700_000;

    /// <summary>Chuẩn hoá: renderer về giá trị hợp lệ, loại mốc rỗng id, kiểm diện mạo.</summary>
    private static ExtensionConfigState Normalize(ExtensionConfigState state)
    {
        var renderer = state.RobotRenderer?.Trim() ?? string.Empty;
        return new ExtensionConfigState
        {
            RobotRenderer = AllowedRenderers.Contains(renderer) ? renderer : DefaultRenderer,
            Life = new RobotLifeThresholds
            {
                WaitEscalation = CleanStages(state.Life?.WaitEscalation),
                Seasons = CleanStages(state.Life?.Seasons),
                Aging = CleanStages(state.Life?.Aging),
                WaitEscalationRandom = state.Life?.WaitEscalationRandom ?? false,
            },
            Appearance = CleanAppearance(state.Appearance),
        };
    }

    /// <summary>Kiểm diện mạo: màu hex hợp lệ, cỡ kẹp [40,200], logo data URL đúng dạng &amp; đủ nhỏ.</summary>
    private static RobotAppearance CleanAppearance(RobotAppearance? a)
    {
        a ??= new RobotAppearance();
        var color = a.Color?.Trim();
        var validColor = !string.IsNullOrEmpty(color) && HexColor.IsMatch(color) ? color : null;
        var scale = a.Scale <= 0 ? 100 : Math.Clamp(a.Scale, 40, 200);
        var logo = a.LogoDataUrl?.Trim();
        var validLogo = !string.IsNullOrEmpty(logo)
            && logo.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)
            && logo.Length <= MaxLogoDataUrlLength
            ? logo
            : null;
        return new RobotAppearance
        {
            Color = validColor,
            Scale = scale,
            ShowLogo = a.ShowLogo,
            LogoDataUrl = validLogo,
        };
    }

    /// <summary>Bỏ mốc thiếu id / atMs âm; extension tự bỏ id lạ nên không cần biết catalog.</summary>
    private static List<RobotStageThreshold> CleanStages(List<RobotStageThreshold>? stages)
    {
        if (stages == null)
        {
            return new List<RobotStageThreshold>();
        }
        return stages
            .Where(s => !string.IsNullOrWhiteSpace(s.Id) && s.AtMs >= 0)
            .Select(s => new RobotStageThreshold { Id = s.Id.Trim(), AtMs = s.AtMs })
            .ToList();
    }

    private ExtensionConfigState LoadState()
    {
        try
        {
            if (File.Exists(_statePath))
            {
                var loaded = JsonSerializer.Deserialize<ExtensionConfigState>(
                    File.ReadAllText(_statePath),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (loaded != null)
                {
                    return loaded;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đọc được {Path} — dùng cấu hình extension mặc định", _statePath);
        }
        return new ExtensionConfigState();
    }
}
