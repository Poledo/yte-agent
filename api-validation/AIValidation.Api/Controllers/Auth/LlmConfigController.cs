using System.Text.Json;
using AIValidation.Api.Authorization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers.Auth;

/// <summary>
/// Cấu hình AI (LLM) lúc runtime: chuyển online (OpenRouter) / offline (Ollama local),
/// đổi model, kiểm tra kết nối. Yêu cầu quyền System.Admin.
/// </summary>
[Route("api/admin/llm-config")]
[RequirePermission(Permissions.SystemAdmin)]
public sealed class LlmConfigController : AuthControllerBase
{
    private readonly ILlmSettings _settings;
    private readonly IAuditService _auditService;
    private readonly IHttpClientFactory _httpClientFactory;

    public LlmConfigController(
        ILlmSettings settings,
        IAuditService auditService,
        IHttpClientFactory httpClientFactory)
    {
        _settings = settings;
        _auditService = auditService;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>Cấu hình hiện tại: trạng thái override + cấu hình đang hiệu lực.</summary>
    [HttpGet]
    public IActionResult Get()
    {
        var state = _settings.State;
        var current = _settings.Current;
        return Ok(new
        {
            mode = state.Mode,
            hasOnlineApiKey = _settings.HasOnlineApiKey,
            onlineModel = state.OnlineModel,
            onlineFallbackModels = state.OnlineFallbackModels,
            offlineBaseUrl = state.OfflineBaseUrl,
            offlineModel = state.OfflineModel,
            offlineTimeoutSeconds = state.OfflineTimeoutSeconds,
            effective = new
            {
                current.Provider,
                current.Model,
                current.FallbackModels,
                current.TimeoutSeconds,
                current.IsConfigured,
            },
        });
    }

    /// <summary>Cập nhật cấu hình (áp dụng ngay, không cần restart) và lưu bền.</summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] LlmSettingsState state, CancellationToken ct)
    {
        if (state == null)
        {
            return BadRequest(new { message = "Thiếu nội dung cấu hình." });
        }

        var effective = await _settings.UpdateAsync(state, ct);

        await _auditService.LogAsync("System.LlmConfig", CurrentUserId,
            entityType: "LlmConfig",
            detail: $"mode={_settings.State.Mode}, model={effective.Model}",
            ipAddress: ClientIp, ct: ct);

        return Ok(new
        {
            message = _settings.State.Mode == "offline"
                ? $"Đã chuyển sang AI OFFLINE (Ollama local, model {effective.Model}). Áp dụng ngay."
                : $"Đã chuyển sang AI ONLINE (OpenRouter, model {effective.Model}). Áp dụng ngay.",
            effective = new { effective.Provider, effective.Model, effective.IsConfigured },
        });
    }

    /// <summary>
    /// Kiểm tra kết nối theo chế độ chỉ định (mode=online|offline; mặc định chế độ hiện tại).
    /// Offline: gọi Ollama /api/tags xem server sống + model đã pull chưa.
    /// Online: kiểm tra ApiKey với OpenRouter.
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> Test([FromQuery] string? mode, CancellationToken ct)
    {
        var target = string.IsNullOrWhiteSpace(mode) ? _settings.State.Mode : mode.Trim().ToLowerInvariant();
        return target == "offline" ? await TestOfflineAsync(ct) : await TestOnlineAsync(ct);
    }

    private async Task<IActionResult> TestOfflineAsync(CancellationToken ct)
    {
        var state = _settings.State;
        var baseUrl = string.IsNullOrWhiteSpace(state.OfflineBaseUrl)
            ? "http://localhost:11434"
            : state.OfflineBaseUrl.TrimEnd('/');
        var model = string.IsNullOrWhiteSpace(state.OfflineModel) ? "qwen2.5:7b-instruct" : state.OfflineModel;

        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var json = await client.GetStringAsync($"{baseUrl}/api/tags", ct);

            using var doc = JsonDocument.Parse(json);
            var models = doc.RootElement.TryGetProperty("models", out var arr)
                ? arr.EnumerateArray()
                    .Select(m => m.TryGetProperty("name", out var n) ? n.GetString() : null)
                    .Where(n => n != null)
                    .ToList()
                : new List<string?>();

            var hasModel = models.Any(m =>
                string.Equals(m, model, StringComparison.OrdinalIgnoreCase)
                || m!.StartsWith(model + ":", StringComparison.OrdinalIgnoreCase));

            return Ok(new
            {
                ok = hasModel,
                message = hasModel
                    ? $"Ollama đang chạy tại {baseUrl}, model \"{model}\" sẵn sàng."
                    : $"Ollama đang chạy tại {baseUrl} nhưng CHƯA có model \"{model}\". "
                      + $"Chạy: ollama pull {model}. Model hiện có: {(models.Count > 0 ? string.Join(", ", models) : "(trống)")}",
            });
        }
        catch (Exception)
        {
            return Ok(new
            {
                ok = false,
                message = $"Không kết nối được Ollama tại {baseUrl}. "
                        + "Kiểm tra Ollama đã cài và đang chạy (lệnh: ollama serve).",
            });
        }
    }

    private async Task<IActionResult> TestOnlineAsync(CancellationToken ct)
    {
        if (!_settings.HasOnlineApiKey)
        {
            return Ok(new { ok = false, message = "Chưa cấu hình LLM:ApiKey trong appsettings — chế độ online không dùng được." });
        }

        try
        {
            var current = _settings.Current;
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://openrouter.ai/api/v1/key");
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Bearer",
                // Test bằng key trong appsettings kể cả khi đang ở mode offline
                current.Provider.Equals("Ollama", StringComparison.OrdinalIgnoreCase) ? GetOnlineApiKey() : current.ApiKey);

            var resp = await client.SendAsync(req, ct);
            return Ok(resp.IsSuccessStatusCode
                ? new { ok = true, message = "Kết nối OpenRouter thành công — ApiKey hợp lệ." }
                : new { ok = false, message = $"OpenRouter từ chối ApiKey (HTTP {(int)resp.StatusCode}). Kiểm tra lại LLM:ApiKey." });
        }
        catch (Exception)
        {
            return Ok(new { ok = false, message = "Không kết nối được OpenRouter — kiểm tra đường truyền internet." });
        }
    }

    /// <summary>Lấy ApiKey online từ cấu hình nền (khi đang offline, Current.ApiKey rỗng).</summary>
    private string GetOnlineApiKey()
    {
        // ILlmSettings không lộ key trực tiếp; chuyển tạm mode online để build lại là thừa —
        // đọc qua HasOnlineApiKey đảm bảo có key, còn giá trị lấy từ cấu hình nền qua service.
        return ((LlmSettingsService)_settings).BaseApiKey;
    }
}
