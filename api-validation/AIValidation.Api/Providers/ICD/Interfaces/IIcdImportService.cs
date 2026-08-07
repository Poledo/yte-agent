namespace AIValidation.Api.Providers.ICD.Interfaces;

/// <summary>
/// Service for importing and managing ICD master data
/// Handles loading ICD codes from JSON files and synchronizing with database
/// </summary>
public interface IIcdImportService
{
    /// <summary>
    /// Import ICD master data from JSON files into database
    /// This method is idempotent - can be called multiple times without creating duplicates
    /// </summary>
    /// <param name="metadataFilePath">Path to icd_meta.json</param>
    /// <param name="rowsFilePath">Path to icd_rows.json</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Summary of import operation (inserted, updated, skipped, errors)</returns>
    Task<IcdImportResult> ImportAsync(string metadataFilePath, string rowsFilePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get summary of ICD codes currently in database
    /// </summary>
    /// <returns>Count of ICD codes by type</returns>
    Task<IcdDatabaseSummary> GetDatabaseSummaryAsync();

    /// <summary>
    /// Clear all ICD codes from database
    /// Warning: This is destructive operation
    /// </summary>
    Task ClearAllIcdCodesAsync();
}

/// <summary>
/// Result of an import operation
/// </summary>
public class IcdImportResult
{
    /// <summary>
    /// Total records processed
    /// </summary>
    public int TotalRecords { get; set; }

    /// <summary>
    /// Number of new ICD codes inserted
    /// </summary>
    public int InsertedRecords { get; set; }

    /// <summary>
    /// Number of existing ICD codes updated
    /// </summary>
    public int UpdatedRecords { get; set; }

    /// <summary>
    /// Number of records skipped (no changes needed)
    /// </summary>
    public int SkippedRecords { get; set; }

    /// <summary>
    /// Number of records with errors
    /// </summary>
    public int ErrorRecords { get; set; }

    /// <summary>
    /// List of errors encountered
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Time taken for import operation
    /// </summary>
    public TimeSpan Duration { get; set; }

    /// <summary>
    /// User-friendly summary message
    /// </summary>
    public string GetSummary()
    {
        return $"Import completed in {Duration.TotalSeconds:F2}s: " +
               $"Inserted={InsertedRecords}, Updated={UpdatedRecords}, " +
               $"Skipped={SkippedRecords}, Errors={ErrorRecords}, " +
               $"Total={TotalRecords}";
    }
}

/// <summary>
/// Summary of ICD codes in database
/// </summary>
public class IcdDatabaseSummary
{
    /// <summary>
    /// Total ICD codes in database
    /// </summary>
    public int TotalCodes { get; set; }

    /// <summary>
    /// Number of active (not cancelled) ICD codes
    /// </summary>
    public int ActiveCodes { get; set; }

    /// <summary>
    /// Number of cancelled ICD codes
    /// </summary>
    public int CancelledCodes { get; set; }

    /// <summary>
    /// Number of codes that can be primary diagnosis
    /// </summary>
    public int PrimaryDiagnosisCodes { get; set; }

    /// <summary>
    /// Number of codes with gender restrictions
    /// </summary>
    public int GenderRestrictedCodes { get; set; }

    /// <summary>
    /// Number of death-only codes
    /// </summary>
    public int DeathOnlyCodes { get; set; }

    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTime LastUpdated { get; set; }
}
