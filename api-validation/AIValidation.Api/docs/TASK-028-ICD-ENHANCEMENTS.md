# Task-028: ICD Validation Enhancements - Technical Implementation Guide

## Overview
This document details the implementation of enhanced ICD code validation rules with comprehensive flag checking and user-friendly error messaging.

## Changes Summary

### 1. Interface Enhancement: IIcdProvider.cs

#### New Method Added
```csharp
/// <summary>
/// Get child codes for a parent code (e.g., A05.0, A05.1 for A05)
/// Useful for suggesting specific codes when parent code requires specificity
/// </summary>
/// <param name="parentCode">Parent ICD code without decimal</param>
/// <returns>List of child code information objects</returns>
IEnumerable<IcdCodeInfo> GetChildCodes(string parentCode);
```

**Purpose**: Enable lookup of child codes to provide suggestions when parent codes require specificity.

#### New Property Added
```csharp
/// <summary>
/// Quick access: Has dagger symbol (†) - secondary diagnosis only
/// </summary>
public bool HasDaggerSymbol => DecodedFlags?.HasDaggerSymbol ?? false;
```

**Purpose**: Quick access to check if code has dagger symbol marker without manual flag decoding.

### 2. Implementation: IcdProvider.cs

#### GetChildCodes Method Implementation
```csharp
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
```

**Key Features**:
- Trims input for consistency
- Only returns active (non-cancelled) child codes
- Sorts by code name for predictable output
- Returns empty collection if parent not found

### 3. Rule Enhancement: IcdPrimaryDiagnosisRule.cs

#### Enhanced Validation Logic
```csharp
if (!_icdProvider.CanBePrimaryDiagnosis(icdCode))
{
	// Get the ICD code info to determine the reason for rejection
	var codeInfo = _icdProvider.GetByCode(icdCode);

	string suggestion = $"The ICD code '{icdCode}' cannot be used as a primary/main diagnosis. ";

	// Check reason: needs specific code
	if (codeInfo?.NeedsSpecificCode ?? false)
	{
		var childCodes = _icdProvider.GetChildCodes(icdCode).ToList();
		if (childCodes.Any())
		{
			var childCodesList = string.Join(", ", 
				childCodes.Take(5).Select(c => $"'{c.Code}'"));
			if (childCodes.Count > 5)
				childCodesList += $" (and {childCodes.Count - 5} more)";

			suggestion += $"This code requires a specific child code. " +
						$"Please use one of the following instead: {childCodesList}";
		}
		else
		{
			suggestion += "It requires using a more specific child code.";
		}
	}
	// Check reason: dagger symbol
	else if (codeInfo?.HasDaggerSymbol ?? false)
	{
		suggestion += "It must be used as a secondary diagnosis (icdRa) only " +
					"due to the dagger symbol (†).";
	}
	// Generic restriction
	else
	{
		suggestion += "It must be used as a secondary diagnosis (icdRa) only.";
	}
}
```

**Key Improvements**:
1. **Context-Aware Detection**: Determines WHY code cannot be primary
2. **Specific Suggestions**: For NeedsSpecificCode flag, lists available child codes
3. **Dagger Symbol Explanation**: Mentions the † symbol for users unfamiliar with ICD-10 notation
4. **Graceful Fallback**: Generic message if no specific reason found
5. **Sampling**: Shows first 5 child codes with note if more exist (prevents overwhelming users)

## Code Flow Diagram

```
ValidationRequest (contains ICD code)
	↓
IcdPrimaryDiagnosisRule.ValidateAsync()
	↓
_icdProvider.CanBePrimaryDiagnosis(code)
	├─ Checks IcdBitmaskHelper for flags:
	│  - IsNotMain (Bit 2)
	│  - IsNotRecommendedMain (Bit 3)
	│  - HasDaggerSymbol (Bit 8)
	│  - NeedsSpecificCode (Bit 4)
	│↓
	└─ If invalid, create context-aware error message

If NeedsSpecificCode flag:
	↓
GetChildCodes(parentCode)
	├─ Find all codes: parentCode.* (not cancelled)
	│↓
	└─ Return sorted list

ValidationIssue with suggestion:
"A05 requires specific code. Use: 'A05.0', 'A05.1'..."
```

## Validation Execution Sequence

1. **Extract ICD Code** from form field (icdVao for primary diagnosis)
2. **Check if Code Exists** via IcdExistsRule
3. **Check if Code is Active** via IcdActiveRule
4. **Check Primary Diagnosis Constraint** via IcdPrimaryDiagnosisRule (ENHANCED)
   - If NeedsSpecificCode: suggest child codes
   - If HasDaggerSymbol: explain secondary-only marker
5. **Check Gender Compatibility** via IcdGenderCompatibilityRule
6. **Check Age Compatibility** via IcdAgeCompatibilityRule
7. **Check Death-Only Restriction** via IcdDeathOnlyRule

## Example Validation Results

### Example 1: Invalid Parent Code (A05)
```json
{
  "code": "ICD_NOT_PRIMARY",
  "severity": "Error",
  "field": "icdVao",
  "message": "ICD code 'A05' cannot be used as a primary diagnosis",
  "suggestion": "The ICD code 'A05' cannot be used as a primary/main diagnosis. This code requires a specific child code. Please use one of the following instead: 'A05.0', 'A05.1', 'A05.2', 'A05.3', 'A05.4'",
  "canAutoFix": false
}
```

### Example 2: Dagger Symbol Code (Secondary Only)
```json
{
  "code": "ICD_NOT_PRIMARY",
  "severity": "Error",
  "field": "icdVao",
  "message": "ICD code 'B90.9' cannot be used as a primary diagnosis",
  "suggestion": "The ICD code 'B90.9' cannot be used as a primary/main diagnosis. It must be used as a secondary diagnosis (icdRa) only due to the dagger symbol (†).",
  "canAutoFix": false
}
```

### Example 3: Valid Code
```json
{
  "code": "ICD_PRIMARY",
  "severity": "Info",
  "field": "icdVao",
  "message": "ICD code 'A00.1' is valid for primary diagnosis",
  "suggestion": "This code can be used as a primary diagnosis.",
  "canAutoFix": false
}
```

## ICD Flag Reference (for developers)

```csharp
ICD Bitmask Values (from IcdBitmaskHelper.cs):
- CANCELLED = 1                     // Bit 0: Code is cancelled
- NEW_CODE = 2                      // Bit 1: New code in latest version
- NOT_MAIN = 4                      // Bit 2: Not recommended as main
- NOT_RECOMMENDED_MAIN = 8          // Bit 3: Strong restriction against main use
- NEEDS_SPECIFIC = 16               // Bit 4: Requires specific child code
- DEATH_ONLY = 32                   // Bit 5: Only valid when death reported
- FEMALE_ONLY = 64                  // Bit 6: Female patients only
- MALE_ONLY = 128                   // Bit 7: Male patients only
- DAGGER = 256                      // Bit 8: Secondary only marker (†)
- STAR = 512                        // Bit 9: Related condition marker (*)
```

## Testing Checklist

- [ ] ICD code "A05" returns suggestion with child codes
- [ ] ICD code with dagger symbol shows † explanation
- [ ] Valid primary codes pass without errors
- [ ] Cancelled codes are caught by IcdActiveRule
- [ ] Gender mismatches are caught by IcdGenderCompatibilityRule
- [ ] Age mismatches are caught by IcdAgeCompatibilityRule
- [ ] Death-only codes are properly restricted
- [ ] Error messages are user-friendly and actionable
- [ ] Build completes successfully
- [ ] No regression in existing validation rules

## Performance Considerations

1. **GetChildCodes Performance**:
   - O(n) scan of in-memory dictionary (IcdProvider caches all codes)
   - Minimal impact as typical parent code has < 10 child codes
   - Results cached in error message within single validation request

2. **Caching Strategy**:
   - IcdProvider loads all 15,000+ codes once at startup
   - Child code queries leverage this in-memory cache
   - No database queries needed for validation

## Future Enhancements

1. **Caching Layer**: Consider caching child code lists per parent code
2. **API Endpoint**: Expose GetChildCodes() via ICD controller for frontend suggestions
3. **Front-end Integration**: Use child code suggestions in UI dropdowns
4. **Validation Pipeline Optimization**: Parallelize independent rule execution
5. **Audit Trail**: Log rejection reasons for analytics

## Related Documentation

- `/docs/RULE_IMPLEMENTATIONS.md` - Rule implementation guide
- `/docs/RULES.md` - Rule specifications
- `/Providers/ICD/Helpers/IcdBitmaskHelper.cs` - Flag definitions
- `/Providers/Rules/ICD/*.cs` - Other ICD validation rules
