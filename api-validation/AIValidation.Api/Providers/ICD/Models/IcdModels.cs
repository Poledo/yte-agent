namespace AIValidation.Api.Providers.ICD.Models;

/// <summary>
/// Represents ICD master data metadata from icd_meta.json
/// This file contains information about the ICD catalog version, structure, and bitmask indicators
/// </summary>
public class IcdMetadata
{
    /// <summary>
    /// Version of the ICD catalog (e.g., "official-TT06-QD1849-v2.3-fast-pl3")
    /// </summary>
    public string? Version { get; set; }

    /// <summary>
    /// Source file name
    /// </summary>
    public string? SourceFile { get; set; }

    /// <summary>
    /// Source regulation reference
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Statistics about the ICD catalog
    /// </summary>
    public IcdStatistics? Counts { get; set; }

    /// <summary>
    /// Bitmask definitions for flags in the data
    /// Maps flag names to bit positions
    /// </summary>
    public Dictionary<string, int>? Bits { get; set; }

    /// <summary>
    /// Notes about the data format and processing
    /// </summary>
    public string? PerformanceNote { get; set; }
}

/// <summary>
/// Statistics about ICD records in the catalog
/// </summary>
public class IcdStatistics
{
    public int OfficialCatalogRecords { get; set; }
    public int UniqueCodeKeys { get; set; }
    public int CancelledPl4 { get; set; }
    public int NewPl5 { get; set; }
    public int DrugChemicalPl3 { get; set; }
    public int NotMain { get; set; }
    public int NotRecommendedMain { get; set; }
    public int NeedSpecific { get; set; }
    public int DeathOnly { get; set; }
    public int FemaleOnly { get; set; }
    public int MaleOnly { get; set; }
    public int Dagger { get; set; }
    public int Star { get; set; }
    public int NewCodeInCatalog { get; set; }
}

/// <summary>
/// Represents a single ICD code record from icd_rows.json
/// Data is stored in compact array format with fields in specific order
/// 
/// Array structure (0-indexed):
/// [0]: ICD Code with decimal (e.g., "A00.0")
/// [1]: ICD Code without decimal (e.g., "A000")
/// [2]: Vietnamese description
/// [3]: English description
/// [4]: Additional description/notes
/// [5]: Category (Vietnamese) - parent category name
/// [6]: Subcategory (Vietnamese) - specific subcategory
/// [7]: Parent code (e.g., "A00")
/// [8]: Parent description
/// [9]: Bitmask (integer) - flags encoded as bits
/// </summary>
public class IcdCodeRecord
{
    /// <summary>
    /// ICD code with decimal point (e.g., "A00.0")
    /// This is the primary identifier used for validation
    /// </summary>
    public string? CodeWithDecimal { get; set; }

    /// <summary>
    /// ICD code without decimal (e.g., "A000")
    /// Used for database key and indexing
    /// </summary>
    public string? CodeWithoutDecimal { get; set; }

    /// <summary>
    /// Vietnamese description of the diagnosis
    /// </summary>
    public string? DescriptionVi { get; set; }

    /// <summary>
    /// English description of the diagnosis
    /// </summary>
    public string? DescriptionEn { get; set; }

    /// <summary>
    /// Additional notes or clinical information
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Main category (e.g., "Bệnh truyền nhiễm và ký sinh trùng")
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Subcategory within the main category
    /// </summary>
    public string? SubCategory { get; set; }

    /// <summary>
    /// Parent ICD code (e.g., "A00")
    /// </summary>
    public string? ParentCode { get; set; }

    /// <summary>
    /// Parent description
    /// </summary>
    public string? ParentDescription { get; set; }

    /// <summary>
    /// Bitmask encoded flags
    /// Each bit represents a flag (cancelled, newCode, notMain, notRecommendedMain, 
    /// needSpecific, deathOnly, femaleOnly, maleOnly, dagger, star)
    /// Use IcdBitmaskHelper to decode
    /// </summary>
    public int Flags { get; set; }

    /// <summary>
    /// Decoded flags from the bitmask for easy access
    /// </summary>
    public IcdDecodedFlags? DecodedFlags { get; set; }
}

/// <summary>
/// Decoded flags from ICD record bitmask
/// Bit positions as defined in icd_meta.json
/// </summary>
public class IcdDecodedFlags
{
    /// <summary>
    /// Bit 0 (value 1) - ICD code has been cancelled
    /// </summary>
    public bool IsCancelled { get; set; }

    /// <summary>
    /// Bit 1 (value 2) - This is a new code in the latest version
    /// </summary>
    public bool IsNewCode { get; set; }

    /// <summary>
    /// Bit 2 (value 4) - ICD code is not recommended as main diagnosis
    /// </summary>
    public bool IsNotMain { get; set; }

    /// <summary>
    /// Bit 3 (value 8) - ICD code is not recommended as main diagnosis (strong restriction)
    /// </summary>
    public bool IsNotRecommendedMain { get; set; }

    /// <summary>
    /// Bit 4 (value 16) - Requires specific additional code
    /// </summary>
    public bool NeedsSpecificCode { get; set; }

    /// <summary>
    /// Bit 5 (value 32) - Only valid when patient died (death-only indicator)
    /// </summary>
    public bool IsDeathOnly { get; set; }

    /// <summary>
    /// Bit 6 (value 64) - Only valid for female patients
    /// </summary>
    public bool IsFemaleOnly { get; set; }

    /// <summary>
    /// Bit 7 (value 128) - Only valid for male patients
    /// </summary>
    public bool IsMaleOnly { get; set; }

    /// <summary>
    /// Bit 8 (value 256) - Dagger symbol (†) - secondary code, requires primary code
    /// </summary>
    public bool HasDaggerSymbol { get; set; }

    /// <summary>
    /// Bit 9 (value 512) - Asterisk symbol (*) - related condition follows
    /// </summary>
    public bool HasAsteriskSymbol { get; set; }
}
