using System.Diagnostics;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using AIValidation.Api.Providers.ICD.Helpers;
using AIValidation.Api.Providers.ICD.Interfaces;
using AIValidation.Api.Providers.ICD.Parsers;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Providers.ICD.Services;

/// <summary>
/// ICD import service implementation
/// Imports ICD master data from JSON files into the database
/// Uses idempotent upsert to avoid duplicates and maintain consistency
/// </summary>
public class IcdImportService : IIcdImportService
{
    private readonly AppDbContext _context;
    private readonly ILogger<IcdImportService> _logger;
    private readonly IcdJsonParser _parser;

    public IcdImportService(AppDbContext context, ILogger<IcdImportService> logger, IcdJsonParser parser)
    {
        _context = context;
        _logger = logger;
        _parser = parser;
    }

    /// <summary>
    /// Import ICD master data from JSON files into database
    /// Idempotent: Can be called multiple times without creating duplicates
    /// Uses database transactions for consistency
    /// </summary>
    public async Task<IcdImportResult> ImportAsync(string metadataFilePath, string rowsFilePath,
        CancellationToken cancellationToken = default)
    {
        var result = new IcdImportResult();
        var startTime = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Starting ICD import from {MetadataPath} and {RowsPath}",
                metadataFilePath, rowsFilePath);

            // Parse metadata first
            var metadata = await _parser.ParseMetadataAsync(metadataFilePath);
            if (metadata == null)
            {
                _logger.LogWarning("Failed to parse ICD metadata, proceeding with row import only");
            }

            // Create a transaction for consistency
            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Import rows
                await ImportRowsAsync(rowsFilePath, result, cancellationToken);

                // Commit transaction
                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation("ICD import completed successfully in {Duration}ms",
                    startTime.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "ICD import transaction rolled back due to error");
                throw;
            }
        }
        catch (Exception ex)
        {
            result.ErrorRecords++;
            result.Errors.Add($"Import failed: {ex.Message}");
            _logger.LogError(ex, "ICD import failed");
        }
        finally
        {
            startTime.Stop();
            result.Duration = startTime.Elapsed;
        }

        _logger.LogInformation(result.GetSummary());
        return result;
    }

    /// <summary>
    /// Get summary of ICD codes currently in database
    /// </summary>
    public async Task<IcdDatabaseSummary> GetDatabaseSummaryAsync()
    {
        var activeIcdCodes = await _context.KnowledgeItems
            .Where(k => k.Category == "ICD" && k.IsActive)
            .ToListAsync();

        var summary = new IcdDatabaseSummary
        {
            LastUpdated = DateTime.UtcNow
        };

        foreach (var code in activeIcdCodes)
        {
            summary.TotalCodes++;

            // Try to decode flags from metadata if present
            if (code.Metadata != null && code.Metadata.TryGetValue("flags", out var flagsObj))
            {
                if (int.TryParse(flagsObj.ToString(), out int flags))
                {
                    var decodedFlags = IcdBitmaskHelper.DecodeBitmask(flags);

                    if (!decodedFlags.IsCancelled)
                        summary.ActiveCodes++;
                    else
                        summary.CancelledCodes++;

                    if (IcdBitmaskHelper.CanBePrimaryDiagnosis(decodedFlags))
                        summary.PrimaryDiagnosisCodes++;

                    if (IcdBitmaskHelper.HasGenderRestriction(decodedFlags))
                        summary.GenderRestrictedCodes++;

                    if (decodedFlags.IsDeathOnly)
                        summary.DeathOnlyCodes++;
                }
            }
        }

        return summary;
    }

    /// <summary>
    /// Clear all ICD codes from database
    /// Warning: This is a destructive operation
    /// </summary>
    public async Task ClearAllIcdCodesAsync()
    {
        _logger.LogWarning("Clearing all ICD codes from database");

        var icdCodes = await _context.KnowledgeItems
            .Where(k => k.Category == "ICD")
            .ToListAsync();

        _context.KnowledgeItems.RemoveRange(icdCodes);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cleared {Count} ICD codes from database", icdCodes.Count);
    }

    /// <summary>
    /// Import rows from ICD JSON file
    /// Uses idempotent upsert: updates existing codes, inserts new ones
    /// </summary>
    private async Task ImportRowsAsync(string rowsFilePath, IcdImportResult result,
        CancellationToken cancellationToken)
    {
        // Get existing ICD codes for deduplication
        var existingCodes = await _context.KnowledgeItems
            .Where(k => k.Category == "ICD")
            .ToDictionaryAsync(k => k.Code, cancellationToken);

        _logger.LogInformation("Found {ExistingCount} existing ICD codes in database",
            existingCodes.Count);

        // Process rows
        await foreach (var row in _parser.ParseRowsAsync(rowsFilePath).WithCancellation(cancellationToken))
        {
            result.TotalRecords++;

            try
            {
                if (string.IsNullOrWhiteSpace(row.CodeWithDecimal))
                {
                    result.SkippedRecords++;
                    continue;
                }

                var code = row.CodeWithDecimal;
                var name = row.DescriptionVi ?? row.DescriptionEn ?? "Unknown";
                var content = BuildContent(row);
                var metadata = BuildMetadata(row);

                if (existingCodes.TryGetValue(code, out var existing))
                {
                    // Update existing code
                    if (existing.Name != name || existing.Content != content)
                    {
                        existing.Name = name;
                        existing.Content = content;
                        existing.Metadata = metadata;
                        existing.UpdatedAt = DateTime.UtcNow;
                        _context.KnowledgeItems.Update(existing);
                        result.UpdatedRecords++;
                    }
                    else
                    {
                        result.SkippedRecords++;
                    }
                }
                else
                {
                    // Insert new code
                    var knowledgeItem = new KnowledgeItem
                    {
                        Category = "ICD",
                        Code = code,
                        Name = name,
                        Content = content,
                        IsActive = !row.DecodedFlags?.IsCancelled ?? true,
                        Metadata = metadata,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.KnowledgeItems.Add(knowledgeItem);
                    result.InsertedRecords++;
                }
            }
            catch (Exception ex)
            {
                result.ErrorRecords++;
                result.Errors.Add($"Error processing row {row.CodeWithDecimal}: {ex.Message}");
                _logger.LogWarning(ex, "Error processing ICD row {Code}", row.CodeWithDecimal);
            }
        }

        // Save all changes
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Build content string from ICD row
    /// </summary>
    private string BuildContent(Models.IcdCodeRecord row)
    {
        var lines = new List<string>();

        if (!string.IsNullOrWhiteSpace(row.DescriptionEn))
            lines.Add($"English: {row.DescriptionEn}");

        if (!string.IsNullOrWhiteSpace(row.ParentDescription))
            lines.Add($"Parent: {row.ParentDescription}");

        if (!string.IsNullOrWhiteSpace(row.Notes))
            lines.Add($"Notes: {row.Notes}");

        if (!string.IsNullOrWhiteSpace(row.Category))
            lines.Add($"Category: {row.Category}");

        if (!string.IsNullOrWhiteSpace(row.SubCategory))
            lines.Add($"SubCategory: {row.SubCategory}");

        return string.Join("\n", lines);
    }

    /// <summary>
    /// Build metadata dictionary from ICD row
    /// Stores all decoded flags and additional information for validation rules
    /// Note: Npgsql with .NET 10 has issues with Dictionary&lt;string, object&gt; in JSONB fields,
    /// so we serialize to JSON string and let EF Core handle the conversion
    /// </summary>
    private Dictionary<string, object> BuildMetadata(Models.IcdCodeRecord row)
    {
        var metadata = new Dictionary<string, object>();

        // Store raw code information
        if (!string.IsNullOrWhiteSpace(row.CodeWithoutDecimal))
            metadata["codeWithoutDecimal"] = row.CodeWithoutDecimal;

        if (!string.IsNullOrWhiteSpace(row.ParentCode))
            metadata["parentCode"] = row.ParentCode;

        // Store bitmask
        metadata["flags"] = row.Flags;

        // Store decoded flags for easy access in validation rules
        if (row.DecodedFlags != null)
        {
            metadata["isCancelled"] = row.DecodedFlags.IsCancelled;
            metadata["isNewCode"] = row.DecodedFlags.IsNewCode;
            metadata["isNotMain"] = row.DecodedFlags.IsNotMain;
            metadata["isNotRecommendedMain"] = row.DecodedFlags.IsNotRecommendedMain;
            metadata["needsSpecificCode"] = row.DecodedFlags.NeedsSpecificCode;
            metadata["isDeathOnly"] = row.DecodedFlags.IsDeathOnly;
            metadata["isFemaleOnly"] = row.DecodedFlags.IsFemaleOnly;
            metadata["isMaleOnly"] = row.DecodedFlags.IsMaleOnly;
            metadata["hasDaggerSymbol"] = row.DecodedFlags.HasDaggerSymbol;
            metadata["hasAsteriskSymbol"] = row.DecodedFlags.HasAsteriskSymbol;

            // Compute and store common validation properties
            metadata["isActive"] = IcdBitmaskHelper.IsActive(row.DecodedFlags);
            metadata["canBePrimaryDiagnosis"] = IcdBitmaskHelper.CanBePrimaryDiagnosis(row.DecodedFlags);
            metadata["allowedGenders"] = IcdBitmaskHelper.GetAllowedGenders(row.DecodedFlags);
        }

        return metadata;
    }
}
