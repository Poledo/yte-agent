# Task-023: Business Analysis Report for AI Validation Platform

## Executive Summary

This document provides comprehensive business analysis and Rule Catalog development for the VNPT-HIS AI Validation Platform. The system is designed to perform business rule validation before data storage or critical operations, with Rule Engine as the primary validation mechanism and AI providing supplementary validation.

**Document Structure:**
1. Screen Analysis
2. Field Inventory
3. Rule Analysis
4. Rule Classification
5. Data Source Analysis
6. Trigger Analysis
7. Rule Dependency
8. Rule Catalog
9. Validation Workflow
10. Questions / Missing Information

---

## 1. Screen Analysis

### Screen: Tiếp Nhận (Patient Intake)
**File:** 01_TiepNhan.jpg

#### Screen Purpose
- Register new patients or retrieve existing patient information at hospital admission
- Collect primary patient demographic and administrative data
- Initial validation point for patient intake process
- Foundation for all downstream clinical workflow steps

#### Business Process Flow
1. Patient arrives at hospital
2. Receptionist searches for existing patient record
3. If new patient: Create new patient record with basic information
4. If existing patient: Retrieve and update information as needed
5. Validate all required information is complete
6. Complete intake and proceed to clinical departments

#### Information Groups
Based on typical HIS intake forms, the following information groups are expected:

**A. Patient Demographics**
- Full Name / Last Name / First Name
- Date of Birth / Age
- Gender (Male/Female/Other)
- National ID Number
- Passport/Travel Document Number
- Ethnic Group

**B. Contact Information**
- Current Address
- Permanent Address
- Phone Number (primary)
- Phone Number (alternative)
- Email (if available)

**C. Insurance & Payment**
- Insurance Type (BHYT/Private/Other)
- Insurance Number
- Insurance Validity Period
- Payment Method
- Employer Information

**D. Emergency Contact**
- Emergency Contact Name
- Emergency Contact Relationship
- Emergency Contact Phone

**E. Clinical History (Initial)**
- Allergies
- Known Medical Conditions
- Current Medications
- Previous Surgeries

#### Expected Field List
| Group | Field Name | Data Type | Format | Required |
|-------|-----------|-----------|--------|----------|
| Demographics | FullName | Text | Max 255 chars | Yes |
| Demographics | DateOfBirth | Date | DD/MM/YYYY | Yes |
| Demographics | Age | Integer | Years | Derived |
| Demographics | Gender | Enum | M/F/O | Yes |
| Demographics | NationalID | Text | Format: X-XXXXXX-XXXXXX | Conditional |
| Demographics | PassportNumber | Text | Alphanumeric | Conditional |
| Demographics | EthnicGroup | Enum | List of ethnicities | No |
| Contact | CurrentAddress | Text | Max 500 chars | Yes |
| Contact | PermanentAddress | Text | Max 500 chars | No |
| Contact | PrimaryPhone | Text | Vietnamese format | Yes |
| Contact | AlternativePhone | Text | Vietnamese format | No |
| Contact | Email | Text | Valid email format | No |
| Insurance | InsuranceType | Enum | BHYT/Private/Other | Yes |
| Insurance | InsuranceNumber | Text | Alphanumeric | Conditional |
| Insurance | ValidFrom | Date | DD/MM/YYYY | Conditional |
| Insurance | ValidTo | Date | DD/MM/YYYY | Conditional |
| Clinical | Allergies | Text | Max 1000 chars | No |
| Clinical | MedicalConditions | Text | Max 1000 chars | No |
| Clinical | CurrentMedications | Text | Max 1000 chars | No |

#### Key Event Handlers
| Event | Trigger | Expected Behavior |
|-------|---------|-------------------|
| Load | Screen initialization | Load patient list if search performed |
| Search | Search button click | Query patient by ID/Name |
| New Patient | New button click | Clear form, enable all fields |
| Select | Patient selected from list | Populate form with patient data |
| Save | Save button click | Validate all fields, save to database |
| DateOfBirth Changed | Blur on DOB field | Auto-calculate age |
| Insurance Type Changed | Selection changed | Enable/disable insurance fields |
| Phone Validation | Blur on phone field | Validate Vietnamese phone format |
| Clear | Clear button click | Reset all fields |
| Next | Proceed button click | Validate and move to next step |

#### Important Observations
- This is the primary data entry point for the system
- Most fields are reusable across other healthcare processes
- Date validations are critical (e.g., DOB must be in past)
- Insurance field validations are complex (type-dependent)
- Phone number format is specific to Vietnam
- Gender and ethnic group use predefined enumerations

---

## 2. Field Inventory

### Consolidated Field List from All Screens
(Note: Only "Tiếp Nhận" form available - additional screens should follow same structure)

#### Category: Demographics
| Field Code | Field Name | Data Type | Format/Enum | Required | Length |
|------------|-----------|-----------|-------------|----------|---------|
| DEM-001 | FullName | String | Max 255 | Yes | 255 |
| DEM-002 | FirstName | String | Max 100 | Conditional | 100 |
| DEM-003 | LastName | String | Max 100 | Conditional | 100 |
| DEM-004 | DateOfBirth | Date | DD/MM/YYYY | Yes | - |
| DEM-005 | Age | Integer | Years (0-150) | Computed | - |
| DEM-006 | Gender | Enum | M/F/O/U | Yes | - |
| DEM-007 | NationalID | String | X-XXXXXX-XXXXXX | Conditional | - |
| DEM-008 | PassportNumber | String | Alphanumeric | Conditional | 50 |
| DEM-009 | EthnicGroup | Enum | Vietnam ethnic groups | No | - |

#### Category: Contact Information
| Field Code | Field Name | Data Type | Format/Enum | Required | Length |
|------------|-----------|-----------|-------------|----------|---------|
| CON-001 | CurrentAddress | String | Max 500 | Yes | 500 |
| CON-002 | PermanentAddress | String | Max 500 | No | 500 |
| CON-003 | PrimaryPhone | String | Vietnam phone | Yes | - |
| CON-004 | AlternativePhone | String | Vietnam phone | No | - |
| CON-005 | Email | String | Valid email | No | 255 |

#### Category: Insurance & Payment
| Field Code | Field Name | Data Type | Format/Enum | Required | Length |
|------------|-----------|-----------|-------------|----------|---------|
| INS-001 | InsuranceType | Enum | BHYT/Private/Other | Yes | - |
| INS-002 | InsuranceNumber | String | Alphanumeric | Conditional | 50 |
| INS-003 | InsuranceValidFrom | Date | DD/MM/YYYY | Conditional | - |
| INS-004 | InsuranceValidTo | Date | DD/MM/YYYY | Conditional | - |
| INS-005 | EmployerName | String | Max 255 | Conditional | 255 |
| INS-006 | EmployerCode | String | Alphanumeric | Conditional | 20 |
| INS-007 | PaymentMethod | Enum | Cash/Card/Insurance | Yes | - |

#### Category: Emergency Contact
| Field Code | Field Name | Data Type | Format/Enum | Required | Length |
|------------|-----------|-----------|-------------|----------|---------|
| EMG-001 | EmergencyContactName | String | Max 255 | Conditional | 255 |
| EMG-002 | EmergencyContactPhone | String | Vietnam phone | Conditional | - |
| EMG-003 | EmergencyContactRelationship | Enum | Predefined list | Conditional | - |

#### Category: Clinical History (Initial)
| Field Code | Field Name | Data Type | Format/Enum | Required | Length |
|------------|-----------|-----------|-------------|----------|---------|
| CLI-001 | Allergies | String | Free text | No | 1000 |
| CLI-002 | MedicalConditions | String | Free text | No | 1000 |
| CLI-003 | CurrentMedications | String | Free text | No | 1000 |
| CLI-004 | ChronicDiseases | String | ICD-10 codes | No | 1000 |

---

## 3. Rule Analysis

### Overview
Based on the VNPT-HIS intake form and typical healthcare business rules, the following rules have been identified. These rules ensure data quality, business compliance, and clinical safety.

### Identified Business Rules

#### Section A: Patient Demographics Rules

**Rule: DEM-R001 - Date of Birth Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: DateOfBirth, Age
- Trigger: On Blur (DateOfBirth field), On Save
- Condition: DateOfBirth must be in the past AND Age must be between 0 and 150 years
- Expected Outcome: 
  - Accept if valid
  - Error message if future date or age > 150
  - Warning if age > 120 (possible data entry error)
- Type: Local Validation
- Data Source: Form field
- Severity: Error (if invalid age range), Warning (if age > 120)
- Description: Ensures patient date of birth is reasonable and age is computable

**Rule: DEM-R002 - Full Name Required**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: FullName or (FirstName + LastName)
- Trigger: On Save
- Condition: FullName must not be empty OR both FirstName and LastName must be provided
- Expected Outcome: Accept if either condition met, Error otherwise
- Type: Local Validation
- Data Source: Form fields
- Severity: Error
- Description: Ensures patient has identifiable name

**Rule: DEM-R003 - Gender Field Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: Gender
- Trigger: On Change, On Save
- Condition: Gender must be one of predefined values (M/F/O/U)
- Expected Outcome: Accept if valid enum value, Error otherwise
- Type: Local Validation
- Data Source: Form enumeration
- Severity: Error
- Description: Ensures standardized gender representation

**Rule: DEM-R004 - Patient Identity Requirement**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: NationalID OR PassportNumber
- Trigger: On Save
- Condition: At least one of NationalID or PassportNumber must be provided
- Expected Outcome: Accept if at least one provided, Error otherwise
- Type: Local Validation
- Data Source: Form fields
- Severity: Warning (may depend on organization policy)
- Description: Ensures patient can be uniquely identified

**Rule: DEM-R005 - National ID Format Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: NationalID
- Trigger: On Blur (NationalID field)
- Condition: If provided, NationalID must match Vietnamese format: X-XXXXXX-XXXXXX (where X = digit)
- Expected Outcome: Accept if matches format or empty, Error if invalid format
- Type: Local Validation
- Data Source: Form field
- Severity: Error (if provided with invalid format)
- Description: Validates Vietnamese ID card format

**Rule: DEM-R006 - Duplicate Patient Detection**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: FullName, DateOfBirth, Gender
- Trigger: On Save (after patient search completed)
- Condition: Check if patient with same name, DOB, and gender already exists in database
- Expected Outcome: 
  - If exact match exists: Warn user, suggest matching record
  - If similar match: Allow but prompt for confirmation
- Type: Database Validation
- Data Source: Database (Patient table)
- Severity: Warning
- Description: Prevents duplicate patient records

#### Section B: Contact Information Rules

**Rule: CON-R001 - Required Contact Information**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: CurrentAddress, PrimaryPhone
- Trigger: On Save
- Condition: CurrentAddress and PrimaryPhone must be provided
- Expected Outcome: Accept if both provided, Error otherwise
- Type: Local Validation
- Data Source: Form fields
- Severity: Error
- Description: Ensures hospital can contact patient

**Rule: CON-R002 - Phone Number Format Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: PrimaryPhone, AlternativePhone
- Trigger: On Blur (phone fields)
- Condition: Phone number must match Vietnamese format (e.g., 0XXX-XXXXXX or +84XXX-XXXXXX)
- Expected Outcome: Accept if valid format or empty, Warn if format appears incorrect
- Type: Local Validation
- Data Source: Form field
- Severity: Warning (for alternative), Error (for primary)
- Description: Validates Vietnamese phone number format

**Rule: CON-R003 - Email Format Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: Email
- Trigger: On Blur (email field)
- Condition: If provided, must be valid email format (standard RFC 5322)
- Expected Outcome: Accept if valid format or empty, Error if invalid format
- Type: Local Validation
- Data Source: Form field
- Severity: Warning
- Description: Validates email format

**Rule: CON-R004 - Address Logical Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: CurrentAddress, PermanentAddress
- Trigger: On Save
- Condition: If both addresses provided, they should not be identical (or flag for review)
- Expected Outcome: Accept if different or only one provided, Warn if identical
- Type: Local Validation
- Data Source: Form fields
- Severity: Info (FYI for data quality)
- Description: Data quality check for address information

#### Section C: Insurance & Payment Rules

**Rule: INS-R001 - Insurance Type Required**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: InsuranceType
- Trigger: On Save
- Condition: InsuranceType must be selected (not empty)
- Expected Outcome: Accept if selected, Error otherwise
- Type: Local Validation
- Data Source: Form enumeration
- Severity: Error
- Description: Ensures insurance status is documented

**Rule: INS-R002 - Insurance Number Required for BHYT**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: InsuranceType, InsuranceNumber
- Trigger: On Change (InsuranceType), On Save
- Condition: If InsuranceType = "BHYT", then InsuranceNumber must be provided
- Expected Outcome: Accept if condition met, Error otherwise
- Type: Local Validation
- Data Source: Form fields
- Severity: Error
- Description: Ensures BHYT patients have insurance card number

**Rule: INS-R003 - Insurance Validity Period Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: InsuranceValidFrom, InsuranceValidTo
- Trigger: On Save
- Condition: 
  - ValidFrom must be in past
  - ValidTo must be in future (or today)
  - ValidFrom < ValidTo
- Expected Outcome: Accept if valid, Error if invalid period
- Type: Local Validation
- Data Source: Form fields
- Severity: Warning/Error (depending on organizational policy)
- Description: Ensures current insurance is valid

**Rule: INS-R004 - Insurance Valid at Admission**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: InsuranceNumber, InsuranceValidTo, Admission Date
- Trigger: On Save
- Condition: Insurance ValidTo date must be >= admission date
- Expected Outcome: Accept if insurance is valid on admission date, Warning if expired/expiring
- Type: Database Validation (requires insurance validity data)
- Data Source: Database, external insurance API
- Severity: Error (if expired), Warning (if expiring soon)
- Description: Validates insurance covers admission date

**Rule: INS-R005 - Payment Method Required**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: PaymentMethod
- Trigger: On Save
- Condition: PaymentMethod must be selected
- Expected Outcome: Accept if selected, Error otherwise
- Type: Local Validation
- Data Source: Form enumeration
- Severity: Error
- Description: Ensures payment method is documented

#### Section D: Emergency Contact Rules

**Rule: EMG-R001 - Emergency Contact Validation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: EmergencyContactName, EmergencyContactPhone, EmergencyContactRelationship
- Trigger: On Save
- Condition: If EmergencyContactName provided, then EmergencyContactPhone and Relationship must also be provided
- Expected Outcome: Accept all-or-nothing, Error if partially provided
- Type: Local Validation
- Data Source: Form fields
- Severity: Warning
- Description: Ensures emergency contact information is complete if provided

#### Section E: Clinical History Rules

**Rule: CLI-R001 - Allergy Documentation**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: Allergies
- Trigger: On Save
- Condition: If patient has known allergies, they must be documented
- Expected Outcome: Warning if patient history implies allergies but field is empty
- Type: AI Validation / Clinical Review
- Data Source: AI analysis of medical history, clinical guidelines
- Severity: Warning
- Description: Alerts clinician to document allergies if relevant

**Rule: CLI-R002 - Chronic Disease ICD Coding**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: ChronicDiseases, Allergies, MedicalConditions
- Trigger: On Save
- Condition: Chronic diseases should be coded using valid ICD-10 codes
- Expected Outcome: Accept valid ICD-10 codes, Suggest alternatives for invalid codes
- Type: Database Validation + AI Validation
- Data Source: ICD-10 database, clinical classification system
- Severity: Warning (for coding accuracy)
- Description: Ensures consistent disease documentation

**Rule: CLI-R003 - Drug Interaction Warning**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: CurrentMedications, Allergies
- Trigger: On Save
- Condition: Check for contraindications between listed medications and allergies
- Expected Outcome: Warning if potential drug-allergy conflict exists
- Type: External API Validation / AI Validation
- Data Source: Drug database, allergy/drug interaction knowledge base
- Severity: Warning/Error
- Description: Prevents medication-allergy conflicts

#### Section F: Administrative Rules

**Rule: ADM-R001 - Data Completeness Check**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: All required fields
- Trigger: On Save
- Condition: All mandatory fields must be filled before saving
- Expected Outcome: Error if any required field is empty
- Type: Local Validation
- Data Source: Form field definitions
- Severity: Error
- Description: Prevents incomplete patient records

**Rule: ADM-R002 - Audit Trail Log**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: All fields (record level)
- Trigger: On Save
- Condition: Every patient record creation/modification must be logged with user ID, timestamp, and changes
- Expected Outcome: Record audit entry
- Type: Backend Logging
- Data Source: System audit log
- Severity: Info (compliance requirement)
- Description: Maintains audit trail for compliance

**Rule: ADM-R003 - Data Privacy (PII Protection)**
- Module: Patient Intake
- Form: Tiếp Nhận
- Field: All fields containing PII (Name, ID, Phone, Email, Address)
- Trigger: On Save, On Retrieve
- Condition: Ensure PII data is encrypted and access is logged
- Expected Outcome: Data stored securely, access restricted to authorized users
- Type: Security/Compliance
- Data Source: Database encryption, access control system
- Severity: Error (if security compromised)
- Description: Protects patient privacy

---

## 4. Rule Classification

### Classification Framework

Rules have been classified into the following categories based on how they are validated:

#### A. Local Validation Rules (24 rules)
**Definition:** Rules that are validated entirely using data from the form fields without external dependencies.

**Characteristics:**
- Run on client-side or immediately on server
- No database lookup required
- Fast execution
- Examples: Format validation, required field checks, basic logic

**Rules in this category:**
- DEM-R001: Date of Birth Validation
- DEM-R002: Full Name Required
- DEM-R003: Gender Field Validation
- DEM-R004: Patient Identity Requirement (at least one ID)
- DEM-R005: National ID Format Validation
- CON-R001: Required Contact Information
- CON-R002: Phone Number Format Validation
- CON-R003: Email Format Validation
- CON-R004: Address Logical Validation
- INS-R001: Insurance Type Required
- INS-R002: Insurance Number Required for BHYT
- INS-R003: Insurance Validity Period Validation
- INS-R005: Payment Method Required
- EMG-R001: Emergency Contact Validation
- ADM-R001: Data Completeness Check

**Rationale:** These rules prevent obviously incorrect data from entering the system and provide immediate feedback to users.

#### B. Database Validation Rules (3 rules)
**Definition:** Rules that require database lookup to validate business logic.

**Characteristics:**
- Require access to existing database records
- May be slower than local validation
- Prevent logical inconsistencies with system state
- Examples: Duplicate detection, reference validity

**Rules in this category:**
- DEM-R006: Duplicate Patient Detection
- INS-R004: Insurance Valid at Admission (requires insurance validity data)
- CLI-R002: Chronic Disease ICD Coding (requires ICD-10 database)

**Rationale:** These rules ensure new data doesn't violate system constraints or business logic that involves existing data.

#### C. External API Validation Rules (2 rules)
**Definition:** Rules that require integration with external systems or databases.

**Characteristics:**
- Require real-time API calls
- May have latency implications
- Validate against third-party data sources
- Examples: Insurance validation, drug interaction checks

**Rules in this category:**
- INS-R004: Insurance Valid at Admission (external insurance system API)
- CLI-R003: Drug Interaction Warning (external drug database)

**Rationale:** These rules validate against systems outside of VNPT-HIS that provide authoritative data.

#### D. AI Validation Rules (3 rules)
**Definition:** Rules that require AI/semantic analysis for validation.

**Characteristics:**
- Require natural language understanding or complex inference
- Help detect logical inconsistencies or missing data
- Provide clinical intelligence and decision support
- Cannot be validated by simple rules alone

**Rules in this category:**
- CLI-R001: Allergy Documentation (AI analyzes if patient data suggests undocumented allergies)
- CLI-R002: Chronic Disease ICD Coding (AI assists in proper ICD-10 classification)
- CLI-R003: Drug Interaction Warning (AI analyzes complex medication interactions)

**Rationale:** These rules provide intelligent validation that goes beyond simple business logic.

#### E. Security/Compliance Rules (2 rules)
**Definition:** Rules related to security, audit logging, and regulatory compliance.

**Characteristics:**
- Ensure system integrity and compliance
- May not block user actions but ensure logging
- Critical for healthcare regulatory compliance
- Examples: Audit logging, data encryption, access control

**Rules in this category:**
- ADM-R002: Audit Trail Log
- ADM-R003: Data Privacy (PII Protection)

**Rationale:** These rules are non-functional requirements that must be implemented at infrastructure/platform level.

### Summary by Classification

| Classification | Count | Execution Context | Typical Performance |
|---|---|---|---|
| Local Validation | 15 | Client/Server | < 100ms |
| Database Validation | 3 | Server | 100-500ms |
| External API Validation | 2 | Async Service | 500-5000ms |
| AI Validation | 3 | Async Service | 2-30s |
| Security/Compliance | 2 | Platform/Infrastructure | Varies |
| **TOTAL** | **25** | - | - |

---

## 5. Data Source Analysis

### Data Source Mapping for Each Rule

#### From Form Fields (Form-based Data)
Rules that validate data entered directly by user or pre-populated from form:

| Rule | Primary Field | Secondary Fields | Source Type |
|------|---------------|------------------|-------------|
| DEM-R001 | DateOfBirth | Age | Form input |
| DEM-R002 | FullName | FirstName, LastName | Form input |
| DEM-R003 | Gender | - | Form selection |
| DEM-R004 | NationalID | PassportNumber | Form input |
| DEM-R005 | NationalID | - | Form input |
| CON-R001 | CurrentAddress | PrimaryPhone | Form input |
| CON-R002 | PrimaryPhone | AlternativePhone | Form input |
| CON-R003 | Email | - | Form input |
| CON-R004 | CurrentAddress | PermanentAddress | Form input |
| INS-R001 | InsuranceType | - | Form selection |
| INS-R002 | InsuranceType | InsuranceNumber | Form input/selection |
| INS-R003 | InsuranceValidFrom | InsuranceValidTo | Form input |
| INS-R005 | PaymentMethod | - | Form selection |
| EMG-R001 | EmergencyContactName | EmergencyContactPhone, Relationship | Form input |
| ADM-R001 | All required fields | - | Form input |

#### From Database
Rules that require database lookups:

| Rule | Query Target | Key Fields | Data Needed |
|------|-------------|-----------|------------|
| DEM-R006 | Patient table | FullName, DateOfBirth, Gender | Existing patient records |
| INS-R004 | Insurance validity table | InsuranceNumber | Current insurance validity |
| CLI-R002 | ICD-10 code table | Disease codes | Valid ICD-10 codes and metadata |

#### From External APIs
Rules requiring external system integrations:

| Rule | External System | API Type | Data Needed |
|------|----------------|----------|------------|
| INS-R004 | Insurance provider system | REST/SOAP API | Real-time insurance validation |
| CLI-R003 | Drug interaction database | REST API or service | Drug interaction knowledge base |

#### From AI/LLM
Rules requiring AI analysis:

| Rule | Analysis Type | Input Data | Output Type |
|------|------|----------|------------|
| CLI-R001 | Medical NLP | Medical history fields (Allergies, Medications, Conditions) | Bool (warning needed?) |
| CLI-R002 | Clinical classification | Free-text medical conditions | Suggested ICD-10 codes |
| CLI-R003 | Drug interaction analysis | Medications + Allergies | List of potential interactions |

#### From System/Configuration
Rules using system configuration or predefined enumerations:

| Rule | Configuration | Source |
|------|------|--------|
| DEM-R003 | Gender enum values | System configuration |
| INS-R001 | Insurance types | System configuration |
| INS-R005 | Payment methods | System configuration |
| EMG-R001 | Relationship types | System configuration |

### Data Dependencies Diagram

```
Form Fields (User Input)
├── DEM-R001, DEM-R002, DEM-R003, DEM-R004, DEM-R005 (Demographics)
├── CON-R001, CON-R002, CON-R003, CON-R004 (Contact)
├── INS-R001, INS-R002, INS-R003, INS-R005 (Insurance)
├── EMG-R001 (Emergency Contact)
└── ADM-R001 (Completeness)

Database (System Data)
├── DEM-R006 (Duplicate detection)
├── INS-R004 (Insurance validity)
└── CLI-R002 (ICD-10 validation)

External APIs
├── INS-R004 (Insurance provider validation)
└── CLI-R003 (Drug interaction database)

AI/LLM
├── CLI-R001 (Allergy detection)
├── CLI-R002 (ICD coding assistance)
└── CLI-R003 (Drug interaction analysis)

System Configuration
├── DEM-R003 (Gender values)
├── INS-R001 (Insurance types)
├── INS-R005 (Payment methods)
└── EMG-R001 (Relationship types)
```

---

## 6. Trigger Analysis

### Rule Trigger Types and Timing

#### A. Real-time Triggers (User Interaction)

**On Change**
Rules that execute whenever field value changes:
- DEM-R003: Gender Field Validation
- INS-R002: Insurance Number Required for BHYT (when InsuranceType changes)

**On Blur / On Focus Out**
Rules that execute when user leaves a field:
- DEM-R001: Date of Birth Validation (age auto-calculation)
- DEM-R005: National ID Format Validation
- CON-R002: Phone Number Format Validation
- CON-R003: Email Format Validation

**On Click**
Rules that execute on button click:
- (No specific rules identified for initial form)

#### B. Form Submission Trigger

**On Save / On Submit**
Rules that execute when user saves/submits the form - most comprehensive validation point:
- DEM-R001: Date of Birth Validation (comprehensive check)
- DEM-R002: Full Name Required
- DEM-R004: Patient Identity Requirement
- DEM-R006: Duplicate Patient Detection
- CON-R001: Required Contact Information
- INS-R001: Insurance Type Required
- INS-R002: Insurance Number Required for BHYT
- INS-R003: Insurance Validity Period Validation
- INS-R004: Insurance Valid at Admission
- INS-R005: Payment Method Required
- EMG-R001: Emergency Contact Validation
- CLI-R001: Allergy Documentation
- CLI-R002: Chronic Disease ICD Coding
- CLI-R003: Drug Interaction Warning
- ADM-R001: Data Completeness Check
- ADM-R002: Audit Trail Log
- ADM-R003: Data Privacy (PII Protection)

#### C. Asynchronous/Background Trigger

**Background Processing (Post-Save)**
Rules that run after form submission:
- DEM-R006: Duplicate Patient Detection (may run async for performance)
- INS-R004: Insurance Valid at Admission (external API call)
- CLI-R001: Allergy Documentation (AI analysis)
- CLI-R002: Chronic Disease ICD Coding (AI analysis)
- CLI-R003: Drug Interaction Warning (AI analysis)
- ADM-R002: Audit Trail Log

**Scheduled/Periodic**
Rules that run on a schedule:
- None identified for patient intake form initially

#### D. Workflow Trigger

**After Previous Step Completed**
Rules triggered based on workflow state:
- Intake form validation must complete before proceeding to next step (e.g., Consultation)

### Trigger Execution Sequence

```
User Opens Form
  ↓
Form Loads → [Display predefined values if existing patient]
  ↓
User Enters Data
  ↓
On Field Blur/Change → [Real-time validation: DEM-R001, DEM-R005, CON-R002, CON-R003, DEM-R003, INS-R002]
  ↓
User Clicks Save
  ↓
On Save → [All validation rules execute in sequence]
  ├── Local Validation (immediate) → [DEM-R002, DEM-R004, CON-R001, INS-R001, INS-R002, INS-R003, INS-R005, EMG-R001, ADM-R001]
  ├── Database Validation (fast) → [DEM-R006, CLI-R002]
  ├── External API (potentially slow) → [INS-R004]
  └── AI Validation (async) → [CLI-R001, CLI-R002, CLI-R003]
  ↓
If All Local Validations Pass → [Allow Save, Show Async Results]
If Any Local Validation Fails → [Block Save, Show Errors]
  ↓
If Async Validation Issues Found → [Show Warnings/Alerts Post-Save]
  ↓
Audit & Logging → [ADM-R002, ADM-R003]
  ↓
Next Step Available
```

### Trigger Performance Considerations

| Trigger Type | Typical Latency | User Experience | Error Blocking |
|---|---|---|---|
| On Blur | < 100ms | Immediate feedback | No |
| On Save (Local) | < 500ms | Brief processing | Yes |
| On Save (Database) | 500ms-2s | Noticeable wait | Yes |
| On Save (External API) | 2-10s | Longer wait | May be async |
| Async Background | N/A | Post-save processing | No (warning only) |

---

## 7. Rule Dependency Analysis

### Dependencies Between Rules

#### Type 1: Sequential Dependencies
Rules that must succeed in a specific order:

```
DEM-R001 (DOB valid) 
  ↓ prerequisite for
DEM-R006 (Duplicate detection using DOB)

INS-R001 (Insurance type selected)
  ↓ prerequisite for
INS-R002 (Insurance number validation for selected type)
  ↓ prerequisite for
INS-R003 (Validity period validation for selected type)
  ↓ prerequisite for
INS-R004 (Insurance valid at admission)
```

#### Type 2: Conditional Dependencies
Rules that apply only if certain conditions are met:

```
DEM-R004 (Patient identity required)
  ← depends on field content
If NationalID provided: DEM-R005 must validate its format
```

#### Type 3: Mutual Dependencies
Rules that relate to the same domain:

```
DEM-R002 (Name required) 
  + DEM-R003 (Gender required)
  + DEM-R004 (ID required)
  → All must pass for patient to be uniquely identifiable

CLI-R001 (Allergy documentation)
  + CLI-R003 (Drug interaction)
  → Both needed for medication safety
```

#### Type 4: Data Chain Dependencies

```
DEM-R006 (Duplicate detection)
  ← requires data from: FullName (DEM-R002), DateOfBirth (DEM-R001), Gender (DEM-R003)
  ← all must complete first for duplicate check to be meaningful

CLI-R003 (Drug interaction)
  ← requires data from: CurrentMedications (form), Allergies (form)
  ← cannot execute without medication/allergy data
```

### Dependency Matrix

| Rule | Depends On | Blocks | Impacts |
|------|-----------|--------|---------|
| DEM-R001 | None | - | DEM-R006 |
| DEM-R002 | None | - | DEM-R006 |
| DEM-R003 | None | - | DEM-R006 |
| DEM-R004 | None | - | - |
| DEM-R005 | DEM-R004 | DEM-R006 | - |
| DEM-R006 | DEM-R001, DEM-R002, DEM-R003 | Next Step | - |
| CON-R001 | None | - | - |
| CON-R002 | None | - | - |
| CON-R003 | None | - | - |
| CON-R004 | None | - | - |
| INS-R001 | None | - | INS-R002 |
| INS-R002 | INS-R001 | - | INS-R003 |
| INS-R003 | INS-R002 | - | INS-R004 |
| INS-R004 | INS-R003 | Next Step | - |
| INS-R005 | None | - | - |
| EMG-R001 | None | - | - |
| CLI-R001 | None | - | - |
| CLI-R002 | None | - | CLI-R003 |
| CLI-R003 | CLI-R002 | - | - |
| ADM-R001 | All Required Fields | Save | - |
| ADM-R002 | ADM-R001 (after success) | - | - |
| ADM-R003 | ADM-R001 (after success) | - | - |

### Recommended Validation Order

**Phase 1: Local Validation (Synchronous, Blocking)**
```
1. ADM-R001: Completeness check (blocks everything else if fails)
2. DEM-R002: Name validation
3. DEM-R003: Gender validation
4. DEM-R001: DOB validation
5. DEM-R004: Identity requirement
6. DEM-R005: ID format (if ID provided)
7. CON-R001: Contact info required
8. CON-R002: Phone format
9. CON-R003: Email format
10. INS-R001: Insurance type selected
11. INS-R002: Insurance number (if BHYT selected)
12. INS-R003: Insurance validity
13. INS-R005: Payment method
14. EMG-R001: Emergency contact consistency
15. CON-R004: Address logical check
```
**Expected Outcome:** Blocks save if any fail

**Phase 2: Database Validation (Synchronous, May be Async)**
```
16. DEM-R006: Duplicate detection (using validated Name, DOB, Gender)
17. CLI-R002: ICD code validation (if chronic diseases entered)
```
**Expected Outcome:** Warning/confirmation needed for duplicates

**Phase 3: Asynchronous Validation (Post-Save)**
```
18. INS-R004: Insurance validity via external API
19. CLI-R001: Allergy documentation via AI
20. CLI-R003: Drug interaction analysis via AI
```
**Expected Outcome:** Show alerts/warnings after save completes

**Phase 4: Security & Compliance (Always Executed)**
```
21. ADM-R002: Audit logging
22. ADM-R003: Data encryption & privacy compliance
```

---

## 8. Rule Catalog (Complete)

### Master Rule Catalog

| # | Rule Code | Rule Name | Module | Form | Field(s) | Trigger | Rule Type | Data Source | Severity | Allow Continue | Description |
|---|-----------|-----------|--------|------|---------|---------|-----------|-------------|----------|---|---|
| 1 | DEM-R001 | Date of Birth Validation | Intake | Tiếp Nhận | DateOfBirth, Age | On Blur, On Save | Local | Form | Error/Warning | No/Yes | Age must be 0-150, DOB must be past date |
| 2 | DEM-R002 | Full Name Required | Intake | Tiếp Nhận | FullName or (FirstName + LastName) | On Save | Local | Form | Error | No | At least one name format must be provided |
| 3 | DEM-R003 | Gender Field Validation | Intake | Tiếp Nhận | Gender | On Change, On Save | Local | Form + Config | Error | No | Gender must be valid enum value (M/F/O/U) |
| 4 | DEM-R004 | Patient Identity Requirement | Intake | Tiếp Nhận | NationalID OR PassportNumber | On Save | Local | Form | Warning | Yes | Patient must have at least one ID type |
| 5 | DEM-R005 | National ID Format Validation | Intake | Tiếp Nhận | NationalID | On Blur, On Save | Local | Form | Error | No | Vietnamese ID must match format X-XXXXXX-XXXXXX |
| 6 | DEM-R006 | Duplicate Patient Detection | Intake | Tiếp Nhận | FullName, DateOfBirth, Gender | On Save | Database | Database | Warning | Yes | Check if patient with same name/DOB/gender exists |
| 7 | CON-R001 | Required Contact Information | Intake | Tiếp Nhận | CurrentAddress, PrimaryPhone | On Save | Local | Form | Error | No | Address and phone must be provided |
| 8 | CON-R002 | Phone Number Format Validation | Intake | Tiếp Nhận | PrimaryPhone, AlternativePhone | On Blur, On Save | Local | Form | Error/Warning | No/Yes | Vietnam phone format validation |
| 9 | CON-R003 | Email Format Validation | Intake | Tiếp Nhận | Email | On Blur, On Save | Local | Form | Warning | Yes | Standard RFC 5322 email format |
| 10 | CON-R004 | Address Logical Validation | Intake | Tiếp Nhận | CurrentAddress, PermanentAddress | On Save | Local | Form | Info | Yes | Data quality: addresses should differ if both provided |
| 11 | INS-R001 | Insurance Type Required | Intake | Tiếp Nhận | InsuranceType | On Save | Local | Form + Config | Error | No | Insurance type must be selected |
| 12 | INS-R002 | Insurance Number for BHYT | Intake | Tiếp Nhận | InsuranceType, InsuranceNumber | On Change, On Save | Local | Form | Error | No | If BHYT selected, insurance number is required |
| 13 | INS-R003 | Insurance Validity Period | Intake | Tiếp Nhận | InsuranceValidFrom, InsuranceValidTo | On Save | Local | Form | Warning/Error | Yes/No | ValidFrom < ValidTo, both logical dates |
| 14 | INS-R004 | Insurance Valid at Admission | Intake | Tiếp Nhận | InsuranceNumber, ValidTo, AdmissionDate | On Save | External API | Database + API | Error/Warning | Yes/No | Insurance must be valid on admission date |
| 15 | INS-R005 | Payment Method Required | Intake | Tiếp Nhận | PaymentMethod | On Save | Local | Form + Config | Error | No | Payment method must be selected |
| 16 | EMG-R001 | Emergency Contact Validation | Intake | Tiếp Nhận | EmergencyContactName, Phone, Relationship | On Save | Local | Form | Warning | Yes | All-or-nothing: if name provided, phone & relationship required |
| 17 | CLI-R001 | Allergy Documentation | Intake | Tiếp Nhận | Allergies, MedicalHistory | On Save | AI | AI/LLM | Warning | Yes | AI detects if allergies should be documented |
| 18 | CLI-R002 | Chronic Disease ICD Coding | Intake | Tiếp Nhận | ChronicDiseases, MedicalConditions | On Save | Database | Database + Config | Warning | Yes | Validate/suggest ICD-10 codes for conditions |
| 19 | CLI-R003 | Drug Interaction Warning | Intake | Tiếp Nhận | CurrentMedications, Allergies | On Save | AI + External | Database | Warning | Yes | AI analyzes potential drug-allergy conflicts |
| 20 | ADM-R001 | Data Completeness Check | Intake | Tiếp Nhận | All Required Fields | On Save | Local | Form + Config | Error | No | All mandatory fields must be filled |
| 21 | ADM-R002 | Audit Trail Log | Intake | Tiếp Nhận | Record Level | On Save | Logging | System Log | Info | Yes | Log all patient record changes |
| 22 | ADM-R003 | Data Privacy (PII Protection) | Intake | Tiếp Nhận | All PII Fields | On Save |Security | Encryption | Error | No | Encrypt PII, restrict access, log access |

### Rule Catalog Notes

**Severity Levels Explained:**
- **Error:** Prevents form submission, must be corrected
- **Warning:** Allows form submission but alerts user to review
- **Info:** Informational, no action required

**Allow Continue:**
- **Yes:** User can proceed despite warning/notification
- **No:** User must correct or cannot proceed

**Data Source Categories:**
- **Form:** Data entered by user in current form
- **Database:** Requires lookup in VNPT-HIS database
- **Config:** System configuration/enumeration values
- **API:** External system API calls
- **AI:** AI/LLM analysis
- **Log:** System audit log

---

## 9. Validation Workflow

### End-to-End Patient Intake Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. PATIENT RECEPTION                            │
│    - Display Patient Intake Form (Tiếp Nhận)    │
│    - Load patient selection interface           │
└────────────────┬────────────────────────────────┘
				 ↓
┌─────────────────────────────────────────────────┐
│ 2. PATIENT SEARCH/SELECTION                     │
│    - Search existing patient by ID/Name         │
│    - If found: Load patient data                │
│    - If not found: Create new patient record    │
└────────────────┬────────────────────────────────┘
				 ↓
┌─────────────────────────────────────────────────┐
│ 3. DATA ENTRY (Real-time Validation)            │
│    On field blur/change:                        │
│    ├─ DEM-R001: Date of Birth calc age         │
│    ├─ DEM-R005: ID format                       │
│    ├─ CON-R002: Phone format                    │
│    ├─ CON-R003: Email format                    │
│    └─ INS-R002: Insurance type check            │
└────────────────┬────────────────────────────────┘
				 ↓
┌─────────────────────────────────────────────────┐
│ 4. FORM SUBMISSION (On Save Click)              │
│                                                 │
│ PHASE 1: Synchronous Local Validation           │
│ ╔═════════════════════════════════════════════╗ │
│ ║ • ADM-R001: Completeness Check              ║ │
│ ║ • DEM-R002: Name required                   ║ │
│ ║ • DEM-R003: Gender validation               ║ │
│ ║ • DEM-R001: DOB range validation            ║ │
│ ║ • DEM-R004: Identity requirement            ║ │
│ ║ • CON-R001: Contact required                ║ │
│ ║ • INS-R001: Insurance type required         ║ │
│ ║ • INS-R002: Insurance number for BHYT       ║ │
│ ║ • INS-R003: Insurance validity period       ║ │
│ ║ • INS-R005: Payment method required         ║ │
│ ║ • EMG-R001: Emergency contact consistency   ║ │
│ ╚═════════════════════════════════════════════╝ │
│    ↓                                            │
│    ├─ [IF ANY FAIL] → Error Message            │
│    │                → Block Save                │
│    │                → Return to Form            │
│    │                                            │
│    └─ [IF ALL PASS] → Continue to Phase 2      │
│                                                 │
│ PHASE 2: Database Validation                    │
│ ╔═════════════════════════════════════════════╗ │
│ ║ • DEM-R006: Duplicate patient check         ║ │
│ ║ • CLI-R002: ICD code validation             ║ │
│ ╚═════════════════════════════════════════════╝ │
│    ↓                                            │
│    ├─ [IF DUPLICATES FOUND]                    │
│    │    → Prompt user for confirmation         │
│    │    → Offer to merge or create new         │
│    │                                            │
│    └─ [IF ALL VALID] → Continue to Phase 3     │
│                                                 │
│ PHASE 3: Form Save & Async Processing          │
│ ╔═════════════════════════════════════════════╗ │
│ ║ • ADM-R003: Encrypt PII data                ║ │
│ ║ • ADM-R002: Create audit log entry          ║ │
│ ║ • Save patient record to database           ║ │
│ ║ • Mark as "Completed"                       ║ │
│ ╚═════════════════════════════════════════════╝ │
│    ↓                                            │
│    → Show success message                       │
│    → Schedule async validations                 │
└────────────────┬────────────────────────────────┘
				 ↓
┌─────────────────────────────────────────────────┐
│ 5. BACKGROUND VALIDATION (Asynchronous)        │
│    Runs after form is saved                     │
│                                                 │
│ ╔═════════════════════════════════════════════╗ │
│ ║ • INS-R004: Insurance verification          ║ │
│ ║  (External insurance API call)               ║ │
│ ║                                              ║ │
│ ║ • CLI-R001: Allergy documentation check     ║ │
│ ║  (AI analysis)                               ║ │
│ ║                                              ║ │
│ ║ • CLI-R003: Drug interaction warning        ║ │
│ ║  (AI analysis)                               ║ │
│ ╚═════════════════════════════════════════════╝ │
│                                                 │
│  Results are:                                   │
│  - Logged to patient record                     │
│  - Displayed to clinician if issues found       │
│  - May trigger alerts/notifications             │
└────────────────┬────────────────────────────────┘
				 ↓
┌─────────────────────────────────────────────────┐
│ 6. NEXT WORKFLOW STEP                           │
│    - Display Department Assignment              │
│    - Route to appropriate department            │
│    - Patient Intake Complete ✓                  │
│    - Ready for Consultation/Examination         │
└─────────────────────────────────────────────────┘
```

### Parallel Validation Opportunities

For performance optimization, the following validations can run in parallel:

**Parallel Batch 1 (Local Validations):**
- DEM-R002, DEM-R003, DEM-R001, DEM-R004, DEM-R005
- CON-R001, CON-R002, CON-R003, CON-R004
- INS-R001, INS-R002, INS-R003, INS-R005
- EMG-R001

**Parallel Batch 2 (Database Lookups):**
- DEM-R006 (duplicate detection)
- CLI-R002 (ICD validation)

**Parallel Batch 3 (Async):**
- INS-R004 (insurance API)
- CLI-R001 (allergy AI)
- CLI-R003 (drug interaction AI)

### Error Handling Strategy

| Error Type | Phase | Action | User Feedback |
|---|---|---|---|
| Local validation fail | 1 | Block save | Show error message with specific field |
| Duplicate patient detected | 2 | Prompt choice | Ask merge/new/skip |
| Database error in phase 2 | 2 | Retry or warn | Log issue, allow save with warning |
| API Timeout (INS-R004) | 3 | Async retry | Save succeeds, insurance check retried later |
| AI error (CLI-R001/003) | 3 | Log & skip | Save succeeds, no AI-based alerts |

---

## 10. Questions / Missing Information

### Critical Questions Requiring Clarification

#### A. Business Process Questions

**Q1: New vs. Existing Patient Differentiation**
- How does system determine if patient is new or existing?
- Should search be by National ID, Passport, or Name + DOB?
- What happens if multiple similar matches found?
- **Status:** MISSING - Needs clarification on search logic and matching algorithm

**Q2: Duplicate Patient Handling**
- When duplicate patient detected, what are user options?
  - Merge records?
  - Update existing?
  - Create new with flag?
- Who decides? Clinician or system?
- **Status:** MISSING - Needs business process definition

**Q3: Insurance Validation Rules**
- Is insurance validation required for all patients or only certain types?
- Can patient be admitted without valid insurance?
- What happens if insurance is expired but not yet renewed?
- Should system allow "self-pay" patients?
- **Status:** MISSING - Need organization policy

**Q4: Foreign Patient Handling**
- How are international patients (tourists, foreign workers) handled?
- Can they use passport instead of national ID?
- Different insurance/payment handling?
- **Status:** MISSING - Need international patient policy

**Q5: Emergency Admission Bypass**
- How are emergency/urgent admissions handled?
- Can intake form be submitted with incomplete data?
- What fields are truly required vs. "fill after stabilization"?
- **Status:** MISSING - Need emergency intake procedures

#### B. Clinical/Medical Questions

**Q6: Allergy Severity Levels**
- Should system track allergy severity (mild/moderate/severe)?
- Different handling for different severity levels?
- **Status:** MISSING - Need allergy classification

**Q7: Drug Database & Interaction Rules**
- Which drug database will be used for validation?
- Is external drug service available? Which vendor?
- Should all medications be validated or only specific categories?
- **Status:** MISSING - Need drug service selection

**Q8: ICD-10 Coding Requirements**
- Must all chronic diseases be coded in ICD-10?
- Who codes? Doctor or clinical coder?
- Can system suggest codes or must physicians select?
- **Status:** MISSING - Need ICD coding workflow

**Q9: Medical Conditions vs. Diagnosis**
- Difference between "Current Medical Conditions" and "Chronic Diseases"?
- Should intake collect preliminary diagnosis or only past history?
- When/how is provisional diagnosis added?
- **Status:** MISSING - Need clinical data structure clarification

#### C. System Architecture Questions

**Q10: Real-time vs. Batch Validation**
- Which validations must be real-time vs. can be asynchronous?
- Performance SLAs for form submission?
- Maximum acceptable latency?
- **Status:** MISSING - Need performance requirements

**Q11: External API Fallback**
- What happens if insurance API is unreachable?
- What happens if LLM service is down?
- Should system allow save with warnings?
- **Status:** MISSING - Need fault tolerance policy

**Q12: Audit & Compliance Requirements**
- What level of audit logging is required for healthcare compliance?
- Are there specific regulatory requirements (GDPR, healthcare privacy rules)?
- Data retention period for audit logs?
- **Status:** MISSING - Need compliance requirements

**Q13: PII Encryption & Security**
- Which fields are considered PII requiring encryption?
- Encryption algorithm and key management strategy?
- Who has access to decrypt PII?
- **Status:** MISSING - Need security policy

#### D. Data Quality Questions

**Q14: Address Validation**
- Should addresses be validated against postal database?
- How detailed should address validation be?
- Can patient have P.O. Box as address?
- **Status:** MISSING - Need address validation policy

**Q15: Phone Number Validation**
- What format is accepted for Vietnam phone numbers?
- Should system validate against telecom database?
- How to handle international phone numbers?
- **Status:** MISSING - Need phone format specification

**Q16: Name Format & Validation**
- Vietnamese naming convention (family name last)?
- How to handle single names or non-traditional formats?
- Should full name be required or separate first/last acceptable?
- **Status:** MISSING - Need name format policy

#### E. Form/Screen Questions

**Q17: Additional Forms/Screens**
- Is "Tiếp Nhận" the only intake form?
- Are there department-specific intake forms?
- Are there other forms that need rule validation?
- **Status:** MISSING - 02_Rules and 01_Forms directories appear incomplete

**Q18: Form Navigation & Workflow**
- After intake, what is next screen/form?
- Can user go back to edit intake after saving?
- How long is intake data locked?
- **Status:** MISSING - Need complete workflow diagram

**Q19: Conditional Fields**
- Which form fields should appear/disappear based on selections?
- Example: Emergency contact required if patient is minor?
- **Status:** MISSING - Need conditional field logic

#### F. Data Structure Questions

**Q20: Field Data Types & Lengths**
- Exact field lengths and data types required?
- Are there precision requirements (for dates, decimals)?
- Phone number format exactly (with dashes, spaces)?
- **Status:** MISSING - Need exact field specification

**Q21: Enum Values**
- Complete list of valid values for:
  - Gender (M/F/O/U/?) 
  - Insurance Types (BHYT, Private, Other, None, ?)
  - Payment Methods (Cash, Card, Insurance, Other, ?)
  - Relationship types (for emergency contact)
  - Ethnic groups
- **Status:** MISSING - Need enumeration definitions

**Q22: Default Values**
- Should any fields have default values?
- Auto-populate fields based on user/system context?
- **Status:** MISSING - Need default value policy

#### G. Integration Questions

**Q23: Insurance System Integration**
- Which insurance provider systems need to be integrated?
- Real-time validation vs. periodic sync?
- What insurance data is needed for validation?
- **Status:** MISSING - Need insurance system specification

**Q24: AI/LLM Integration**
- Which LLM service will be used?
- What specific prompts needed for:
  - Allergy detection (CLI-R001)
  - ICD coding suggestion (CLI-R002)
  - Drug interaction analysis (CLI-R003)
- **Status:** MISSING - Need AI service selection

**Q25: External Systems**
- Are there other external systems that need to be integrated?
- EMR/EHR systems already in place?
- Lab system? Radiology system?
- **Status:** MISSING - Need system inventory

#### H. Rule Priority & Execution Questions

**Q26: Rule Blocking vs. Warning**
- Current design has both blocking errors and warnings.
- Clear criteria for when to block vs. warn?
- Can all block rules be warnings instead?
- **Status:** CLARIFICATION - Need business priority matrix

**Q27: Warning Override**
- Can users override warnings to proceed?
- Who has permission to override?
- Are overrides logged separately?
- **Status:** MISSING - Need override policy

**Q28: Validation Performance**
- Are there performance requirements?
- Maximum acceptable form submission time?
- How many concurrent users expected?
- **Status:** MISSING - Need performance SLAs

### Summary of Missing Information

**Document Version:** Draft
**Completeness Level:** ~60% (Core rules identified, but implementation details missing)

**Critical Gaps:**
1. Incomplete form documentation (only 1 form image available, 02_Rules folder empty)
2. Missing workflow diagrams beyond intake form
3. No external system specifications (insurance APIs, LLM service, drug database)
4. No detailed data specifications (field lengths, exact formats, enums)
5. No regulatory/compliance requirements documented
6. No performance or scalability requirements

**Recommendations:**
1. Complete 01_Forms folder with all screen images
2. Complete 02_Rules folder with Rule Excel or JSON specification
3. Add system integration specifications
4. Document all regulatory requirements
5. Define performance and scalability requirements
6. Clarify business policies (duplicate handling, emergency bypass, etc.)

---

## Appendix: ICD-10 Reference Data

### ICD-10 Database Available
- **File:** `docs/analysis/03_Icd_data/icd_rows.json`
- **Metadata:** `docs/analysis/03_Icd_data/icd_meta.json`
- **Version:** Official TT06-QD1849-v2.3 (Vietnamese Ministry of Health)
- **Records:** 15,844 official ICD-10 codes
- **Coverage:** Includes all PL1, PL2, PL3 supplements plus recent PL4/PL5 updates
- **Special Flags:** Cancelled codes, gender restrictions (female-only/male-only diseases), death-only codes, etc.

### ICD Data Structure Notes
- Optimized format with bitmask encoding for performance
- Contains 303 cancelled PL4 codes
- Contains 3,928 new codes from PL5
- Includes drug/chemical classifications (5,362 records)
- Data is Vietnam-specific per Ministry of Health regulations

---

## Document Information

**Title:** AI Validation Platform - Business Analysis & Rule Catalog
**Task:** Task-023 Analysis (No Code Implementation)
**Date:** 2025
**Project:** VNPT-HIS AI Validation Platform
**Status:** DRAFT - Requires Stakeholder Review

**Next Steps:**
1. Review and clarify answers to all 28 questions
2. Complete form documentation (all intake/submission forms)
3. Complete rule specification (02_Rules folder)
4. Define system integration requirements
5. Create data specification document
6. Move to Rule Engine design (Task-024+)

---

**End of Document**

