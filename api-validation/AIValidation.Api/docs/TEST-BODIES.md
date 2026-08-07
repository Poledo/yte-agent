# Test Request Bodies for Validation API

## Base URL
```
http://localhost:5000/api/validation/validate
```

> Change port (5000) based on your launchSettings.json configuration

---

## 1️⃣ TEST: VALID PATIENT (All Fields Correct)

### Request Body
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
	"sessionId": "session-001",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"passportNumber": "",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"alternativePhone": "0987654321",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

## 2️⃣ TEST: MISSING FULL NAME (Name Required Error)

### Request Body
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
	"sessionId": "session-002",
	"userId": "user-123"
  },
  "form": {
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "NAME_REQUIRED",
	  "severity": "Error",
	  "field": "fullName",
	  "message": "Patient name is required (either Full Name or First Name + Last Name)",
	  "suggestion": "Please provide either a full name or both first and last names",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

## 3️⃣ TEST: FUTURE DATE OF BIRTH (Invalid DOB)

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "dateOfBirth"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-003",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "2030-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
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

## 4️⃣ TEST: AGE EXCEEDS 120 (Warning)

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "dateOfBirth"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-004",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1880-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "AGE_EXCEEDS_120",
	  "severity": "Warning",
	  "field": "dateOfBirth",
	  "message": "Age exceeds 120 years (144 years) - please verify this is correct",
	  "suggestion": "Double-check the date of birth for accuracy",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

## 5️⃣ TEST: INVALID GENDER

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Change",
	"field": "gender"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-005",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "X",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_GENDER",
	  "severity": "Error",
	  "field": "gender",
	  "message": "Invalid gender value 'X'. Must be: M (Male), F (Female), O (Other), U (Unspecified)",
	  "suggestion": "Select a valid gender value: M, F, O, or U",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

## 6️⃣ TEST: INVALID NATIONAL ID FORMAT

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "nationalId"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-006",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "INVALID-ID-123",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_ID_FORMAT",
	  "severity": "Error",
	  "field": "nationalId",
	  "message": "Invalid National ID format. Expected format: X-XXXXXX-XXXXXX or XXXXXXXXXXXX",
	  "suggestion": "Please enter a valid Vietnamese National ID (12 or 13 digits, with or without dashes)",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

## 7️⃣ TEST: MISSING CONTACT INFORMATION

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Save",
	"field": "currentAddress"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-007",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "ADDRESS_REQUIRED",
	  "severity": "Error",
	  "field": "currentAddress",
	  "message": "Current address is required",
	  "suggestion": "Please enter the patient's current address",
	  "canAutoFix": false
	},
	{
	  "code": "PHONE_REQUIRED",
	  "severity": "Error",
	  "field": "primaryPhone",
	  "message": "Primary phone number is required",
	  "suggestion": "Please enter a valid phone number",
	  "canAutoFix": false
	}
  ],
  "summary": "2 error(s) found"
}
```

---

## 8️⃣ TEST: INVALID PHONE FORMAT

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "primaryPhone"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-008",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "123456",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "INVALID_PRIMARY_PHONE_FORMAT",
	  "severity": "Error",
	  "field": "primaryPhone",
	  "message": "Invalid primary phone format '123456'. Expected format for Vietnam: 0XXX-XXXXXX, +84XXXXXXXXX, or (0)XXX-XXXXXX",
	  "suggestion": "Please enter a valid Vietnamese phone number",
	  "canAutoFix": false
	}
  ],
  "summary": "1 error(s) found"
}
```

---

## 9️⃣ TEST: NO PATIENT ID (Warning)

### Request Body
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
	"sessionId": "session-009",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "NO_PATIENT_ID",
	  "severity": "Warning",
	  "field": "nationalId",
	  "message": "No patient ID provided. At least one ID type (National ID or Passport) is recommended",
	  "suggestion": "Please provide either a National ID or Passport number for better patient identification",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

## 🔟 TEST: INVALID EMAIL FORMAT (Warning)

### Request Body
```json
{
  "page": "PatientIntake",
  "trigger": {
	"event": "Blur",
	"field": "email"
  },
  "context": {
	"timestamp": "2025-01-17T10:00:00Z",
	"extensionVersion": "1.0.0",
	"sessionId": "session-010",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi, Hà Nội",
	"primaryPhone": "0912345678",
	"email": "invalid.email@"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [
	{
	  "code": "INVALID_EMAIL_FORMAT",
	  "severity": "Warning",
	  "field": "email",
	  "message": "Email format appears invalid: invalid.email@",
	  "suggestion": "Please enter a valid email address (e.g., patient@example.com)",
	  "canAutoFix": false
	}
  ],
  "summary": "1 warning(s) found"
}
```

---

## 1️⃣1️⃣ TEST: MULTIPLE ERRORS

### Request Body
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
	"sessionId": "session-011",
	"userId": "user-123"
  },
  "form": {
	"dateOfBirth": "2030-05-15",
	"gender": "INVALID",
	"nationalId": "bad-id",
	"primaryPhone": "123"
  }
}
```

### Expected Response
```json
{
  "isValid": false,
  "issues": [
	{
	  "code": "NAME_REQUIRED",
	  "severity": "Error",
	  "field": "fullName",
	  "message": "Patient name is required (either Full Name or First Name + Last Name)",
	  "suggestion": "Please provide either a full name or both first and last names",
	  "canAutoFix": false
	},
	{
	  "code": "DOB_FUTURE_DATE",
	  "severity": "Error",
	  "field": "dateOfBirth",
	  "message": "Date of birth cannot be in the future",
	  "suggestion": "Please enter a valid birth date from the past",
	  "canAutoFix": false
	},
	{
	  "code": "INVALID_GENDER",
	  "severity": "Error",
	  "field": "gender",
	  "message": "Invalid gender value 'INVALID'. Must be: M (Male), F (Female), O (Other), U (Unspecified)",
	  "suggestion": "Select a valid gender value: M, F, O, or U",
	  "canAutoFix": false
	},
	{
	  "code": "INVALID_ID_FORMAT",
	  "severity": "Error",
	  "field": "nationalId",
	  "message": "Invalid National ID format. Expected format: X-XXXXXX-XXXXXX or XXXXXXXXXXXX",
	  "suggestion": "Please enter a valid Vietnamese National ID (12 or 13 digits, with or without dashes)",
	  "canAutoFix": false
	},
	{
	  "code": "ADDRESS_REQUIRED",
	  "severity": "Error",
	  "field": "currentAddress",
	  "message": "Current address is required",
	  "suggestion": "Please enter the patient's current address",
	  "canAutoFix": false
	},
	{
	  "code": "PHONE_REQUIRED",
	  "severity": "Error",
	  "field": "primaryPhone",
	  "message": "Primary phone number is required",
	  "suggestion": "Please enter a valid phone number",
	  "canAutoFix": false
	}
  ],
  "summary": "6 error(s) found"
}
```

---

## 1️⃣2️⃣ TEST: FEMALE PATIENT

### Request Body
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
	"sessionId": "session-012",
	"userId": "user-456"
  },
  "form": {
	"fullName": "Trần Thị Hương",
	"firstName": "Hương",
	"lastName": "Trần Thị",
	"dateOfBirth": "1995-03-20",
	"gender": "F",
	"nationalId": "1-654321-987654",
	"currentAddress": "456 Đường Nguyễn Huệ, TP.HCM",
	"primaryPhone": "0909876543",
	"alternativePhone": "0918765432",
	"email": "tran.thuong@hospital.vn"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

## 1️⃣3️⃣ TEST: OTHER GENDER

### Request Body
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
	"sessionId": "session-013",
	"userId": "user-789"
  },
  "form": {
	"fullName": "Lê Minh Chi",
	"dateOfBirth": "1992-07-10",
	"gender": "O",
	"nationalId": "1-111111-222222",
	"currentAddress": "789 Đường Lý Thường Kiệt, Đà Nẵng",
	"primaryPhone": "0901234567",
	"email": "le.chi@test.com"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

## 1️⃣4️⃣ TEST: WITH FIRST & LAST NAME (No Full Name)

### Request Body
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
	"sessionId": "session-014",
	"userId": "user-321"
  },
  "form": {
	"firstName": "Minh",
	"lastName": "Phạm",
	"dateOfBirth": "1988-11-05",
	"gender": "M",
	"nationalId": "1-333333-444444",
	"currentAddress": "321 Đường Trần Hưng Đạo, Hải Phòng",
	"primaryPhone": "0832112233",
	"email": "pham.minh@example.com"
  }
}
```

### Expected Response
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

## Headers Required

```
Content-Type: application/json
Accept: application/json
```

---

## Valid Phone Number Examples

All these formats are accepted:
```
✓ 0912345678         (Mobile Vietnam)
✓ 0912-345-678       (With dashes)
✓ (0)912-345-678     (With parentheses)
✓ +84912345678       (International)
✓ 84912345678        (International without +)
∞ 0123-456-7890      (Landline format)

✗ 123456             (Too short)
✗ invalid-phone      (Not numeric)
```

---

## Valid National ID Formats

```
✓ 1-123456-789012         (Old format)
✓ 1-123456-78901-2        (New format)
✓ 1123456789012           (12 digits, no dashes)
✓ 11234567890123          (13 digits, no dashes)

✗ INVALID-ID              (Not numeric)
✗ 123456                  (Too short)
```

---

## Valid Email Formats

```
✓ patient@example.com
✓ john.doe@hospital.vn
✓ test.user+tag@domain.org
✓ simple@domain.co

✗ invalid.email@          (Missing domain)
✗ @example.com            (Missing local part)
✗ plaintext              (No @ or domain)
```

---

## Caveats & Notes

1. **Timestamp**: Should be current UTC time (ISO 8601 format)
   - Format: `2025-01-17T10:00:00Z`

2. **Event Types**: 
   - `Save` - On form submission
   - `Blur` - On field lose focus
   - `Change` - On field value changes

3. **Page Name**: Name of the form/page in the system
   - `PatientIntake` - Patient registration
   - `MedicalEncounter` - Medical visit
   - `Diagnosis` - Diagnosis form

4. **Severity Levels**:
   - `Error` - Blocks form submission
   - `Warning` - Allows submission but alerts user

5. **Case Sensitivity**: Property names are case-insensitive
   - `fullName` = `FullName` = `FULLNAME` ✓

6. **Optional Fields**:
   - `email` - Optional
   - `alternativePhone` - Optional
   - `passportNumber` - Optional if nationalId provided

---

