# Rule Catalog - Detailed Specifications

## Introduction

This document contains the detailed Rule Catalog for the VNPT-HIS AI Validation Platform. This is a structured reference for implementing the Rule Engine and validation pipeline.

---

## Rule Definitions

### Category: Demographics (DEM)

#### Rule DEM-R001: Date of Birth Validation

**Rule ID:** DEM-R001  
**Rule Name:** Date of Birth Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận (Intake Form)  
**Fields:** DateOfBirth, Age  
**Trigger:** On Blur (DateOfBirth field), On Save  
**Priority:** High  
**Severity Level:** 
- Error: If DOB is in future OR Age > 150
- Warning: If Age > 120
**Allow Continue:** No (for Error), Yes (for Warning)  

**Business Rule:**
- Date of Birth must be a past date (no future dates allowed)
- Calculated age must be between 0-150 years
- Age > 120 should warn about possible data entry error

**Validation Logic:**
```
IF DateOfBirth > TODAY() THEN Error("Date of birth cannot be in future")
ELSE IF (TODAY() - DateOfBirth) NOT IN YEARS[0..150] THEN Error("Invalid age range")
ELSE IF (TODAY() - DateOfBirth) > 120 THEN Warning("Age exceeds 120 years - please verify")
ELSE Accept()
```

**Related Rules:** 
- DEM-R006 (Duplicate detection uses validated DOB)

**Notes:** Age field may be auto-calculated from DOB

---

#### Rule DEM-R002: Full Name Required

**Rule ID:** DEM-R002  
**Rule Name:** Full Name Required  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** FullName OR (FirstName + LastName)  
**Trigger:** On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- Patient must have an identifiable name
- Either single FullName field OR both FirstName and LastName must be provided
- Name must not be empty or whitespace-only

**Validation Logic:**
```
IF FullName IS NOT NULL AND FullName.TRIM() != "" THEN
  Accept()
ELSE IF FirstName IS NOT NULL AND FirstName.TRIM() != "" 
	AND LastName IS NOT NULL AND LastName.TRIM() != "" THEN
  Accept()
ELSE
  Error("Patient name is required (either Full Name or First Name + Last Name)")
END IF
```

**Related Rules:**
- DEM-R006 (uses name for duplicate detection)

---

#### Rule DEM-R003: Gender Field Validation

**Rule ID:** DEM-R003  
**Rule Name:** Gender Field Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** Gender  
**Trigger:** On Change, On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- Gender must be one of predefined valid values
- System must enforce standardized gender representation

**Valid Values:** M (Male), F (Female), O (Other), U (Unspecified)

**Validation Logic:**
```
IF Gender IN ("M", "F", "O", "U") THEN
  Accept()
ELSE
  Error("Invalid gender value. Must be: M (Male), F (Female), O (Other), U (Unspecified)")
END IF
```

**Related Rules:**
- DEM-R006 (uses gender for duplicate detection)

---

#### Rule DEM-R004: Patient Identity Requirement

**Rule ID:** DEM-R004  
**Rule Name:** Patient Identity Requirement  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** NationalID OR PassportNumber  
**Trigger:** On Save  
**Priority:** High  
**Severity Level:** Warning  
**Allow Continue:** Yes  

**Business Rule:**
- Patient must be uniquely identifiable
- At least one form of ID must be provided (either National ID or Passport)
- Note: May be elevated to Error depending on organization policy

**Validation Logic:**
```
IF (NationalID IS NOT NULL AND NationalID.TRIM() != "") 
OR (PassportNumber IS NOT NULL AND PassportNumber.TRIM() != "") THEN
  Accept()
ELSE
  Warning("No patient ID provided. At least one ID type (National ID or Passport) is recommended")
END IF
```

**Related Rules:**
- DEM-R005 (validates format of National ID if provided)
- DEM-R006 (uses ID for duplicate detection)

---

#### Rule DEM-R005: National ID Format Validation

**Rule ID:** DEM-R005  
**Rule Name:** National ID Format Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** NationalID  
**Trigger:** On Blur, On Save  
**Priority:** Medium  
**Severity Level:** Error (if provided with invalid format)  
**Allow Continue:** No  

**Business Rule:**
- If National ID is provided, it must match Vietnamese ID card format
- Empty field is acceptable (other ID types may be used)

**Expected Format:** X-XXXXXX-XXXXXX or similar 12-digit format with dashes

**Validation Logic:**
```
IF NationalID IS NULL OR NationalID.TRIM() = "" THEN
  Accept()  // Optional field
ELSE IF NationalID MATCHES REGEX("^\d{1}-\d{6}-\d{6}$") OR NationalID MATCHES REGEX("^\d{1}-\d{6}-\d{5}-\d{1}$") THEN
  Accept()
ELSE
  Error("Invalid National ID format. Expected format: X-XXXXXX-XXXXXX")
END IF
```

**Notes:** 
- Validation rules for Vietnamese ID may need updating based on actual ID format requirements
- Consider checksum validation if applicable

**Related Rules:**
- DEM-R004 (identity requirement check)

---

#### Rule DEM-R006: Duplicate Patient Detection

**Rule ID:** DEM-R006  
**Rule Name:** Duplicate Patient Detection  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** FullName (or FirstName+LastName), DateOfBirth, Gender  
**Trigger:** On Save (Database lookup)  
**Priority:** High  
**Severity Level:** Warning  
**Allow Continue:** Yes  

**Business Rule:**
- Before creating new patient record, check for existing patients with same name, DOB, and gender
- If exact match found: Suggest to user
- If similar match found: Offer to review

**Validation Logic:**
```
// After DEM-R001, DEM-R002, DEM-R003 pass
QUERY Database WHERE
  FullName ~= CurrentFullName (fuzzy match, >80% similarity)
  AND DateOfBirth = CurrentDateOfBirth
  AND Gender = CurrentGender

IF ExactMatch FOUND THEN
  Warning("Exact match found for this patient") 
  OFFER_OPTIONS: ["Use existing record", "Create new record", "Merge records"]
ELSE IF SimilarMatches FOUND THEN
  Warning(f"Similar patient records found ({count} matches)")
  OFFER_OPTIONS: ["Review matches", "Create new record"]
ELSE
  Accept()
END IF
```

**Data Source:** Patient table in database  
**Performance:** May be async for large datasets

---

### Category: Contact Information (CON)

#### Rule CON-R001: Required Contact Information

**Rule ID:** CON-R001  
**Rule Name:** Required Contact Information  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** CurrentAddress, PrimaryPhone  
**Trigger:** On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- Hospital must have way to contact patient
- Both current address and primary phone number are required

**Validation Logic:**
```
IF CurrentAddress IS NOT NULL AND CurrentAddress.TRIM() != "" 
AND PrimaryPhone IS NOT NULL AND PrimaryPhone.TRIM() != "" THEN
  Accept()
ELSE IF CurrentAddress IS NULL OR CurrentAddress.TRIM() = "" THEN
  Error("Current address is required")
ELSE IF PrimaryPhone IS NULL OR PrimaryPhone.TRIM() = "" THEN
  Error("Primary phone number is required")
END IF
```

---

#### Rule CON-R002: Phone Number Format Validation

**Rule ID:** CON-R002  
**Rule Name:** Phone Number Format Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** PrimaryPhone, AlternativePhone  
**Trigger:** On Blur, On Save  
**Priority:** Medium  
**Severity Level:** Error (for PrimaryPhone), Warning (for AlternativePhone)  
**Allow Continue:** No / Yes  

**Business Rule:**
- Phone numbers must be in valid Vietnamese format
- Primary phone validation is strict (Error)
- Alternative phone validation is lenient (Warning)

**Valid Formats:**
- (0)XXX-XXXXXX or (0)XXX-XXXXXX (9-10 digits)
- +84XXX-XXXXXX (country code format)
- Standard: Length 10-11 for Vietnam mobile (08x, 09x) or landline (0xx)

**Validation Logic:**
```
FUNCTION ValidatePhoneFormat(phone, fieldType)
  IF phone IS NULL OR phone.TRIM() = "" THEN
	RETURN Accept()  // Optional field
  END IF

  normalized = phone.REPLACE_ALL(" ", "").REPLACE_ALL("-", "")

  IF normalized MATCHES REGEX("^0\d{9,10}$")  // Vietnam format
  OR normalized MATCHES REGEX("^84\d{8,10}$") THEN  // International format
	RETURN Accept()
  ELSE
	severity = (fieldType = "Primary") ? Error : Warning
	RETURN severity("Invalid phone format for Vietnam")
  END IF
END FUNCTION
```

---

#### Rule CON-R003: Email Format Validation

**Rule ID:** CON-R003  
**Rule Name:** Email Format Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** Email  
**Trigger:** On Blur, On Save  
**Priority:** Low  
**Severity Level:** Warning  
**Allow Continue:** Yes  

**Business Rule:**
- If email provided, must be valid format
- Email is optional field

**Validation Logic:**
```
IF Email IS NULL OR Email.TRIM() = "" THEN
  Accept()  // Optional
ELSE IF Email MATCHES RFC5322_REGEX THEN
  Accept()
ELSE
  Warning(f"Email format '{Email}' may be invalid")
END IF
```

**Note:** Use standard email regex for RFC 5322 compliance

---

#### Rule CON-R004: Address Logical Validation

**Rule ID:** CON-R004  
**Rule Name:** Address Logical Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** CurrentAddress, PermanentAddress  
**Trigger:** On Save  
**Priority:** Low  
**Severity Level:** Info  
**Allow Continue:** Yes  

**Business Rule:**
- Data quality check
- If both addresses provided, they should be different
- This is informational, not blocking

**Validation Logic:**
```
IF PermanentAddress IS NULL OR PermanentAddress.TRIM() = "" THEN
  Accept()  // Only current address provided
ELSE IF CurrentAddress.NORMALIZE() = PermanentAddress.NORMALIZE() THEN
  Info("Current and permanent addresses are identical - please verify if intentional")
  Accept()  // Still allow
ELSE
  Accept()
END IF
```

---

### Category: Insurance & Payment (INS)

#### Rule INS-R001: Insurance Type Required

**Rule ID:** INS-R001  
**Rule Name:** Insurance Type Required  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** InsuranceType  
**Trigger:** On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- Insurance status must be documented for all admissions
- System must be aware of patient's payment/insurance status

**Valid Values:** BHYT, Private, Self-Pay, Other, None

**Validation Logic:**
```
IF InsuranceType IS NOT NULL AND InsuranceType IN (
  "BHYT", "Private", "Self-Pay", "Other", "None"
) THEN
  Accept()
ELSE
  Error("Insurance type must be selected")
END IF
```

---

#### Rule INS-R002: Insurance Number for BHYT

**Rule ID:** INS-R002  
**Rule Name:** Insurance Number Required for BHYT  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** InsuranceType, InsuranceNumber  
**Trigger:** On Change (InsuranceType), On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- If National Health Insurance (BHYT) is selected, insurance card number must be provided
- Conditional requirement based on insurance type

**Validation Logic:**
```
IF InsuranceType != "BHYT" THEN
  Accept()  // Not required for other insurance types
ELSE IF InsuranceNumber IS NOT NULL AND InsuranceNumber.TRIM() != "" THEN
  Accept()
ELSE
  Error("BHYT insurance number is required when BHYT is selected")
END IF
```

**Notes:** 
- May need to trigger additional validation of BHYT number format
- May need to validate against BHYT database if available

---

#### Rule INS-R003: Insurance Validity Period Validation

**Rule ID:** INS-R003  
**Rule Name:** Insurance Validity Period Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** InsuranceValidFrom, InsuranceValidTo  
**Trigger:** On Save  
**Priority:** Medium  
**Severity Level:** Warning / Error (depending on policy)  
**Allow Continue:** Yes / No  

**Business Rule:**
- Insurance validity period must be logical and reasonable
- ValidFrom must be before or on ValidTo
- Dates should be in reasonable range

**Validation Logic:**
```
IF InsuranceValidFrom IS NULL OR InsuranceValidTo IS NULL THEN
  RETURN  // Optional fields
END IF

IF InsuranceValidFrom > InsuranceValidTo THEN
  Error("Insurance start date must be before end date")
ELSE IF InsuranceValidFrom > TODAY() THEN
  Warning("Insurance start date is in future - please verify")
  Accept()
ELSE IF InsuranceValidTo < TODAY() THEN
  Warning("Insurance has expired - patient may need renewal")
  Accept() // Allow but warn
ELSE
  Accept()
END IF
```

---

#### Rule INS-R004: Insurance Valid at Admission

**Rule ID:** INS-R004  
**Rule Name:** Insurance Valid at Admission  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** InsuranceNumber, InsuranceValidTo, AdmissionDate  
**Trigger:** On Save (Async/Background)  
**Priority:** High  
**Severity Level:** Warning / Error  
**Allow Continue:** Yes / No  
**Data Source:** Database + External Insurance API  

**Business Rule:**
- Insurance must be valid on the date of admission
- Validates against insurance provider system if available
- Checks if insurance hasn't expired

**Validation Logic:**
```
ASYNC FUNCTION ValidateInsuranceAtAdmission()
  IF InsuranceValidTo >= AdmissionDate THEN
	RETURN Accept()
  ELSE
	// Check with insurance provider system
	response = CALL InsuranceProviderAPI(InsuranceNumber, AdmissionDate)

	IF response.IsValid THEN
	  Accept()
	ELSE
	  Warning(f"Insurance expired on {InsuranceValidTo}")
	  Accept()  // Allow but warn
	END IF
  END IF
END FUNCTION
```

**Notes:** 
- This rule is computationally intensive and runs asynchronously
- Returns warning to user, not blocking
- Requires integration with insurance provider API

---

#### Rule INS-R005: Payment Method Required

**Rule ID:** INS-R005  
**Rule Name:** Payment Method Required  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** PaymentMethod  
**Trigger:** On Save  
**Priority:** High  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- Payment method must be documented for administrative purposes

**Valid Values:** Cash, CreditCard, DebitCard, Insurance, Other

**Validation Logic:**
```
IF PaymentMethod IS NOT NULL AND PaymentMethod IN (
  "Cash", "CreditCard", "DebitCard", "Insurance", "Other"
) THEN
  Accept()
ELSE
  Error("Payment method must be selected")
END IF
```

---

### Category: Emergency Contact (EMG)

#### Rule EMG-R001: Emergency Contact Validation

**Rule ID:** EMG-R001  
**Rule Name:** Emergency Contact Validation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** EmergencyContactName, EmergencyContactPhone, EmergencyContactRelationship  
**Trigger:** On Save  
**Priority:** Medium  
**Severity Level:** Warning  
**Allow Continue:** Yes  

**Business Rule:**
- Emergency contact information must be complete or empty (all-or-nothing)
- If name provided, phone and relationship must also be provided
- If none provided, that's acceptable (warning may be issued)

**Validation Logic:**
```
hasName = EmergencyContactName IS NOT NULL AND EmergencyContactName.TRIM() != ""
hasPhone = EmergencyContactPhone IS NOT NULL AND EmergencyContactPhone.TRIM() != ""
hasRelationship = EmergencyContactRelationship IS NOT NULL

IF NOT hasName THEN
  Accept()  // No emergency contact provided
ELSE IF hasName AND hasPhone AND hasRelationship THEN
  Accept()  // Complete emergency contact
ELSE IF hasName AND NOT (hasPhone AND hasRelationship) THEN
  Warning("Emergency contact information is incomplete - name without contact details")
  Accept()
ELSE
  Accept()
END IF
```

**Valid Relationship Values:** Spouse, Parent, Child, Sibling, Relative, Friend, Other

---

### Category: Clinical History (CLI)

#### Rule CLI-R001: Allergy Documentation

**Rule ID:** CLI-R001  
**Rule Name:** Allergy Documentation  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** Allergies, MedicalConditions, CurrentMedications  
**Trigger:** On Save (AI Analysis - Async)  
**Priority:** Medium  
**Severity Level:** Warning  
**Allow Continue:** Yes  
**Data Source:** AI/LLM Analysis  

**Business Rule:**
- AI should detect if patient medical history suggests allergies that aren't documented
- Helps prevent clinician from missing important information
- Alert without blocking

**AI Analysis Logic:**
```
ASYNC FUNCTION AnalyzePossibleAllergies()
  inputs = {
	medicalConditions: MedicalConditions,
	medications: CurrentMedications,
	allergies: Allergies
  }

  aiAnalysis = CALL LLMService(
	prompt: "Based on this patient's medical history, what allergies should be documented?",
	data: inputs
  )

  IF aiAnalysis.suggestedAllergies NOT EMPTY THEN
	Warning(f"Patient may have allergies: {aiAnalysis.suggestedAllergies}")
  END IF
END FUNCTION
```

**Notes:**
- Requires LLM service integration
- Should provide concrete suggestions for allergens
- May reduce false positives in drug interaction checking

---

#### Rule CLI-R002: Chronic Disease ICD Coding

**Rule ID:** CLI-R002  
**Rule Name:** Chronic Disease ICD Coding  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** ChronicDiseases, MedicalConditions  
**Trigger:** On Save (Database + AI)  
**Priority:** Medium  
**Severity Level:** Warning  
**Allow Continue:** Yes  
**Data Source:** Database (ICD-10) + AI  

**Business Rule:**
- Chronic diseases should use standardized ICD-10 codes
- System should validate codes against official ICD database
- Should suggest proper codes if provided text is incomplete

**Validation Logic:**
```
FUNCTION ValidateIcdCoding(diseaseText)
  // First check if text already contains valid ICD code
  icdCode = ExtractIcdCode(diseaseText)

  IF icdCode IS NOT NULL THEN
	IF ValidateAgainstIcdDatabase(icdCode) THEN
	  RETURN Accept()
	ELSE
	  RETURN Warning(f"ICD code {icdCode} not found in official database")
	END IF
  END IF

  // If no code, try to suggest one
  suggestions = CALL IcdLookupService(diseaseText)

  IF suggestions.count > 0 THEN
	RETURN Warning(f"Could you specify ICD code? Suggestion: {suggestions[0]}")
  ELSE
	RETURN Info("Disease description noted - clinical staff will assign ICD code")
  END IF
END FUNCTION
```

**Notes:**
- Requires access to official Vietnamese ICD-10 database
- Available in: docs/analysis/03_Icd_data/
- Should support both code-first and text-first input

---

#### Rule CLI-R003: Drug Interaction Warning

**Rule ID:** CLI-R003  
**Rule Name:** Drug Interaction Warning  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** CurrentMedications, Allergies  
**Trigger:** On Save (AI Analysis - Async)  
**Priority:** High  
**Severity Level:** Warning  
**Allow Continue:** Yes  
**Data Source:** AI/LLM + External Drug Database  

**Business Rule:**
- AI should analyze current medications against known allergies
- Should detect potential drug-allergy interactions
- Alert clinician but don't block

**AI Analysis Logic:**
```
ASYNC FUNCTION AnalyzeDrugInteractions()
  medications = ParseMedicationList(CurrentMedications)
  allergies = ParseAllergyList(Allergies)

  interactions = CALL AIService(
	action: "analyze_drug_interactions",
	medications: medications,
	allergies: allergies
  )

  IF interactions.contraindications.count > 0 THEN
	severity = interactions.severity  // High/Medium/Low
	message = FormatInteractionWarnings(interactions)
	Warning(f"Potential drug-allergy conflicts: {message}")
  END IF
END FUNCTION
```

**Example Contraindications:**
- Penicillin medications + Penicillin allergy
- NSAIDs + Aspirin allergy
- Certain antibiotics + Sulfonamide allergy

---

### Category: Administrative (ADM)

#### Rule ADM-R001: Data Completeness Check

**Rule ID:** ADM-R001  
**Rule Name:** Data Completeness Check  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** All required fields  
**Trigger:** On Save (First validation step)  
**Priority:** Critical  
**Severity Level:** Error  
**Allow Continue:** No  

**Business Rule:**
- All mandatory fields must be filled before form submission
- No empty required fields allowed
- This is the first validation gate

**Required Field List:**
- FullName (or FirstName + LastName)
- DateOfBirth
- Gender
- CurrentAddress
- PrimaryPhone
- InsuranceType
- PaymentMethod

**Validation Logic:**
```
FUNCTION CheckCompletenessBeforeSave()
  requiredFields = [
	FullName, DateOfBirth, Gender,
	CurrentAddress, PrimaryPhone,
	InsuranceType, PaymentMethod
  ]

  missingFields = []

  FOR EACH field IN requiredFields DO
	IF field IS NULL OR field.TRIM() = "" THEN
	  missingFields.Add(field)
	END IF
  END FOR

  IF missingFields.count > 0 THEN
	Error(f"Required fields missing: {missingFields.JoinWith(', ')}")
  ELSE
	Accept()
  END IF
END FUNCTION
```

---

#### Rule ADM-R002: Audit Trail Log

**Rule ID:** ADM-R002  
**Rule Name:** Audit Trail Log  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** Record level (all fields)  
**Trigger:** On Save (after successful validation)  
**Priority:** Critical  
**Severity Level:** Info (Compliance)  
**Allow Continue:** Yes  

**Business Rule:**
- Every patient record creation/modification must be logged
- Log must include: user ID, timestamp, all changes
- Required for healthcare compliance and audit trail

**Logging Logic:**
```
FUNCTION LogAuditTrail()
  auditEntry = {
	timestamp: NOW(),
	userId: CURRENT_USER_ID(),
	action: (isNew ? "CREATE" : "UPDATE"),
	patientId: PatientID,
	changes: {
	  field1: {before: oldValue1, after: newValue1},
	  field2: {before: oldValue2, after: newValue2},
	  // ... for each changed field
	},
	ipAddress: REQUEST_IP(),
	userAgent: REQUEST_USER_AGENT()
  }

  INSERT INTO AuditLog VALUES auditEntry

  RETURN Accept()
END FUNCTION
```

**Audit Log Schema:**
- AuditID (primary key)
- Timestamp
- UserID
- PatientID
- Action (Create/Update/Delete)
- FieldName
- OldValue
- NewValue
- IPAddress
- UserAgent

---

#### Rule ADM-R003: Data Privacy (PII Protection)

**Rule ID:** ADM-R003  
**Rule Name:** Data Privacy (PII Protection)  
**Module:** Patient Intake  
**Form:** Tiếp Nhận  
**Fields:** All PII fields  
**Trigger:** On Save, On Retrieve  
**Priority:** Critical  
**Severity Level:** Error (if security compromised)  
**Allow Continue:** No  

**Business Rule:**
- All Personally Identifiable Information (PII) must be encrypted at rest
- Access to PII must be logged
- Only authorized users can decrypt/view PII
- Complies with healthcare privacy regulations

**PII Fields Requiring Encryption:**
- FullName, FirstName, LastName
- DateOfBirth
- NationalID, PassportNumber
- CurrentAddress, PermanentAddress
- PrimaryPhone, AlternativePhone
- Email
- EmergencyContactName, EmergencyContactPhone

**Security Logic:**
```
FUNCTION ProtectPiiOnSave()
  encryptionKey = GetEncryptionKey()  // From secure key management service

  FOR EACH piiField IN [Name, DOB, Phone, Email, Address, ID] DO
	IF piiField IS NOT NULL THEN
	  encryptedValue = AES256_ENCRYPT(piiField.value, encryptionKey)
	  database.UpdateField(piiField.name, encryptedValue)
	END IF
  END FOR

  LogAccessEvent(
	action: "PII_ENCRYPTED",
	userId: CURRENT_USER_ID(),
	patientId: PatientID,
	timestamp: NOW()
  )

  RETURN Accept()
END FUNCTION

FUNCTION RetrievePiiForDisplay()
  CheckAccess(CURRENT_USER_ID(), PatientID)  // Authorization check

  IF NOT HasAccess THEN
	LogAccessEvent(action: "PII_ACCESS_DENIED", ...)
	BLOCK_RETRIEVAL()
  END IF

  encryptionKey = GetEncryptionKey()

  FOR EACH piiField IN patient.piiFields DO
	decryptedValue = AES256_DECRYPT(piiField.encryptedValue, encryptionKey)
	piiField.displayValue = decryptedValue
  END FOR

  LogAccessEvent(
	action: "PII_ACCESSED",
	userId: CURRENT_USER_ID(),
	patientId: PatientID,
	timestamp: NOW()
  )

  RETURN patient
END FUNCTION
```

---

## Rule Execution Framework

### Validation Pipeline Architecture

```
Form Submission Request
	↓
┌─────────────────────────────────────────┐
│ STAGE 1: COMPLETENESS CHECK             │
│ (Rule: ADM-R001)                        │
│ ├─ All required fields present?         │
│ └─ [IF FAIL] → Error, Block Save        │
└─────────────────────────────────────────┘
	↓
┌─────────────────────────────────────────┐
│ STAGE 2: LOCAL VALIDATIONS              │
│ (15 rules, parallel execution)          │
│ Execute in parallel:                    │
│ ├─ Demographics: DEM-R001-005           │
│ ├─ Contact: CON-R001-004                │
│ ├─ Insurance: INS-R001-003, INS-R005    │
│ ├─ Emergency: EMG-R001                  │
│ └─ [IF ANY FAIL] → Error, Block Save    │
└─────────────────────────────────────────┘
	↓
┌─────────────────────────────────────────┐
│ STAGE 3: DATABASE VALIDATIONS           │
│ (2 rules, parallel execution)           │
│ Execute in parallel:                    │
│ ├─ DEM-R006: Duplicate detection        │
│ ├─ CLI-R002: ICD validation             │
│ └─ [IF FAIL] → Warning, Prompt User     │
│              (may block based on policy) │
└─────────────────────────────────────────┘
	↓
┌─────────────────────────────────────────┐
│ STAGE 4: SAVE TO DATABASE               │
│ (After all blocking validations pass)   │
│ ├─ ADM-R003: Encrypt PII                │
│ ├─ ADM-R001: Final check                │
│ └─ Write patient record                 │
└─────────────────────────────────────────┘
	↓
┌─────────────────────────────────────────┐
│ STAGE 5: ASYNC BACKGROUND TASKS         │
│ (After successful save, non-blocking)   │
│ Execute asynchronously:                 │
│ ├─ INS-R004: Insurance validity check   │
│ ├─ CLI-R001: Allergy analysis           │
│ ├─ CLI-R003: Drug interaction analysis  │
│ ├─ ADM-R002: Audit logging              │
│ └─ Results shown to user post-save      │
└─────────────────────────────────────────┘
	↓
Save Complete ✓
```

---

## Configuration Reference

### Enumeration Values

**Gender:**
- M: Male
- F: Female  
- O: Other
- U: Unspecified

**Insurance Type:**
- BHYT: Bảo hiểm Y tế (National Health Insurance)
- Private: Private/Commercial Insurance
- Self-Pay: Patient pays own
- Other: Other insurance type
- None: No insurance

**Payment Method:**
- Cash: Cash payment
- CreditCard: Credit card
- DebitCard: Debit card
- Insurance: Insurance covers
- Other: Other payment method

**Emergency Contact Relationship:**
- Spouse: Husband/Wife
- Parent: Father/Mother
- Child: Son/Daughter
- Sibling: Brother/Sister
- Relative: Other family member
- Friend: Close friend
- Other: Other relationship

---

## Performance Guidelines

### Validation Timeouts

| Validation Stage | Max Response Time | Notes |
|---|---|---|
| Stage 1: Completeness | 50ms | Must be synchronous |
| Stage 2: Local | 200ms | Parallelizable |
| Stage 3: Database | 1000ms | May be async in future |
| Stage 4: Save | 200ms | Async I/O acceptable |
| Stage 5: Background | No limit | Async background processing |

### Concurrent User Targets

- 100 concurrent users submitting forms simultaneously
- Average response time: < 2 seconds
- Peak response time: < 5 seconds

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Status:** DRAFT - Awaiting Stakeholder Review

