using AIValidation.Api.Data.Repositories.Interfaces;
using AIValidation.Api.Providers.ICD.Helpers;

namespace AIValidation.Api.Providers.ICD;

/// <summary>
/// Implementation of in-memory ICD provider
/// Loads all ICD codes from database and JSON files into memory for fast lookups
/// </summary>
public class IcdProvider : IIcdProvider
{
    private readonly IKnowledgeRepository _repository;
    private readonly ILogger<IcdProvider> _logger;
    private readonly string _icdJsonPath;

    private Dictionary<string, IcdCodeInfo> _codes = new();
    private DateTime _lastUpdated = DateTime.MinValue;
    private bool _initialized = false;
    private readonly object _lock = new();

    public int Count => _codes.Count;
    public DateTime LastUpdated => _lastUpdated;
    public int ActiveCount => _codes.Values.Count(c => !c.IsCancelled);

    public IcdProvider(IKnowledgeRepository repository, ILogger<IcdProvider> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // Default path to ICD data JSON file (shared with IcdSyncService)
        _icdJsonPath = IcdDataPaths.IcdRowsPath;
    }

    /// <summary>
    /// Initialize provider by loading all ICD codes from JSON file
    /// Database is used as fallback (queried on-demand if code not found in JSON)
    /// This allows adding new ICD codes to DB without restarting server
    /// </summary>
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Initializing ICD provider from JSON file only (DB will be queried on-demand)");

            var startTime = DateTime.UtcNow;
            _codes.Clear();

            // Load from JSON file as primary source
            var jsonCodes = IcdJsonDataHelper.LoadIcdFromJson(_icdJsonPath, _logger);
            foreach (var kvp in jsonCodes)
            {
                _codes[kvp.Key] = kvp.Value;
            }

            _lastUpdated = DateTime.UtcNow;

            _logger.LogInformation(
                "ICD provider initialized with {Count} codes from JSON file in {Duration}ms. DB will be queried on-demand for missing codes.",
                _codes.Count, (DateTime.UtcNow - startTime).TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize ICD provider");
            throw;
        }
    }

    /// <summary>
    /// Get an ICD code by its code value
    /// First checks JSON cache, then queries database if not found
    /// </summary>
    public IcdCodeInfo? GetByCode(string code)
    {
        EnsureInitializedSync();

        if (string.IsNullOrWhiteSpace(code))
        {
            _logger.LogDebug("GetByCode called with null/empty code");
            return null;
        }

        // Trim whitespace for consistent lookup
        var trimmedCode = code.Trim();

        // Try to get from JSON cache first
        if (_codes.TryGetValue(trimmedCode, out var codeInfo))
        {
            _logger.LogDebug("GetByCode: Found code '{Code}' in JSON cache: {Name}", trimmedCode, codeInfo?.Name);
            return codeInfo;
        }

        // Not found in JSON cache, try database
        _logger.LogDebug("GetByCode: Code '{Code}' not found in JSON cache, querying database", trimmedCode);
        return GetByCodeFromDatabase(trimmedCode);
    }

    /// <summary>
    /// Query database for ICD code (fallback if not found in JSON)
    /// </summary>
    private IcdCodeInfo? GetByCodeFromDatabase(string code)
    {
        try
        {
            // Use async-to-sync bridge for this database query
            var icdItem = _repository.GetIcdByCodeAsync(code, CancellationToken.None).Result;

            if (icdItem == null)
            {
                _logger.LogDebug("GetByCodeFromDatabase: Code '{Code}' not found in database either", code);
                return null;
            }

            // Convert DB item to IcdCodeInfo
            var codeInfo = new IcdCodeInfo
            {
                Code = icdItem.Code,
                Name = icdItem.Name,
                Description = icdItem.Content,
                Metadata = icdItem.Metadata
            };

            // Load decoded flags from metadata if present
            if (icdItem.Metadata != null && icdItem.Metadata.TryGetValue("flags", out var flagsObj))
            {
                if (int.TryParse(flagsObj.ToString(), out int flags))
                {
                    codeInfo.Flags = flags;
                    codeInfo.DecodedFlags = IcdBitmaskHelper.DecodeBitmask(flags);
                }
            }

            _logger.LogDebug("GetByCodeFromDatabase: Found code '{Code}' in database: {Name}", code, codeInfo.Name);

            // Optional: Cache it for next time
            _codes[code] = codeInfo;

            return codeInfo;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error querying database for ICD code {Code}", code);
            return null;
        }
    }

    /// <summary>
    /// Check if an ICD code exists in the catalog.
    /// Existence only - a cancelled code still exists, and is reported by IcdActiveRule
    /// (ICD_CANCELLED) rather than by IcdExistsRule (ICD_NOT_FOUND).
    /// </summary>
    public bool Exists(string code)
    {
        EnsureInitializedSync();

        if (string.IsNullOrWhiteSpace(code))
            return false;

        return GetByCode(code) != null;
    }

    /// <summary>
    /// Check if an ICD code is active (not cancelled)
    /// </summary>
    public bool IsActive(string code)
    {
        EnsureInitializedSync();

        var codeInfo = GetByCode(code);
        if (codeInfo is null)
            return false;

        // Codes with no decoded flags are treated as active, matching IcdCodeInfo.IsCancelled.
        return !codeInfo.IsCancelled;
    }

    /// <summary>
    /// Check if an ICD code can be used as a primary diagnosis
    /// </summary>
    public bool CanBePrimaryDiagnosis(string code)
    {
        EnsureInitializedSync();

        var codeInfo = GetByCode(code);
        if (codeInfo?.DecodedFlags is null)
            return false;

        return IcdBitmaskHelper.CanBePrimaryDiagnosis(codeInfo.DecodedFlags);
    }

    /// <summary>
    /// Get allowed genders for an ICD code
    /// </summary>
    public string GetAllowedGenders(string code)
    {
        EnsureInitializedSync();

        var codeInfo = GetByCode(code);
        if (codeInfo?.DecodedFlags is null)
            return "";

        return IcdBitmaskHelper.GetAllowedGenders(codeInfo.DecodedFlags);
    }

    /// <summary>
    /// Check if an ICD code is death-only
    /// </summary>
    public bool IsDeathOnly(string code)
    {
        EnsureInitializedSync();

        var codeInfo = GetByCode(code);
        return codeInfo?.IsDeathOnly ?? false;
    }

    /// <summary>
    /// Check if an ICD code requires specific additional code
     /// </summary>
     public bool NeedsSpecificCode(string code)
     {
         EnsureInitializedSync();

         var codeInfo = GetByCode(code);
         return codeInfo?.NeedsSpecificCode ?? false;
     }

     /// <summary>
     /// Get child codes for a parent code (e.g., A05.0, A05.1 for A05)
     /// </summary>
     public IEnumerable<IcdCodeInfo> GetChildCodes(string parentCode)
     {
         EnsureInitializedSync();

         if (string.IsNullOrWhiteSpace(parentCode))
             return Enumerable.Empty<IcdCodeInfo>();

         var trimmedCode = parentCode.Trim();

         // Find all codes that start with the parent code + "."
         return _codes.Values
             .Where(c => c.Code.StartsWith(trimmedCode + ".") && !c.IsCancelled)
             .OrderBy(c => c.Code)
             .ToList();
     }

     /// <summary>
     /// Check if ICD code is compatible with patient gender
    /// Returns true if:
    /// - ICD has no gender restriction, OR
    /// - Patient gender matches ICD allowed gender
    /// Returns false if gender restriction not met
    /// </summary>
    /// <param name="code">ICD code</param>
    /// <param name="patientGender">0=Male, 1=Female, -1=Unknown/Not specified</param>
    /// <returns>true if compatible or no restriction, false if incompatible</returns>
    public bool IsGenderCompatible(string code, int patientGender)
    {
        EnsureInitializedSync();

        if (patientGender < 0) // Gender not specified
            return true; // No restriction check

        var codeInfo = GetByCode(code);
        if (codeInfo?.DecodedFlags is null)
            return true; // No gender restriction info

        var allowedGenders = IcdBitmaskHelper.GetAllowedGenders(codeInfo.DecodedFlags);

        // No restriction
        if (string.IsNullOrEmpty(allowedGenders))
            return true;

        // Check if patient gender matches ICD restrictions
        // patientGender: 0=Male, 1=Female
        // allowedGenders: "M" (male only), "F" (female only), "M,F" (both - shouldn't happen)
        if (allowedGenders == "M" && patientGender == 0) return true; // Male ICD, male patient
        if (allowedGenders == "F" && patientGender == 1) return true; // Female ICD, female patient

        return false; // Gender mismatch
    }

    /// <summary>
    /// Get patient gender as integer
    /// Tries multiple field names: gioitinh, cbgioitinh
    /// Returns: 0=Male, 1=Female, -1=Unknown
    /// </summary>
    public static int ExtractPatientGender(System.Text.Json.JsonElement form)
    {
        try
        {
            if (form.ValueKind != System.Text.Json.JsonValueKind.Object)
                return -1;

            // Quy ước THẬT trên form HIS (đã xác nhận với DOM thực tế):
            // - gioitinh:   "1"/1 = Nam, "0"/0 = Nữ
            // - cbgioitinh: true/"true" = Nam, false/"false" = Nữ
            // Extension gửi form value dạng CHUỖI nên phải đọc cả String lẫn Number/Boolean.
            // Giá trị trả về theo quy ước của IIcdProvider: 0=Male, 1=Female, -1=Unknown.

            if (form.TryGetProperty("gioitinh", out var gioitinhProp))
            {
                var raw = ReadAsString(gioitinhProp);
                if (raw == "1") return 0; // Nam
                if (raw == "0") return 1; // Nữ
            }

            if (form.TryGetProperty("cbgioitinh", out var cbgioitinhProp))
            {
                var raw = ReadAsString(cbgioitinhProp)?.ToLowerInvariant();
                if (raw == "true") return 0;  // Nam
                if (raw == "false") return 1; // Nữ
            }

            return -1; // Unknown
        }
        catch
        {
            return -1;
        }
    }

    /// <summary>Đọc giá trị JSON về chuỗi bất kể client gửi String, Number hay Boolean.</summary>
    private static string? ReadAsString(System.Text.Json.JsonElement element)
    {
        return element.ValueKind switch
        {
            System.Text.Json.JsonValueKind.String => element.GetString()?.Trim(),
            System.Text.Json.JsonValueKind.Number => element.GetRawText(),
            System.Text.Json.JsonValueKind.True => "true",
            System.Text.Json.JsonValueKind.False => "false",
            _ => null
        };
    }

    /// <summary>
    /// Get patient age from form
    /// Tries multiple field names: tuoi, namsinh (dd/mm/yyyy)
    /// Returns age in years, or -1 if cannot determine
    /// </summary>
    public static int ExtractPatientAge(System.Text.Json.JsonElement form)
    {
        try
        {
            if (form.ValueKind != System.Text.Json.JsonValueKind.Object)
                return -1;

            // Try "tuoi" field (direct age) — extension gửi dạng chuỗi nên đọc cả String lẫn Number
            if (form.TryGetProperty("tuoi", out var tuoiProp))
            {
                var raw = ReadAsString(tuoiProp);
                if (int.TryParse(raw, out var age) && age >= 0 && age <= 150)
                    return age;
            }

            // Try "namsinh" field (dd/mm/yyyy format)
            if (form.TryGetProperty("namsinh", out var namsinhProp))
            {
                if (namsinhProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    string dateStr = namsinhProp.GetString();
                    if (!string.IsNullOrWhiteSpace(dateStr))
                    {
                        // Try to parse dd/mm/yyyy
                        if (DateTime.TryParseExact(dateStr, "dd/MM/yyyy", 
                            System.Globalization.CultureInfo.InvariantCulture, 
                            System.Globalization.DateTimeStyles.None, out var birthDate))
                        {
                            int age = DateTime.Now.Year - birthDate.Year;
                            // Adjust if birthday hasn't occurred this year
                            if (birthDate.Month > DateTime.Now.Month || 
                                (birthDate.Month == DateTime.Now.Month && birthDate.Day > DateTime.Now.Day))
                                age--;

                            if (age >= 0 && age <= 150)
                                return age;
                        }
                    }
                }
            }

            return -1; // Cannot determine age
        }
        catch
        {
            return -1;
        }
    }

    /// <summary>
    /// Check if ICD code is compatible with patient age
    /// Returns true if:
    /// - ICD has no age restriction, OR
    /// - Patient age is within ICD allowed age range
    /// Returns false if age restriction not met
    /// 
    /// TODO: Age restriction data needs to be added to ICD metadata in database
    /// For now, this always returns true as placeholder
    /// </summary>
    /// <param name="code">ICD code</param>
    /// <param name="patientAge">Patient age in years, or -1 if unknown</param>
    /// <returns>true if compatible or no restriction, false if incompatible</returns>
    public bool IsAgeCompatible(string code, int patientAge)
    {
        EnsureInitializedSync();

        if (patientAge < 0) // Age not specified
            return true; // No restriction check

        var codeInfo = GetByCode(code);
        if (codeInfo?.Metadata is null)
            return true; // No age restriction data available

        // Try to get age restrictions from metadata
        // Format to be defined: e.g., {"min_age": 18, "max_age": 65} or {"age_group": "pediatric"}
        if (codeInfo.Metadata.TryGetValue("min_age", out var minAgeObj) &&
            codeInfo.Metadata.TryGetValue("max_age", out var maxAgeObj))
        {
            if (int.TryParse(minAgeObj.ToString(), out int minAge) &&
                int.TryParse(maxAgeObj.ToString(), out int maxAge))
            {
                _logger.LogDebug("ICD {Code} age restriction: {MinAge}-{MaxAge}, patient age: {PatientAge}",
                    code, minAge, maxAge, patientAge);

                return patientAge >= minAge && patientAge <= maxAge;
            }
        }

        // No age restriction info in metadata
        return true;
    }

    /// <summary>
    /// Get age restriction range for an ICD code
    /// Returns tuple (min_age, max_age) or (-1, -1) if no restriction
    /// </summary>
    public (int MinAge, int MaxAge) GetAgeRestriction(string code)
    {
        EnsureInitializedSync();

        var codeInfo = GetByCode(code);
        if (codeInfo?.Metadata is null)
            return (-1, -1);

        if (codeInfo.Metadata.TryGetValue("min_age", out var minAgeObj) &&
            codeInfo.Metadata.TryGetValue("max_age", out var maxAgeObj))
        {
            if (int.TryParse(minAgeObj.ToString(), out int minAge) &&
                int.TryParse(maxAgeObj.ToString(), out int maxAge))
            {
                return (minAge, maxAge);
            }
        }

        return (-1, -1); // No restriction
    }

    /// <summary>
    /// Ensure provider is initialized (lazy initialization with double-check locking)
    /// </summary>
    private async Task EnsureInitializedAsync()
    {
        if (_initialized)
            return;

        lock (_lock)
        {
            if (_initialized)
                return;

            // Mark as initializing to prevent multiple concurrent initialization attempts
            _initialized = true;
        }

        // Perform async initialization outside the lock
        try
        {
            _logger.LogInformation("Lazy-initializing ICD provider from JSON file only (DB will be queried on-demand)");
            var startTime = DateTime.UtcNow;
            _codes.Clear();

            // Load from JSON file as primary source
            var jsonCodes = IcdJsonDataHelper.LoadIcdFromJson(_icdJsonPath, _logger);
            foreach (var kvp in jsonCodes)
            {
                _codes[kvp.Key] = kvp.Value;
            }

            _lastUpdated = DateTime.UtcNow;

            _logger.LogInformation(
                "ICD provider lazy-initialized with {Count} codes from JSON file in {Duration}ms. DB will be queried on-demand for missing codes.",
                _codes.Count, (DateTime.UtcNow - startTime).TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to lazy-initialize ICD provider");
            // Don't throw - let requests fail gracefully if provider is empty
        }
    }

    /// <summary>
    /// Ensure provider is initialized synchronously
    /// This is a workaround for the async initialization issue
    /// Should not be used in hot paths
    /// </summary>
    private void EnsureInitializedSync()
    {
        if (_initialized)
        {
            _logger.LogDebug("EnsureInitializedSync: Already initialized, skipping");
            return;
        }

        lock (_lock)
        {
            if (_initialized)
            {
                _logger.LogDebug("EnsureInitializedSync: Another thread initialized, skipping");
                return;
            }

            _initialized = true;
        }

        // Run async initialization synchronously - only for non-async contexts
        // This will block the calling thread
        try
        {
            _logger.LogInformation("EnsureInitializedSync: Starting lazy-initialization of ICD provider from database and JSON");
            var startTime = DateTime.UtcNow;
            _codes.Clear();

            // First, load from JSON file as primary source
            _logger.LogInformation("EnsureInitializedSync: Loading ICD data from JSON file...");
            var jsonCodes = IcdJsonDataHelper.LoadIcdFromJson(_icdJsonPath, _logger);
            foreach (var kvp in jsonCodes)
            {
                _codes[kvp.Key] = kvp.Value;
            }

            _lastUpdated = DateTime.UtcNow;

            _logger.LogInformation(
                "EnsureInitializedSync: ICD provider lazy-initialized with {Count} codes from JSON file in {Duration}ms. DB will be queried on-demand for missing codes.",
                _codes.Count, (DateTime.UtcNow - startTime).TotalMilliseconds);

            // Log sample of loaded codes for debugging
            var codeSample = string.Join(", ", _codes.Keys.Take(10).OrderBy(k => k));
            _logger.LogInformation("EnsureInitializedSync: Sample of loaded codes: {Sample}", codeSample);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EnsureInitializedSync: Failed to lazy-initialize ICD provider");
            _initialized = false; // Allow retry on next attempt
        }
    }
}
