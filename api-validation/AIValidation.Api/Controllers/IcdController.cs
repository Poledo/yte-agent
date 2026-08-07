using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.ICD.Interfaces;
using AIValidation.Api.Providers.ICD.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers;

/// <summary>
/// Controller for ICD (International Classification of Diseases) data management
/// Handles import, query, and administration of ICD master data
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class IcdController : ControllerBase
{
    private readonly IIcdImportService _importService;
    private readonly IIcdProvider _icdProvider;
    private readonly IIcdSyncService _syncService;
    private readonly IIcdSyncSchedule _schedule;
    private readonly ILogger<IcdController> _logger;

    public IcdController(
        IIcdImportService importService,
        IIcdProvider icdProvider,
        IIcdSyncService syncService,
        IIcdSyncSchedule schedule,
        ILogger<IcdController> logger)
    {
        _schedule = schedule ?? throw new ArgumentNullException(nameof(schedule));
        _importService = importService ?? throw new ArgumentNullException(nameof(importService));
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _syncService = syncService ?? throw new ArgumentNullException(nameof(syncService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// So sánh phiên bản danh mục ICD local với nguồn công bố (tracuu-icd10.web.app).
    /// GET /api/icd/sync/status
    /// </summary>
    [HttpGet("sync/status")]
    public async Task<IActionResult> GetSyncStatusAsync(CancellationToken cancellationToken)
    {
        try
        {
            var status = await _syncService.GetStatusAsync(cancellationToken);
            return Ok(status);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { error = "Không kết nối được nguồn công bố ICD", details = ex.Message });
        }
    }

    /// <summary>
    /// Lịch tự động đồng bộ ICD: bật/tắt + giờ chạy hằng ngày + lần chạy gần nhất.
    /// GET /api/icd/sync/settings
    /// </summary>
    [HttpGet("sync/settings")]
    public IActionResult GetSyncSettings() => Ok(_schedule.State);

    /// <summary>Request cập nhật lịch đồng bộ ICD.</summary>
    public record UpdateSyncSettingsRequest(bool Enabled, string Time);

    /// <summary>
    /// Cập nhật lịch tự động đồng bộ ICD (áp dụng ngay, không cần restart).
    /// PUT /api/icd/sync/settings — body { enabled, time: "HH:mm" }.
    /// </summary>
    [HttpPut("sync/settings")]
    public async Task<IActionResult> UpdateSyncSettingsAsync(
        [FromBody] UpdateSyncSettingsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _schedule.UpdateAsync(request.Enabled, request.Time, cancellationToken);
            return Ok(new
            {
                _schedule.State.Enabled,
                _schedule.State.Time,
                message = request.Enabled
                    ? $"Đã bật tự động lấy dữ liệu ICD hằng ngày lúc {_schedule.State.Time}."
                    : "Đã tắt tự động lấy dữ liệu ICD — vẫn đồng bộ tay được bằng nút \"Đồng bộ ngay\"."
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Đồng bộ danh mục ICD từ nguồn công bố nếu có phiên bản mới.
    /// POST /api/icd/sync?force=true để tải lại bất kể phiên bản.
    /// Tra cứu lúc validate vẫn dùng file local — endpoint này chỉ cập nhật file đó.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncAsync([FromQuery] bool force, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _syncService.SyncAsync(force, cancellationToken);
            await _schedule.RecordRunAsync(result.Message, cancellationToken);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { error = "Không kết nối được nguồn công bố ICD — dữ liệu local giữ nguyên", details = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            // Dữ liệu tải về bất thường — đã hủy, file local không bị ghi đè
            return UnprocessableEntity(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Import ICD master data from JSON files
    /// POST /api/icd/import
    /// 
    /// Request body example:
    /// {
    ///   "metadataFilePath": "docs/analysis/03_Icd_data/icd_meta.json",
    ///   "rowsFilePath": "docs/analysis/03_Icd_data/icd_rows.json"
    /// }
    /// </summary>
    /// <param name="request">Import request with file paths</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Import result with statistics</returns>
    [HttpPost("import")]
    public async Task<IActionResult> ImportAsync(
        [FromBody] IcdImportRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.MetadataFilePath) ||
            string.IsNullOrWhiteSpace(request.RowsFilePath))
        {
            return BadRequest(new { error = "Both metadataFilePath and rowsFilePath are required" });
        }

        try
        {
            _logger.LogInformation("Starting ICD import from {MetadataPath} and {RowsPath}",
                request.MetadataFilePath, request.RowsFilePath);

            var result = await _importService.ImportAsync(
                request.MetadataFilePath,
                request.RowsFilePath,
                cancellationToken);

            return Ok(new
            {
                success = result.ErrorRecords == 0,
                message = result.GetSummary(),
                statistics = new
                {
                    result.TotalRecords,
                    result.InsertedRecords,
                    result.UpdatedRecords,
                    result.SkippedRecords,
                    result.ErrorRecords,
                    Errors = result.Errors.Count > 0 ? result.Errors : null
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing ICD data");
            return StatusCode(500, new { error = "Failed to import ICD data", details = ex.Message });
        }
    }

    /// <summary>
    /// Get ICD data summary from database
    /// GET /api/icd/summary
    /// </summary>
    /// <returns>ICD database summary</returns>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummaryAsync()
    {
        try
        {
            var summary = await _importService.GetDatabaseSummaryAsync();

            return Ok(new
            {
                summary.TotalCodes,
                summary.ActiveCodes,
                summary.CancelledCodes,
                summary.PrimaryDiagnosisCodes,
                summary.GenderRestrictedCodes,
                summary.DeathOnlyCodes,
                summary.LastUpdated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ICD database summary");
            return StatusCode(500, new { error = "Failed to retrieve ICD summary", details = ex.Message });
        }
    }

    /// <summary>
    /// Get ICD provider statistics (in-memory cache)
    /// GET /api/icd/provider-stats
    /// </summary>
    /// <returns>ICD provider statistics</returns>
    [HttpGet("provider-stats")]
    public IActionResult GetProviderStats()
    {
        try
        {
            return Ok(new
            {
                totalCodes = _icdProvider.Count,
                activeCodes = _icdProvider.ActiveCount,
                lastUpdated = _icdProvider.LastUpdated
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ICD provider statistics");
            return StatusCode(500, new { error = "Failed to retrieve provider stats", details = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific ICD code details
    /// GET /api/icd/codes/{code}
    /// 
    /// Example: /api/icd/codes/A00.0
    /// </summary>
    /// <param name="code">ICD code to retrieve</param>
    /// <returns>ICD code details or 404 if not found</returns>
    [HttpGet("codes/{code}")]
    public IActionResult GetCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Code is required" });

        try
        {
            var icdCode = _icdProvider.GetByCode(code);
            if (icdCode == null)
                return NotFound(new { error = $"ICD code '{code}' not found" });

            return Ok(new
            {
                icdCode.Code,
                icdCode.Name,
                icdCode.Description,
                flags = new
                {
                    icdCode.IsCancelled,
                    canBePrimaryDiagnosis = icdCode.CanBePrimaryDiagnosis,
                    allowedGenders = icdCode.AllowedGenders,
                    isDeathOnly = icdCode.IsDeathOnly,
                    needsSpecificCode = icdCode.NeedsSpecificCode
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ICD code {Code}", code);
            return StatusCode(500, new { error = "Failed to retrieve ICD code", details = ex.Message });
        }
    }

    /// <summary>
    /// Check if an ICD code exists and is active
    /// GET /api/icd/codes/{code}/validate
    /// </summary>
    /// <param name="code">ICD code to validate</param>
    /// <returns>Validation result</returns>
    [HttpGet("codes/{code}/validate")]
    public IActionResult ValidateCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Code is required" });

        try
        {
            var exists = _icdProvider.Exists(code);
            var isActive = _icdProvider.IsActive(code);
            var canBePrimary = _icdProvider.CanBePrimaryDiagnosis(code);
            var allowedGenders = _icdProvider.GetAllowedGenders(code);
            var isDeathOnly = _icdProvider.IsDeathOnly(code);
            var needsSpecific = _icdProvider.NeedsSpecificCode(code);

            return Ok(new
            {
                code,
                exists,
                isActive,
                canBePrimaryDiagnosis = canBePrimary,
                allowedGenders = string.IsNullOrEmpty(allowedGenders) ? "No restriction" : allowedGenders,
                isDeathOnlyCode = isDeathOnly,
                needsSpecificCode = needsSpecific
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating ICD code {Code}", code);
            return StatusCode(500, new { error = "Failed to validate ICD code", details = ex.Message });
        }
    }

    /// <summary>
    /// Clear all ICD codes from database (destructive)
    /// DELETE /api/icd/all
    /// </summary>
    /// <param name="force">Set to true to confirm deletion</param>
    /// <returns>Result of deletion</returns>
    [HttpDelete("all")]
    public async Task<IActionResult> ClearAllAsync([FromQuery] bool force = false)
    {
        if (!force)
            return BadRequest(new { error = "Set force=true to confirm deletion" });

        try
        {
            _logger.LogWarning("Clearing all ICD codes from database");
            await _importService.ClearAllIcdCodesAsync();

            return Ok(new { message = "All ICD codes cleared from database" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing ICD codes");
            return StatusCode(500, new { error = "Failed to clear ICD codes", details = ex.Message });
        }
    }
}

/// <summary>
/// Request model for ICD import
/// </summary>
public class IcdImportRequest
{
    /// <summary>
    /// Path to icd_meta.json file
    /// </summary>
    public required string MetadataFilePath { get; set; }

    /// <summary>
    /// Path to icd_rows.json file
    /// </summary>
    public required string RowsFilePath { get; set; }
}
