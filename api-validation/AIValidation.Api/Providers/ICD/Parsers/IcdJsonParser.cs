using System.Text.Json;
using AIValidation.Api.Providers.ICD.Helpers;
using AIValidation.Api.Providers.ICD.Models;

namespace AIValidation.Api.Providers.ICD.Parsers;

/// <summary>
/// Parser for ICD master data JSON files
/// Handles icd_meta.json and icd_rows.json in compact array format
/// </summary>
public class IcdJsonParser
{
    private readonly ILogger<IcdJsonParser> _logger;

    public IcdJsonParser(ILogger<IcdJsonParser> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Parse icd_meta.json file
    /// </summary>
    /// <param name="filePath">Path to icd_meta.json</param>
    /// <returns>Parsed metadata, or null if parsing fails</returns>
    public async Task<IcdMetadata?> ParseMetadataAsync(string filePath)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                _logger.LogWarning("ICD metadata file not found: {FilePath}", filePath);
                return null;
            }

            var content = await File.ReadAllTextAsync(filePath);
            var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var metadata = new IcdMetadata
            {
                Version = root.TryGetProperty("version", out var version) ? version.GetString() : null,
                SourceFile = root.TryGetProperty("source_file", out var sourceFile) ? sourceFile.GetString() : null,
                Source = root.TryGetProperty("source", out var source) ? source.GetString() : null,
                PerformanceNote = root.TryGetProperty("performance_note", out var note) ? note.GetString() : null,
                Bits = ParseBitmaskDefinitions(root)
            };

            // Parse statistics
            if (root.TryGetProperty("counts", out var counts))
            {
                metadata.Counts = new IcdStatistics
                {
                    OfficialCatalogRecords = GetIntProperty(counts, "official_catalog_records"),
                    UniqueCodeKeys = GetIntProperty(counts, "unique_code_keys"),
                    CancelledPl4 = GetIntProperty(counts, "cancelled_pl4"),
                    NewPl5 = GetIntProperty(counts, "new_pl5"),
                    DrugChemicalPl3 = GetIntProperty(counts, "drug_chemical_pl3"),
                    NotMain = GetIntProperty(counts, "notMain"),
                    NotRecommendedMain = GetIntProperty(counts, "notRecommendedMain"),
                    NeedSpecific = GetIntProperty(counts, "needSpecific"),
                    DeathOnly = GetIntProperty(counts, "deathOnly"),
                    FemaleOnly = GetIntProperty(counts, "femaleOnly"),
                    MaleOnly = GetIntProperty(counts, "maleOnly"),
                    Dagger = GetIntProperty(counts, "dagger"),
                    Star = GetIntProperty(counts, "star"),
                    NewCodeInCatalog = GetIntProperty(counts, "newCode_in_catalog")
                };
            }

            _logger.LogInformation("Successfully parsed ICD metadata. Version: {Version}, Total records: {Records}",
                metadata.Version, metadata.Counts?.OfficialCatalogRecords);

            return metadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing ICD metadata file: {FilePath}", filePath);
            return null;
        }
    }

    /// <summary>
    /// Parse icd_rows.json file - large file with 15k+ ICD codes
    /// Data is in compact array format for performance
    /// Returns IEnumerable for memory efficiency (can be processed line by line)
    /// </summary>
    /// <param name="filePath">Path to icd_rows.json</param>
    /// <returns>Enumerable of parsed ICD records</returns>
    public async IAsyncEnumerable<IcdCodeRecord> ParseRowsAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("ICD rows file not found: {FilePath}", filePath);
            yield break;
        }

        var records = new List<IcdCodeRecord>();

        try
        {
            var content = await File.ReadAllTextAsync(filePath);
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Array)
            {
                _logger.LogError("ICD rows file root is not an array");
                yield break;
            }

            foreach (var row in root.EnumerateArray())
            {
                if (row.ValueKind != JsonValueKind.Array)
                    continue;

                var elements = row.EnumerateArray().ToList();
                if (elements.Count < 10)
                    continue; // Skip incomplete rows

                var record = new IcdCodeRecord
                {
                    CodeWithDecimal = GetStringValue(elements, 0),
                    CodeWithoutDecimal = GetStringValue(elements, 1),
                    DescriptionVi = GetStringValue(elements, 2),
                    DescriptionEn = GetStringValue(elements, 3),
                    Notes = GetStringValue(elements, 4),
                    Category = GetStringValue(elements, 5),
                    SubCategory = GetStringValue(elements, 6),
                    ParentCode = GetStringValue(elements, 7),
                    ParentDescription = GetStringValue(elements, 8),
                    Flags = GetIntValue(elements, 9)
                };

                // Decode the bitmask
                record.DecodedFlags = IcdBitmaskHelper.DecodeBitmask(record.Flags);

                records.Add(record);
            }

            _logger.LogInformation("Successfully parsed {RecordCount} ICD codes from {FilePath}", records.Count, filePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing ICD rows file: {FilePath}", filePath);
            yield break;
        }

        // Yield all records after successful parsing
        foreach (var record in records)
        {
            yield return record;
        }
    }

    /// <summary>
    /// Parse bitmask definitions from metadata
    /// </summary>
    private Dictionary<string, int>? ParseBitmaskDefinitions(JsonElement root)
    {
        if (!root.TryGetProperty("bits", out var bitsElement))
            return null;

        var bits = new Dictionary<string, int>();
        foreach (var prop in bitsElement.EnumerateObject())
        {
            if (prop.Value.TryGetInt32(out var value))
            {
                bits[prop.Name] = value;
            }
        }

        return bits.Count > 0 ? bits : null;
    }

    private string? GetStringValue(List<JsonElement> elements, int index)
    {
        if (index < 0 || index >= elements.Count)
            return null;

        var element = elements[index];
        if (element.ValueKind == JsonValueKind.String)
            return element.GetString();

        if (element.ValueKind == JsonValueKind.Null)
            return null;

        return element.ToString();
    }

    private int GetIntValue(List<JsonElement> elements, int index)
    {
        if (index < 0 || index >= elements.Count)
            return 0;

        if (elements[index].TryGetInt32(out var value))
            return value;

        return 0;
    }

    private int GetIntProperty(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop) && prop.TryGetInt32(out var value))
            return value;

        return 0;
    }
}
