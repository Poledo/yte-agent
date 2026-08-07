# IRule Implementation - Visual Architecture

## Executive Summary

✅ **8 concrete validation rules implemented and integrated**

All rules from RULE_CATALOG.md are now active in the validation pipeline. The system progressed from infrastructure-only (empty rules) to production-ready business logic.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Client / Extension                       │
└──────────────────────────┬──────────────────────────────────────┘
						   │ POST /validate
						   ▼
┌─────────────────────────────────────────────────────────────────┐
│              ValidationController                                │
│  .Validate(ValidationRequest) → ValidationService               │
└──────────────────────────┬──────────────────────────────────────┘
						   │
						   ▼
┌─────────────────────────────────────────────────────────────────┐
│              ValidationService                                   │
│  .ValidateAsync(request) → RuleEngine                           │
└──────────────────────────┬──────────────────────────────────────┘
						   │
						   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RuleEngine                                     │
│  .ExecuteAsync(request) → IEnumerable<IRule>                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               DEMOGRAPHICS RULES (5)                       │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ✓ DateOfBirthValidationRule         (DEM-R001)           │ │
│  │ ✓ FullNameValidationRule            (DEM-R002)           │ │
│  │ ✓ GenderValidationRule              (DEM-R003)           │ │
│  │ ✓ PatientIdentityRequirementRule    (DEM-R004)           │ │
│  │ ✓ NationalIdFormatValidationRule    (DEM-R005)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            CONTACT INFORMATION RULES (3)                   │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ✓ RequiredContactInformationRule    (CON-R001)           │ │
│  │ ✓ PhoneNumberFormatValidationRule   (CON-R002)           │ │
│  │ ✓ EmailFormatValidationRule         (CON-R003)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Each rule: ValidateAsync(request) → List<ValidationIssue>     │
│                                                                  │
│  Aggregate + Return → ValidationResponse                        │
└──────────────────────────┬──────────────────────────────────────┘
						   │
						   ▼
┌─────────────────────────────────────────────────────────────────┐
│              ValidationResponse                                  │
│  {                                                              │
│    "isValid": boolean (true if no errors),                      │
│    "issues": ValidationIssue[],                                 │
│    "summary": string                                            │
│  }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
						   │ 200 OK
						   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP Response                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## DI Registration Flow

```
Program.cs
│
├─ Register all 8 rule classes as scoped services
│  ├─ AddScoped<DateOfBirthValidationRule>()
│  ├─ AddScoped<FullNameValidationRule>()
│  ├─ AddScoped<GenderValidationRule>()
│  ├─ AddScoped<PatientIdentityRequirementRule>()
│  ├─ AddScoped<NationalIdFormatValidationRule>()
│  ├─ AddScoped<RequiredContactInformationRule>()
│  ├─ AddScoped<PhoneNumberFormatValidationRule>()
│  └─ AddScoped<EmailFormatValidationRule>()
│
└─ AddScoped<IRuleEngine, RuleEngine>(provider factory)
   │
   ├─ Resolve all 8 rule implementations
   ├─ Create List<IRule> with all rules
   ├─ Instantiate RuleEngine(rules, logger)
   └─ Return as IRuleEngine for injection
```

---

## Request Processing Flow

```
1. HTTP Request arrives
   ↓
2. ValidationRequest model binding
   ├─ Page: "PatientIntake"
   ├─ Trigger: { event: "Save", field: "fullName" }
   ├─ Context: { timestamp, sessionId, userId, ... }
   └─ Form: { fullName, dateOfBirth, gender, ... }
   ↓
3. ValidationService.ValidateAsync(request)
   ↓
4. RuleEngine.ExecuteAsync(request)
   ├─ FOR EACH rule in rules:
   │     ├─ rule.ValidateAsync(request) → List<ValidationIssue>
   │     └─ Collect issues
   ├─ Aggregate all issues
   └─ Group by severity
   ↓
5. ValidationResponse.Create(allIssues)
   ├─ isValid = (no Error-level issues)
   ├─ issues = all issues (errors + warnings)
   └─ summary = "X error(s), Y warning(s) found"
   ↓
6. Return 200 OK with response
```

---

## Rule Decision Trees

### DEM-R001: Date of Birth Validation

```
dateOfBirth provided?
├─ No → PASS (optional field)
└─ Yes → Valid date format?
   ├─ No → ERROR: Invalid date format
   └─ Yes → DOB in future?
	  ├─ Yes → ERROR: DOB cannot be future
	  └─ No → Calculate age
		 └─ Age 0-150?
			├─ No → ERROR: Invalid age range
			└─ Yes → Age > 120?
			   ├─ Yes → WARNING: Age exceeds 120
			   └─ No → PASS
```

### DEM-R002: Full Name Required

```
fullName provided and not empty?
├─ Yes → PASS
└─ No → Both firstName AND lastName provided and not empty?
   ├─ Yes → PASS
   └─ No → ERROR: Name required
```

### DEM-R003: Gender Validation

```
gender provided?
├─ No → PASS (optional)
└─ Yes → gender in [M, F, O, U]? (case-insensitive)
   ├─ Yes → PASS
   └─ No → ERROR: Invalid gender
```

### DEM-R004: Patient Identity Requirement

```
nationalId OR passportNumber provided and not empty?
├─ Yes → PASS
└─ No → WARNING: No patient ID (recommended)
```

### DEM-R005: National ID Format

```
nationalId provided?
├─ No → PASS (optional)
└─ Yes → Matches regex [X-XXXXXX-XXXXXX] OR [X-XXXXXX-XXXXX-X] OR [XXXXXXXXXXXX]?
   ├─ Yes → PASS
   └─ No → ERROR: Invalid ID format
```

### CON-R001: Required Contact Information

```
currentAddress provided and not empty?
├─ No → ERROR: Address required
└─ Yes → primaryPhone provided and not empty?
   ├─ No → ERROR: Phone required
   └─ Yes → PASS
```

### CON-R002: Phone Number Format

```
primaryPhone provided?
├─ No → PASS
└─ Yes → Normalize (remove spaces/dashes) → Matches regex?
   ├─ Yes → PASS
   └─ No → ERROR: Invalid phone format

(Same for alternativePhone, but severity = Warning)
```

### CON-R003: Email Format

```
email provided?
├─ No → PASS
└─ Yes → Matches regex for email?
   ├─ Yes → Length ≤ 254?
   │  ├─ Yes → PASS
   │  └─ No → WARNING: Email too long
   └─ No → WARNING: Invalid email format
```

---

## Severity Meanings

### Error (Blocking)
- Prevents form submission
- `isValid = false`
- User must fix before saving
- Examples: Missing required fields, invalid formats

### Warning (Non-Blocking)
- Allows form submission
- `isValid = true` (has warnings)
- Alerts user to double-check
- Examples: Age > 120, missing optional fields

---

## Case-Insensitive Property Matching

All rules support flexible naming:

```
Helper: TryGetPropertyCaseInsensitive(jsonElement, propertyName)
│
├─ Iterate through all JSON object properties
├─ Compare names case-insensitively
├─ Return matching property value
└─ Return false if no match

Usage:
  TryGetPropertyCaseInsensitive(form, "dateOfBirth", out var dob)

  Matches:
  ✓ "dateOfBirth"
  ✓ "DateOfBirth"
  ✓ "DATEOFBIRTH"
  ✓ "Date_Of_Birth"
  ✗ "dob" (different property)
```

---

## Validation Issue Object

Each issue returned by rules has this structure:

```csharp
{
  "code": string,           // Machine code: "DOB_FUTURE_DATE"
  "severity": string,       // "Error" | "Warning"
  "field": string,          // Field name: "dateOfBirth"
  "message": string,        // User message
  "suggestion": string,     // How to fix
  "canAutoFix": boolean     // Can system auto-correct (false for now)
}
```

Example:
```json
{
  "code": "DOB_FUTURE_DATE",
  "severity": "Error",
  "field": "dateOfBirth",
  "message": "Date of birth cannot be in the future",
  "suggestion": "Please enter a valid birth date from the past",
  "canAutoFix": false
}
```

---

## Data Flow Example: Valid Request

```
Input:
{
  "page": "PatientIntake",
  "trigger": {"event": "Save", "field": "fullName"},
  "context": {...},
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đ. Lê Lợi",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}

↓ Through each rule:

Rule 1 (DEM-R001): dateOfBirth = 1990-05-15, age = 34 → PASS ✓
Rule 2 (DEM-R002): fullName = "Nguyễn Văn A" → PASS ✓
Rule 3 (DEM-R003): gender = "M" → PASS ✓
Rule 4 (DEM-R004): nationalId = "1-123456-789012" → PASS ✓
Rule 5 (DEM-R005): nationalId format → PASS ✓
Rule 6 (CON-R001): address + phone present → PASS ✓
Rule 7 (CON-R002): phone = "0912345678" → PASS ✓
Rule 8 (CON-R003): email = "patient@example.com" → PASS ✓

↓

Output:
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

## Data Flow Example: Invalid Request

```
Input:
{
  "page": "PatientIntake",
  "trigger": {"event": "Save", "field": "dateOfBirth"},
  "context": {...},
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "2030-05-15",        ← FUTURE DATE
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đ. Lê Lợi",
	"primaryPhone": "0912345678"
  }
}

↓ Through each rule:

Rule 1 (DEM-R001): dateOfBirth = 2030-05-15 → ERROR (future) ❌
					[Stops processing most rules early]
Rule 2-8: Continue checking...

↓

Output:
{
  "isValid": false,
  "issues": [
	{
	  "code": "DOB_FUTURE_DATE",
	  "severity": "Error",
	  "field": "dateOfBirth",
	  "message": "Date of birth cannot be in the future",
	  "suggestion": "Please enter a valid birth date from the past",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

## Testing Strategy

### Unit Testing (Future)
Each rule class can be tested independently with mock requests

### Integration Testing (Recommended Next)
Test RuleEngine with real ValidationRequest objects

### End-to-End Testing (Current)
Test full pipeline via HTTP endpoint

### Test Coverage Checklist
- ✓ Valid data (all fields correct)
- ✓ Missing required fields
- ✓ Invalid formats (dates, IDs, emails)
- ✓ Boundary conditions (age = 120, 121)
- ✓ Case sensitivity (gender, properties)
- ✓ Optional fields (email, alternative phone)
- ✓ Multiple errors (all caught together)

---

## Performance Characteristics

- **Rules Execution**: Sequential (not parallel)
- **Async Support**: Ready for async operations
- **Memory**: Minimal (rules don't cache)
- **Database**: No queries (yet - DEM-R006 would need).
- **Scalability**: Linear with rule count

---

## Future Enhancements

### Phase 2 (Recommended)
- DEM-R006: Duplicate Patient Detection (with DB)
- CON-R004: Address Format Validation
- Error deduplication (if same error from multiple rules)

### Phase 3 (Advanced)
- Diagnosis Rules: ICD-10 code validation
- Medication Rules: Drug interaction checking
- Insurance Rules: Coverage verification
- Clinical Rules: Lab result interpretation

### Phase 4 (AI Integration)
- Reintroduce LLM for complex validations
- AI confidence scoring
- Smart suggestions

---

