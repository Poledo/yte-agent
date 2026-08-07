# Quick Start: Testing IRule Implementations

## Endpoint
```
POST http://localhost:5000/api/validation/validate (or your port)
Content-Type: application/json
```

## Test Template

```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "fullName"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-123",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

## 8 Implemented Rules

| # | Rule ID | Name | Type | Field(s) |
|---|---------|------|------|----------|
| 1 | DEM-R001 | Date of Birth Validation | Error/Warn | dateOfBirth |
| 2 | DEM-R002 | Full Name Required | Error | fullName, firstName, lastName |
| 3 | DEM-R003 | Gender Field Validation | Error | gender |
| 4 | DEM-R004 | Patient Identity Requirement | Warn | nationalId, passportNumber |
| 5 | DEM-R005 | National ID Format Validation | Error | nationalId |
| 6 | CON-R001 | Required Contact Information | Error | currentAddress, primaryPhone |
| 7 | CON-R002 | Phone Number Format Validation | Error/Warn | primaryPhone, alternativePhone |
| 8 | CON-R003 | Email Format Validation | Warn | email |

## Quick Tests

### ✅ Valid: All fields pass
**Modify template:** Use valid values for all fields (as shown above)
**Expected:** `"isValid": true, "issues": [], "summary": "All validations passed"`

### ❌ Missing Name: Should fail DEM-R002
**Modify template:** Remove `"fullName"` field from form
**Expected:** Code = `NAME_REQUIRED`, Severity = `Error`

### ❌ Future DOB: Should fail DEM-R001
**Modify template:** Change `"dateOfBirth": "2030-05-15"`
**Expected:** Code = `DOB_FUTURE_DATE`, Severity = `Error`

### ⚠️ Age > 120: Should warn DEM-R001
**Modify template:** Change `"dateOfBirth": "1850-05-15"`
**Expected:** Code = `AGE_EXCEEDS_120`, Severity = `Warning`, `"isValid": true`

### ❌ Invalid Gender: Should fail DEM-R003
**Modify template:** Change `"gender": "X"`
**Expected:** Code = `INVALID_GENDER`, Severity = `Error`

### ❌ No Contact: Should fail CON-R001
**Modify template:** Remove `"currentAddress"` and `"primaryPhone"`
**Expected:** Two errors (ADDRESS_REQUIRED, PHONE_REQUIRED)

### ❌ Bad Phone: Should fail CON-R002
**Modify template:** Change `"primaryPhone": "123"`
**Expected:** Code = `INVALID_PRIMARY_PHONE_FORMAT`, Severity = `Error`

### ⚠️ No ID: Should warn DEM-R004
**Modify template:** Remove `"nationalId"` and `"passportNumber"`
**Expected:** Code = `NO_PATIENT_ID`, Severity = `Warning`, `"isValid": true`

### ⚠️ Bad Email: Should warn CON-R003
**Modify template:** Change `"email": "invalid@"`
**Expected:** Code = `INVALID_EMAIL_FORMAT`, Severity = `Warning`, `"isValid": true`

### ❌ Bad National ID: Should fail DEM-R005
**Modify template:** Change `"nationalId": "INVALID"`
**Expected:** Code = `INVALID_ID_FORMAT`, Severity = `Error`

## Common Phone Formats Accepted
- ✅ `0912345678` (mobile)
- ✅ `0912-345-678` (mobile with dashes)
- ✅ `(0) 91 234 5678` (with formatting)
- ✅ `+84912345678` (international)
- ✅ `84912345678` (no +)

## Valid National ID Formats
- ✅ `1-123456-789012` (old format)
- ✅ `1-123456-78901-2` (new format)
- ✅ `1123456789012` (no dashes)
- ✅ `11234567890123` (13 digits, no dashes)

## Documentation

Full test cases with expected responses:
📄 `AIValidation.Api/docs/RULE_IMPLEMENTATIONS.md`

---

## File Locations

**Rule Implementations:**
- `AIValidation.Api/Providers/Rules/Demographics/` (5 rules)
- `AIValidation.Api/Providers/Rules/Contact/` (3 rules)

**DI Registration:**
- `AIValidation.Api/Program.cs` (lines 89-121)

**Documentation:**
- `AIValidation.Api/docs/RULE_IMPLEMENTATIONS.md` (comprehensive guide)

---

## Next Phase

Ready to implement more rules:
- **DEM-R006**: Duplicate Patient Detection
- **Diagnosis/Medication/Insurance Rules**
- **Clinical Decision Rules**

Just create new class files in appropriate folder and register in Program.cs!

