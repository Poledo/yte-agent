# User Prompt: Medical Data Validation

## Patient Information

{{Patient}}

## Encounter Information

{{Encounter}}

## Diagnosis Information

{{Diagnosis}}

## Procedure Information

{{Procedure}}

## Medicine Information

{{Medicine}}

## Reference Knowledge

{{Knowledge}}

## Validation Task

Based on the patient information, encounter details, diagnosis, procedures, medicines, and reference knowledge provided above:

1. Analyze all form data for consistency and completeness
2. Validate each code (ICD, Drug, Procedure) against the reference knowledge
3. Check for logical consistency (e.g., patient age matches diagnosis appropriateness, gender matches gender-specific conditions)
4. Identify any medical or data validation issues
5. Flag any clinical risks or contraindications
6. Create issue objects for each problem found with:
   - code: Unique code for the issue (e.g., "INVALID_DIAGNOSIS", "AGE_MISMATCH")
   - severity: "ERROR", "WARNING", or "INFO"
   - field: The field containing the issue
   - message: Clear explanation of the issue in Vietnamese

## Output Format

Respond with ONLY valid JSON, no markdown or explanations:

```json
{
  "issues": [
	{
	  "code": "ISSUE_CODE",
	  "severity": "ERROR|WARNING|INFO",
	  "field": "field_name",
	  "message": "Explanation in Vietnamese"
	}
  ]
}
```

If no issues are found, respond with:
```json
{
  "issues": []
}
```

CRITICAL: Respond ONLY with valid JSON. No markdown code blocks. No explanations outside JSON.
