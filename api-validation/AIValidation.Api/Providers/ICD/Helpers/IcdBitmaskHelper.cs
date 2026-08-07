using AIValidation.Api.Providers.ICD.Models;

namespace AIValidation.Api.Providers.ICD.Helpers;

/// <summary>
/// Helper class for decoding ICD bitmasks
/// Converts integer bitmask to individual flag values
/// </summary>
public static class IcdBitmaskHelper
{
    /// <summary>
    /// Bitmask values as defined in icd_meta.json
    /// </summary>
    public const int CANCELLED = 1;                // Bit 0
    public const int NEW_CODE = 2;                 // Bit 1
    public const int NOT_MAIN = 4;                 // Bit 2
    public const int NOT_RECOMMENDED_MAIN = 8;    // Bit 3
    public const int NEEDS_SPECIFIC = 16;          // Bit 4
    public const int DEATH_ONLY = 32;              // Bit 5
    public const int FEMALE_ONLY = 64;             // Bit 6
    public const int MALE_ONLY = 128;              // Bit 7
    public const int DAGGER = 256;                 // Bit 8 (†)
    public const int STAR = 512;                   // Bit 9 (*)

    /// <summary>
    /// Decode bitmask into individual flags
    /// </summary>
    /// <param name="bitmask">The integer bitmask from ICD record</param>
    /// <returns>IcdDecodedFlags with all flags unpacked</returns>
    public static IcdDecodedFlags DecodeBitmask(int bitmask)
    {
        return new IcdDecodedFlags
        {
            IsCancelled = HasFlag(bitmask, CANCELLED),
            IsNewCode = HasFlag(bitmask, NEW_CODE),
            IsNotMain = HasFlag(bitmask, NOT_MAIN),
            IsNotRecommendedMain = HasFlag(bitmask, NOT_RECOMMENDED_MAIN),
            NeedsSpecificCode = HasFlag(bitmask, NEEDS_SPECIFIC),
            IsDeathOnly = HasFlag(bitmask, DEATH_ONLY),
            IsFemaleOnly = HasFlag(bitmask, FEMALE_ONLY),
            IsMaleOnly = HasFlag(bitmask, MALE_ONLY),
            HasDaggerSymbol = HasFlag(bitmask, DAGGER),
            HasAsteriskSymbol = HasFlag(bitmask, STAR)
        };
    }

    /// <summary>
    /// Check if a specific flag is set in the bitmask
    /// </summary>
    private static bool HasFlag(int bitmask, int flag)
    {
        return (bitmask & flag) == flag;
    }

    /// <summary>
    /// Check if ICD code is active (not cancelled and not expired)
    /// </summary>
    public static bool IsActive(IcdDecodedFlags flags)
    {
        return !flags.IsCancelled;
    }

    /// <summary>
    /// Check if ICD code is HARD-BLOCKED from being a primary diagnosis:
    /// - IsNotMain (flag 4): danh mục cấm dùng làm bệnh chính
    /// - HasDaggerSymbol (flag 256): mã dấu † chỉ dùng làm bệnh kèm theo
    ///
    /// Lưu ý: NeedsSpecificCode (flag 16, "cần chọn mã cụ thể hơn") và
    /// IsNotRecommendedMain (flag 8, "không khuyến khích") KHÔNG tính là chặn cứng —
    /// các rule xử lý riêng hai trường hợp này với mức Cảnh báo + gợi ý mã con,
    /// khớp cách phân loại của danh mục TT06 (trang tra cứu ICD của BHXH).
    /// </summary>
    public static bool CanBePrimaryDiagnosis(IcdDecodedFlags flags)
    {
        return !flags.IsNotMain
            && !flags.HasDaggerSymbol;
    }

    /// <summary>
    /// Check if ICD has gender restrictions
    /// </summary>
    public static bool HasGenderRestriction(IcdDecodedFlags flags)
    {
        return flags.IsFemaleOnly || flags.IsMaleOnly;
    }

    /// <summary>
    /// Check if ICD is restricted to female patients only
    /// </summary>
    public static bool IsFemaleOnly(IcdDecodedFlags flags)
    {
        return flags.IsFemaleOnly;
    }

    /// <summary>
    /// Check if ICD is restricted to male patients only
    /// </summary>
    public static bool IsMaleOnly(IcdDecodedFlags flags)
    {
        return flags.IsMaleOnly;
    }

    /// <summary>
    /// Check allowed genders for this ICD code
    /// Returns: "M" (male only), "F" (female only), "M,F" (both), or empty string (no restriction)
    /// </summary>
    public static string GetAllowedGenders(IcdDecodedFlags flags)
    {
        if (flags.IsFemaleOnly && !flags.IsMaleOnly) return "F";
        if (flags.IsMaleOnly && !flags.IsFemaleOnly) return "M";
        if (flags.IsFemaleOnly && flags.IsMaleOnly) return "M,F"; // Shouldn't happen
        return ""; // No restriction
    }
}
