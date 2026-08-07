# 🧪 Quick Testing Guide for Postman/cURL/PowerShell

## Method 1: PowerShell (Easiest for Windows)

### Test 1: Valid Patient Data

```powershell
# Copy all of this and paste in PowerShell

$body = @{
	page = "PatientIntake"
	trigger = @{ 
		event = "Save"
		field = "fullName" 
	}
	context = @{ 
		timestamp = Get-Date -Format "o"
		extensionVersion = "1.0.0"
		sessionId = "session-001"
		userId = "user-123"
	}
	form = @{
		fullName = "Nguyễn Văn A"
		dateOfBirth = "1990-05-15"
		gender = "M"
		nationalId = "1-123456-789012"
		currentAddress = "123 Đường Lê Lợi, Hà Nội"
		primaryPhone = "0912345678"
		email = "patient@example.com"
	}
} | ConvertTo-Json

$Response = Invoke-WebRequest -Uri "http://localhost:5000/api/validation/validate" `
	-Method Post `
	-Headers @{"Content-Type"="application/json"} `
	-Body $body

$Response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected Output:**
```json
{
  "isValid": true,
  "issues": [],
  "summary": "All validations passed"
}
```

---

### Test 2: Missing Name Error

```powershell
$body = @{
	page = "PatientIntake"
	trigger = @{ event = "Save"; field = "fullName" }
	context = @{ 
		timestamp = Get-Date -Format "o"
		extensionVersion = "1.0.0"
		sessionId = "session-002"
		userId = "user-123"
	}
	form = @{
		dateOfBirth = "1990-05-15"
		gender = "M"
		nationalId = "1-123456-789012"
		currentAddress = "123 Main St"
		primaryPhone = "0912345678"
	}
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/validation/validate" `
	-Method Post `
	-Headers @{"Content-Type"="application/json"} `
	-Body $body | 
	Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

### Test 3: Future Date Error

```powershell
$body = @{
	page = "PatientIntake"
	trigger = @{ event = "Blur"; field = "dateOfBirth" }
	context = @{ 
		timestamp = Get-Date -Format "o"
		extensionVersion = "1.0.0"
		sessionId = "session-003"
		userId = "user-123"
	}
	form = @{
		fullName = "Test User"
		dateOfBirth = "2030-05-15"
		gender = "M"
		nationalId = "1-123456-789012"
		currentAddress = "123 Main St"
		primaryPhone = "0912345678"
	}
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/validation/validate" `
	-Method Post `
	-Headers @{"Content-Type"="application/json"} `
	-Body $body | 
	Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

### Test 4: Multiple Errors

```powershell
$body = @{
	page = "PatientIntake"
	trigger = @{ event = "Save"; field = "form" }
	context = @{ 
		timestamp = Get-Date -Format "o"
		extensionVersion = "1.0.0"
		sessionId = "session-004"
		userId = "user-123"
	}
	form = @{
		gender = "INVALID"
		nationalId = "BAD-ID"
		primaryPhone = "123"
	}
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/validation/validate" `
	-Method Post `
	-Headers @{"Content-Type"="application/json"} `
	-Body $body | 
	Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## Method 2: cURL (Works on All Platforms)

### Save as test.sh and run: bash test.sh

```bash
#!/bin/bash

API_URL="http://localhost:5000/api/validation/validate"

echo "=== TEST 1: Valid Patient ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
	"page": "PatientIntake",
	"trigger": {"event": "Save", "field": "fullName"},
	"context": {
	  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
	  "extensionVersion": "1.0.0",
	  "sessionId": "session-001",
	  "userId": "user-123"
	},
	"form": {
	  "fullName": "Nguyễn Văn A",
	  "dateOfBirth": "1990-05-15",
	  "gender": "M",
	  "nationalId": "1-123456-789012",
	  "currentAddress": "123 Đường Lê Lợi",
	  "primaryPhone": "0912345678",
	  "email": "patient@example.com"
	}
  }' | jq .

echo -e "\n=== TEST 2: Missing Name ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
	"page": "PatientIntake",
	"trigger": {"event": "Save", "field": "fullName"},
	"context": {
	  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
	  "extensionVersion": "1.0.0",
	  "sessionId": "session-002",
	  "userId": "user-123"
	},
	"form": {
	  "dateOfBirth": "1990-05-15",
	  "gender": "M",
	  "nationalId": "1-123456-789012",
	  "currentAddress": "123 Main St",
	  "primaryPhone": "0912345678"
	}
  }' | jq .

echo -e "\n=== TEST 3: Future Date ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
	"page": "PatientIntake",
	"trigger": {"event": "Blur", "field": "dateOfBirth"},
	"context": {
	  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
	  "extensionVersion": "1.0.0",
	  "sessionId": "session-003",
	  "userId": "user-123"
	},
	"form": {
	  "fullName": "Test User",
	  "dateOfBirth": "2030-05-15",
	  "gender": "M",
	  "nationalId": "1-123456-789012",
	  "currentAddress": "123 Main St",
	  "primaryPhone": "0912345678"
	}
  }' | jq .

echo -e "\n=== TEST 4: Invalid Phone ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
	"page": "PatientIntake",
	"trigger": {"event": "Blur", "field": "primaryPhone"},
	"context": {
	  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
	  "extensionVersion": "1.0.0",
	  "sessionId": "session-004",
	  "userId": "user-123"
	},
	"form": {
	  "fullName": "Test User",
	  "dateOfBirth": "1990-05-15",
	  "gender": "M",
	  "nationalId": "1-123456-789012",
	  "currentAddress": "123 Main St",
	  "primaryPhone": "123"
	}
  }' | jq .
```

---

## Method 3: Postman Collection

### Import as Postman environment JSON

```json
{
  "info": {
	"_postman_id": "validation-api",
	"name": "Validation API",
	"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
	{
	  "key": "baseUrl",
	  "value": "http://localhost:5000",
	  "type": "string"
	},
	{
	  "key": "timestamp",
	  "value": "2025-01-17T00:00:00Z",
	  "type": "string"
	}
  ],
  "item": [
	{
	  "name": "Test 1: Valid Patient",
	  "request": {
		"method": "POST",
		"header": [
		  {
			"key": "Content-Type",
			"value": "application/json"
		  }
		],
		"body": {
		  "mode": "raw",
		  "raw": "{\n  \"page\": \"PatientIntake\",\n  \"trigger\": {\"event\": \"Save\", \"field\": \"fullName\"},\n  \"context\": {\n    \"timestamp\": \"{{timestamp}}\",\n    \"extensionVersion\": \"1.0.0\",\n    \"sessionId\": \"session-001\",\n    \"userId\": \"user-123\"\n  },\n  \"form\": {\n    \"fullName\": \"Nguyễn Văn A\",\n    \"dateOfBirth\": \"1990-05-15\",\n    \"gender\": \"M\",\n    \"nationalId\": \"1-123456-789012\",\n    \"currentAddress\": \"123 Đường Lê Lợi\",\n    \"primaryPhone\": \"0912345678\",\n    \"email\": \"patient@example.com\"\n  }\n}"
		},
		"url": {
		  "raw": "{{baseUrl}}/api/validation/validate",
		  "protocol": "http",
		  "host": ["localhost"],
		  "port": "5000",
		  "path": ["api", "validation", "validate"]
		}
	  }
	},
	{
	  "name": "Test 2: Missing Name",
	  "request": {
		"method": "POST",
		"header": [{"key": "Content-Type", "value": "application/json"}],
		"body": {
		  "mode": "raw",
		  "raw": "{\"page\": \"PatientIntake\", \"trigger\": {\"event\": \"Save\", \"field\": \"fullName\"}, \"context\": {\"timestamp\": \"{{timestamp}}\", \"extensionVersion\": \"1.0.0\", \"sessionId\": \"session-002\", \"userId\": \"user-123\"}, \"form\": {\"dateOfBirth\": \"1990-05-15\", \"gender\": \"M\", \"nationalId\": \"1-123456-789012\", \"currentAddress\": \"123 Main St\", \"primaryPhone\": \"0912345678\"}}"
		},
		"url": {"raw": "{{baseUrl}}/api/validation/validate", "host": ["localhost"], "port": "5000", "path": ["api", "validation", "validate"]}
	  }
	},
	{
	  "name": "Test 3: Future DOB",
	  "request": {
		"method": "POST",
		"header": [{"key": "Content-Type", "value": "application/json"}],
		"body": {
		  "mode": "raw",
		  "raw": "{\"page\": \"PatientIntake\", \"trigger\": {\"event\": \"Blur\", \"field\": \"dateOfBirth\"}, \"context\": {\"timestamp\": \"{{timestamp}}\", \"extensionVersion\": \"1.0.0\", \"sessionId\": \"session-003\", \"userId\": \"user-123\"}, \"form\": {\"fullName\": \"Test\", \"dateOfBirth\": \"2030-05-15\", \"gender\": \"M\", \"nationalId\": \"1-123456-789012\", \"currentAddress\": \"123 Main St\", \"primaryPhone\": \"0912345678\"}}"
		},
		"url": {"raw": "{{baseUrl}}/api/validation/validate", "host": ["localhost"], "port": "5000", "path": ["api", "validation", "validate"]}
	  }
	},
	{
	  "name": "Test 4: Invalid Phone",
	  "request": {
		"method": "POST",
		"header": [{"key": "Content-Type", "value": "application/json"}],
		"body": {
		  "mode": "raw",
		  "raw": "{\"page\": \"PatientIntake\", \"trigger\": {\"event\": \"Blur\", \"field\": \"primaryPhone\"}, \"context\": {\"timestamp\": \"{{timestamp}}\", \"extensionVersion\": \"1.0.0\", \"sessionId\": \"session-004\", \"userId\": \"user-123\"}, \"form\": {\"fullName\": \"Test\", \"dateOfBirth\": \"1990-05-15\", \"gender\": \"M\", \"nationalId\": \"1-123456-789012\", \"currentAddress\": \"123 Main St\", \"primaryPhone\": \"123\"}}"
		},
		"url": {"raw": "{{baseUrl}}/api/validation/validate", "host": ["localhost"], "port": "5000", "path": ["api", "validation", "validate"]}
	  }
	}
  ]
}
```

**How to import:**
1. Open Postman
2. Click "Import" (top left)
3. Paste this JSON
4. Click "Import"
5. Run tests!

---

## Method 4: Visual Studio Built-in HTTP Client

### Create file: test-requests.http

```http
### Endpoint
@baseUrl = http://localhost:5000/api/validation/validate
@timestamp = 2025-01-17T10:00:00Z

### Test 1: Valid Patient
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Save", "field": "fullName"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-001",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Nguyễn Văn A",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Đường Lê Lợi",
	"primaryPhone": "0912345678",
	"email": "patient@example.com"
  }
}

### Test 2: Missing Name
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Save", "field": "fullName"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-002",
	"userId": "user-123"
  },
  "form": {
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Main St",
	"primaryPhone": "0912345678"
  }
}

### Test 3: Future DOB
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Blur", "field": "dateOfBirth"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-003",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Test User",
	"dateOfBirth": "2030-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Main St",
	"primaryPhone": "0912345678"
  }
}

### Test 4: Invalid Phone
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Blur", "field": "primaryPhone"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-004",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Test User",
	"dateOfBirth": "1990-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Main St",
	"primaryPhone": "123"
  }
}

### Test 5: Invalid Gender
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Change", "field": "gender"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-005",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Test User",
	"dateOfBirth": "1990-05-15",
	"gender": "INVALID",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Main St",
	"primaryPhone": "0912345678"
  }
}

### Test 6: Age > 120
POST {{baseUrl}}
Content-Type: application/json

{
  "page": "PatientIntake",
  "trigger": {"event": "Save", "field": "dateOfBirth"},
  "context": {
	"timestamp": "{{timestamp}}",
	"extensionVersion": "1.0.0",
	"sessionId": "session-006",
	"userId": "user-123"
  },
  "form": {
	"fullName": "Test User",
	"dateOfBirth": "1880-05-15",
	"gender": "M",
	"nationalId": "1-123456-789012",
	"currentAddress": "123 Main St",
	"primaryPhone": "0912345678"
  }
}
```

**How to use:**
1. Open the file in Visual Studio
2. Look for green "Send Request" link above each test
3. Click to run the test
4. Response will display below

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 🔴 Connection refused | Make sure app is running (F5 in VS) |
| 🔴 404 endpoint not found | Check port matches (default 5000) |
| 🔴 400 Bad Request | Verify JSON syntax, use validator |
| 🔴 500 Server Error | Check app logs for details |
| 🟡 Slow response | May be first request, be patient |

---

## Check App is Running

```powershell
# PowerShell
Test-NetConnection -ComputerName localhost -Port 5000

# Should show:
# TcpTestSucceeded : True
```

```bash
# Linux/Mac
nc -zv localhost 5000

# Should show:
# Connection to localhost port 5000 [tcp/http-alt] succeeded!
```

---

## Common Testing Scenarios

### Scenario 1: Test all rules pass
→ Use Test 1 (Valid Patient)

### Scenario 2: See error messages
→ Use Tests 2-5 (various errors)

### Scenario 3: Check warnings work
→ Use Tests 4 & 6 (Age > 120, No ID)

### Scenario 4: Test edge cases
→ New tests with boundary values (age=120, etc)

---

## Save to Files for Reuse

### Save to PowerShell Script

```powershell
# Save as test-api.ps1
# Edit the function and save the script
Function Test-ValidationAPI {
	param([string]$TestName = "1")

	# Your test code here...
	# Invoke-WebRequest...
}

# Run with: .\test-api.ps1 -TestName "1"
```

---

