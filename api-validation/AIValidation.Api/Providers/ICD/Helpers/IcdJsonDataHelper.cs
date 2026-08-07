using System.Text.Json;

namespace AIValidation.Api.Providers.ICD.Helpers;

/// <summary>
/// Helper class to load ICD data from JSON files
/// </summary>
public static class IcdJsonDataHelper
{
    /// <summary>
    /// Load ICD data from icd_rows.json file
    /// Structure: [code, code_key, name_vi, name_en, description, category1, category2, parent_code, parent_name, flags]
    /// </summary>
    public static Dictionary<string, IcdCodeInfo> LoadIcdFromJson(string jsonFilePath, ILogger logger)
    {
        var codes = new Dictionary<string, IcdCodeInfo>(StringComparer.OrdinalIgnoreCase);

        try
        {
            if (!File.Exists(jsonFilePath))
            {
                logger.LogWarning("ICD JSON file not found at {Path}", jsonFilePath);
                return codes;
            }

            var jsonContent = File.ReadAllText(jsonFilePath);
            using var doc = JsonDocument.Parse(jsonContent);

            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array)
            {
                logger.LogWarning("ICD JSON root is not an array");
                return codes;
            }

            int loadedCount = 0;
            foreach (var element in root.EnumerateArray())
            {
                try
                {
                    if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() < 10)
                        continue;

                    var items = element.EnumerateArray().ToList();

                    var code = items[0].GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(code))
                        continue;

                    // Parse flags from the 10th element (index 9)
                    var flags = 0;
                    if (items[9].ValueKind == JsonValueKind.Number)
                    {
                        flags = items[9].GetInt32();
                    }

                    var codeInfo = new IcdCodeInfo
                    {
                        Code = code,
                        Name = items[2].GetString() ?? "", // Vietnamese name
                        Description = items[4].GetString() ?? "", // Description
                        Flags = flags,
                        DecodedFlags = IcdBitmaskHelper.DecodeBitmask(flags),
                        Metadata = new Dictionary<string, object>
                        {
                            { "flags", flags },
                            { "name_en", items[3].GetString() ?? "" },
                            { "category1", items[5].GetString() ?? "" },
                            { "category2", items[6].GetString() ?? "" },
                            { "parent_code", items[7].GetString() ?? "" }
                        }
                    };

                    codes[code] = codeInfo;
                    loadedCount++;
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Error parsing ICD row from JSON");
                }
            }

            logger.LogInformation("Successfully loaded {Count} ICD codes from JSON file", loadedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error loading ICD data from JSON file: {Path}", jsonFilePath);
        }

        return codes;
    }
}
