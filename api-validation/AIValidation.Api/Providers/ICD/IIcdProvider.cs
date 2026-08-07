using AIValidation.Api.Providers.ICD.Helpers;
using AIValidation.Api.Providers.ICD.Models;

namespace AIValidation.Api.Providers.ICD;

/// <summary>
/// In-memory ICD code provider loaded from database
/// Used by ICD validation rules for efficient lookups
/// Loads all 15,000+ ICD codes into memory once and provides fast access
/// </summary>
public interface IIcdProvider
{
    /// <summary>
    /// Initialize the provider by loading all ICD codes from database into memory
    /// Should be called once at application startup or when data needs to be refreshed
    /// </summary>
    Task InitializeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get an ICD code by its code value (e.g., "A00.0")
    /// </summary>
    /// <param name="code">ICD code with decimal (e.g., "A00.0", "O80")</param>
    /// <returns>ICD code record or null if not found</returns>
    IcdCodeInfo? GetByCode(string code);

    /// <summary>
    /// Check if an ICD code exists in the catalog.
    /// Existence only: a cancelled code still exists. Use IsActive to check whether
    /// it may still be used.
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>True if code exists, whether or not it has been cancelled</returns>
    bool Exists(string code);

    /// <summary>
    /// Check if an ICD code is active (not cancelled)
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>True if code is active</returns>
    bool IsActive(string code);

    /// <summary>
    /// Check if an ICD code can be used as a primary diagnosis
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>True if code can be primary diagnosis</returns>
    bool CanBePrimaryDiagnosis(string code);

    /// <summary>
    /// Get list of allowed genders for an ICD code
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>"M" (male only), "F" (female only), "M,F" (both), or "" (no restriction)</returns>
    string GetAllowedGenders(string code);

    /// <summary>
    /// Check if an ICD code is restricted to death-only cases
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>True if code is for death only</returns>
    bool IsDeathOnly(string code);

    /// <summary>
    /// Check if an ICD code requires a specific additional code
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <returns>True if specific code is required</returns>
    bool NeedsSpecificCode(string code);

    /// <summary>
    /// Get child codes for a parent code (e.g., A05.0, A05.1 for A05)
    /// Useful for suggesting specific codes when parent code requires specificity
    /// </summary>
    /// <param name="parentCode">Parent ICD code without decimal</param>
    /// <returns>List of child code information objects</returns>
    IEnumerable<IcdCodeInfo> GetChildCodes(string parentCode);

    /// <summary>
    /// Check if ICD code is compatible with patient gender
    /// Returns true if:
    /// - ICD has no gender restriction, OR
    /// - Patient gender matches ICD allowed gender
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <param name="patientGender">0=Male, 1=Female, -1=Unknown/Not specified</param>
    /// <returns>True if compatible or no restriction, false if incompatible</returns>
    bool IsGenderCompatible(string code, int patientGender);

    /// <summary>
    /// Check if ICD code is compatible with patient age
    /// Returns true if:
    /// - ICD has no age restriction, OR
    /// - Patient age is within ICD allowed age range
    /// </summary>
    /// <param name="code">ICD code to check</param>
    /// <param name="patientAge">Patient age in years, or -1 if unknown</param>
    /// <returns>True if compatible or no restriction, false if incompatible</returns>
    bool IsAgeCompatible(string code, int patientAge);

    /// <summary>
    /// Get age restriction range for an ICD code
    /// Returns tuple (min_age, max_age) or (-1, -1) if no restriction
    /// </summary>
    (int MinAge, int MaxAge) GetAgeRestriction(string code);

    /// <summary>
    /// Get total count of loaded ICD codes
    /// </summary>
    int Count { get; }

    /// <summary>
    /// Get last update time
    /// </summary>
    DateTime LastUpdated { get; }

    /// <summary>
    /// Get count of active codes
    /// </summary>
    int ActiveCount { get; }
}

/// <summary>
/// In-memory representation of an ICD code
/// Loaded from KnowledgeItem with decoded flags in metadata
/// </summary>
public class IcdCodeInfo
{
    /// <summary>
    /// ICD code with decimal (e.g., "A00.0")
    /// </summary>
    public required string Code { get; set; }

    /// <summary>
    /// Vietnamese description
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// English description and additional details
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Raw bitmask value for fallback decoding
    /// </summary>
    public int Flags { get; set; }

    /// <summary>
    /// Decoded flags for validation
    /// </summary>
    public IcdDecodedFlags? DecodedFlags { get; set; }

    /// <summary>
    /// Metadata from KnowledgeItem (contains decoded flags and precomputed values)
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// Quick access: Is code cancelled/inactive
    /// </summary>
    public bool IsCancelled => DecodedFlags?.IsCancelled ?? false;

    /// <summary>
    /// Quick access: Can code be primary diagnosis
    /// </summary>
    public bool CanBePrimaryDiagnosis => DecodedFlags is not null && IcdBitmaskHelper.CanBePrimaryDiagnosis(DecodedFlags);

    /// <summary>
    /// Quick access: Allowed genders
    /// </summary>
    public string AllowedGenders => DecodedFlags is not null ? IcdBitmaskHelper.GetAllowedGenders(DecodedFlags) : "";

    /// <summary>
    /// Quick access: Is death only
    /// </summary>
    public bool IsDeathOnly => DecodedFlags?.IsDeathOnly ?? false;

    /// <summary>
    /// Quick access: Needs specific code
    /// </summary>
    public bool NeedsSpecificCode => DecodedFlags?.NeedsSpecificCode ?? false;

    /// <summary>
    /// Quick access: Has dagger symbol (†) - secondary diagnosis only
    /// </summary>
    public bool HasDaggerSymbol => DecodedFlags?.HasDaggerSymbol ?? false;
}
