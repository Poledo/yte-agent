# 🔌 Chrome Extension Integration Guide

How to integrate the Validation API with your Chrome extension (or any client)

---

## 1️⃣ Extension Configuration

### Update manifest.json

```json
{
  "manifest_version": 3,
  "name": "HIS Validation Extension",
  "version": "1.0.0",
  "permissions": [
	"activeTab",
	"scripting",
	"storage"
  ],
  "host_permissions": [
	"http://localhost:5000/*",
	"http://localhost:5001/*",
	"https://your-api-domain.com/*"
  ],
  "background": {
	"service_worker": "background.js"
  },
  "content_scripts": [
	{
	  "matches": ["<all_urls>"],
	  "js": ["content.js"],
	  "run_at": "document_end"
	}
  ]
}
```

---

## 2️⃣ API Endpoint Configuration

### Create config.js in extension

```javascript
// config.js
const API_CONFIG = {
  // Development
  development: {
	apiUrl: 'http://localhost:5000',
	validateEndpoint: '/api/validation/validate',
	timeout: 5000
  },

  // Production
  production: {
	apiUrl: 'https://your-api-domain.com',
	validateEndpoint: '/api/validation/validate',
	timeout: 10000
  },

  // Get current environment
  getEnvironment: function() {
	// Change to 'production' when deploying
	return 'development';
  },

  getConfig: function() {
	return this[this.getEnvironment()];
  },

  getFullUrl: function() {
	const config = this.getConfig();
	return config.apiUrl + config.validateEndpoint;
  }
};

export default API_CONFIG;
```

---

## 3️⃣ Create Validation Service

### validation-service.js in extension

```javascript
// validation-service.js
import API_CONFIG from './config.js';

class ValidationService {
  /**
   * Call validation API
   * @param {Object} formData - Form data to validate
   * @param {Object} options - Optional: { page, trigger, userId, sessionId }
   * @returns {Promise<ValidationResponse>}
   */
  static async validate(formData, options = {}) {
	try {
	  const request = this.buildValidationRequest(formData, options);

	  const response = await fetch(API_CONFIG.getFullUrl(), {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Accept': 'application/json'
		},
		body: JSON.stringify(request),
		timeout: API_CONFIG.getConfig().timeout
	  });

	  if (!response.ok) {
		throw new Error(`API Error: ${response.status} ${response.statusText}`);
	  }

	  const result = await response.json();
	  return result;
	} catch (error) {
	  console.error('Validation API Error:', error);
	  return {
		isValid: true, // Fail-safe: allow submission on API error
		issues: [],
		summary: `API Error: ${error.message}`
	  };
	}
  }

  /**
   * Build ValidationRequest object
   */
  static buildValidationRequest(formData, options = {}) {
	return {
	  page: options.page || this.detectPageName(),
	  trigger: {
		event: options.event || 'Save',
		field: options.field || Object.keys(formData)[0] || 'unknown'
	  },
	  context: {
		timestamp: new Date().toISOString(),
		extensionVersion: chrome.runtime.getManifest().version,
		sessionId: options.sessionId || this.generateSessionId(),
		userId: options.userId || 'anonymous'
	  },
	  form: formData
	};
  }

  /**
   * Try to detect page name from URL or form attributes
   */
  static detectPageName() {
	// Get from URL
	const url = window.location.pathname;
	if (url.includes('patient')) return 'PatientIntake';
	if (url.includes('encounter')) return 'MedicalEncounter';
	if (url.includes('diagnosis')) return 'DiagnosisForm';

	// Get from document title
	if (document.title.toLowerCase().includes('patient')) return 'PatientIntake';

	return 'UnknownForm';
  }

  /**
   * Generate or retrieve session ID
   */
  static generateSessionId() {
	let sessionId = sessionStorage.getItem('validationSessionId');
	if (!sessionId) {
	  sessionId = 'session-' + Date.now();
	  sessionStorage.setItem('validationSessionId', sessionId);
	}
	return sessionId;
  }
}

export default ValidationService;
```

---

## 4️⃣ Integrate with Form Events

### content.js - Form event handling

```javascript
// content.js
import ValidationService from './validation-service.js';

/**
 * Listen to form field blur events
 */
document.addEventListener('blur', async (event) => {
  if (!isFormField(event.target)) return;

  const field = event.target;
  const formData = collectFormData();

  // Call validation for the field
  const result = await ValidationService.validate(formData, {
	event: 'Blur',
	field: field.name || field.id || 'unknown'
  });

  displayValidationErrors(result, field);
}, true);

/**
 * Listen to form field change events
 */
document.addEventListener('change', async (event) => {
  if (!isFormField(event.target)) return;

  const field = event.target;
  const formData = collectFormData();

  // Call validation for the field
  const result = await ValidationService.validate(formData, {
	event: 'Change',
	field: field.name || field.id || 'unknown'
  });

  displayValidationErrors(result, field);
}, true);

/**
 * Listen to form submission
 */
document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!isHISForm(form)) return;

  const formData = collectFormData(form);

  // Call validation for entire form
  const result = await ValidationService.validate(formData, {
	event: 'Save'
  });

  // Show summary feedback
  displayValidationSummary(result);

  // Prevent submission if there are errors
  if (!result.isValid) {
	event.preventDefault();
	highlightInvalidFields(result.issues);
  }
}, true);

/**
 * Check if element is a form field
 */
function isFormField(element) {
  return element.tagName === 'INPUT' || 
		 element.tagName === 'SELECT' || 
		 element.tagName === 'TEXTAREA';
}

/**
 * Check if form belongs to HIS system
 */
function isHISForm(form) {
  return form.id?.includes('patient') || 
		 form.id?.includes('form') ||
		 form.className?.includes('his-form');
}

/**
 * Collect all form data
 */
function collectFormData(formElement = null) {
  const form = formElement || document.querySelector('form');
  if (!form) return {};

  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
	data[key] = value;
  }

  return data;
}

/**
 * Display validation errors for a field
 */
function displayValidationErrors(result, field) {
  clearFieldErrors(field);

  if (result.isValid) return;

  // Find issues for this field
  const fieldIssues = result.issues.filter(issue => issue.field === (field.name || field.id));

  fieldIssues.forEach(issue => {
	const errorElement = createErrorElement(issue);
	field.parentElement?.insertAdjacentElement('afterend', errorElement);
	field.classList.add('is-invalid');
  });
}

/**
 * Create error message element
 */
function createErrorElement(issue) {
  const div = document.createElement('div');
  div.className = `validation-error validation-${issue.severity.toLowerCase()}`;
  div.innerHTML = `
	<strong>${issue.code}</strong>: ${issue.message}
	${issue.suggestion ? `<small>${issue.suggestion}</small>` : ''}
  `;
  return div;
}

/**
 * Clear field errors
 */
function clearFieldErrors(field) {
  const nextElement = field.nextElementSibling;
  if (nextElement?.classList.contains('validation-error')) {
	nextElement.remove();
  }
  field.classList.remove('is-invalid');
}

/**
 * Display validation summary (toast/popup)
 */
function displayValidationSummary(result) {
  const message = result.isValid 
	? 'All validations passed! ✓'
	: result.summary;

  // Show toast notification
  showToast(message, result.isValid ? 'success' : 'error', 5000);
}

/**
 * Highlight invalid fields
 */
function highlightInvalidFields(issues) {
  issues.forEach(issue => {
	const field = document.querySelector(`[name="${issue.field}"], [id="${issue.field}"]`);
	if (field) {
	  field.classList.add('is-invalid');
	  field.focus();
	}
  });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `validation-toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
	toast.classList.add('show');
  }, 10);

  setTimeout(() => {
	toast.classList.remove('show');
	setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

---

## 5️⃣ CSS Styling

### extension-styles.css

```css
/* Validation errors */
.validation-error {
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 4px;
  font-size: 12px;
  animation: slideIn 0.3s ease;
}

.validation-error.validation-error {
  background-color: #fee;
  color: #c33;
  border-left: 3px solid #c33;
}

.validation-error.validation-warning {
  background-color: #ffe;
  color: #993;
  border-left: 3px solid #993;
}

.validation-error strong {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.validation-error small {
  display: block;
  font-style: italic;
  margin-top: 4px;
  opacity: 0.8;
}

/* Invalid form fields */
input.is-invalid,
select.is-invalid,
textarea.is-invalid {
  border-color: #c33 !important;
  background-color: #fff5f5 !important;
}

/* Toast notifications */
.validation-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
  max-width: 400px;
}

.validation-toast.show {
  opacity: 1;
}

.validation-toast.toast-success {
  background-color: #4caf50;
}

.validation-toast.toast-error {
  background-color: #f44336;
}

.validation-toast.toast-warning {
  background-color: #ff9800;
}

.validation-toast.toast-info {
  background-color: #2196f3;
}

@keyframes slideIn {
  from {
	transform: translateX(20px);
	opacity: 0;
  }
  to {
	transform: translateX(0);
	opacity: 1;
  }
}
```

---

## 6️⃣ Example: Patient Form Integration

### Example HTML

```html
<!DOCTYPE html>
<html>
<head>
	<link rel="stylesheet" href="extension-styles.css">
</head>
<body>
	<form id="patient-form" class="his-form">
		<div class="form-group">
			<label for="fullName">Full Name *</label>
			<input type="text" id="fullName" name="fullName" required>
		</div>

		<div class="form-group">
			<label for="dateOfBirth">Date of Birth *</label>
			<input type="date" id="dateOfBirth" name="dateOfBirth" required>
		</div>

		<div class="form-group">
			<label for="gender">Gender *</label>
			<select id="gender" name="gender" required>
				<option value="">Select...</option>
				<option value="M">Male (M)</option>
				<option value="F">Female (F)</option>
				<option value="O">Other (O)</option>
				<option value="U">Unspecified (U)</option>
			</select>
		</div>

		<div class="form-group">
			<label for="nationalId">National ID</label>
			<input type="text" id="nationalId" name="nationalId" placeholder="e.g., 1-123456-789012">
		</div>

		<div class="form-group">
			<label for="currentAddress">Address *</label>
			<textarea id="currentAddress" name="currentAddress" required></textarea>
		</div>

		<div class="form-group">
			<label for="primaryPhone">Phone *</label>
			<input type="tel" id="primaryPhone" name="primaryPhone" required placeholder="e.g., 0912345678">
		</div>

		<div class="form-group">
			<label for="email">Email</label>
			<input type="email" id="email" name="email" placeholder="e.g., patient@example.com">
		</div>

		<button type="submit" id="submit-btn">Submit</button>
	</form>

	<script src="config.js" type="module"></script>
	<script src="validation-service.js" type="module"></script>
	<script src="content.js" type="module"></script>
</body>
</html>
```

---

## 7️⃣ Testing Extension Locally

### Step 1: Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select your extension folder

### Step 2: Start API Server

```bash
# In Visual Studio or terminal
dotnet run --project AIValidation.Api

# API will be available at:
# http://localhost:5000/api/validation/validate
```

### Step 3: Test Validation

1. Navigate to a page with form
2. Fill in form fields
3. Watch for validation messages on blur/change
4. Try to submit - should be blocked if there are errors

---

## 8️⃣ Advanced: Background Service Worker (optional)

### background.js - Centralized validation

```javascript
// background.js
import ValidationService from './validation-service.js';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'validate') {
	ValidationService.validate(request.formData, request.options)
	  .then(result => {
		sendResponse({ success: true, result });
	  })
	  .catch(error => {
		sendResponse({ success: false, error: error.message });
	  });

	// Return true to indicate we'll send response asynchronously
	return true;
  }
});

// Or call from content script:
// chrome.runtime.sendMessage(
//   { action: 'validate', formData, options },
//   (response) => { console.log(response.result); }
// );
```

---

## 9️⃣ Error Handling

### Handle Network Errors Gracefully

```javascript
const result = await ValidationService.validate(formData);

if (result.summary?.includes('API Error')) {
  // API is down - show warning but allow submission
  showWarning('Validation service unavailable. Proceeding with caution.');
  // Don't block submission
} else if (!result.isValid) {
  // Real validation errors - block submission
  showError('Please fix the errors below.');
  event.preventDefault();
}
```

---

## 🔟 API Response Handling

### Check all validation scenarios

```javascript
const result = await ValidationService.validate(formData);

// All successful
if (result.isValid && result.issues.length === 0) {
  console.log('✓ All validations passed');
  // Proceed with form submission
}

// Has warnings but no errors
else if (result.isValid && result.issues.length > 0) {
  console.log('⚠ Has warnings:', result.issues);
  // Allow submission but warn user
  showWarnings(result.issues);
}

// Has errors
else if (!result.isValid) {
  console.log('✗ Has errors:', result.issues);
  // Block submission
  showErrors(result.issues);
  return false;
}
```

---

## Summary

| Component | File | Purpose |
|-----------|------|---------|
| Configuration | `config.js` | API endpoint & environment settings |
| Service | `validation-service.js` | Calls validation API |
| Integration | `content.js` | Integrates with form events |
| Styling | `extension-styles.css` | Visual feedback for users |
| Manifest | `manifest.json` | Extension configuration |

---

## Deployment Checklist

- [ ] Update API_CONFIG with production URL
- [ ] Test all form fields
- [ ] Verify error messages display correctly
- [ ] Test on actual HIS forms
- [ ] Handle network errors gracefully
- [ ] Performance test (no blocking)
- [ ] Submit extension to Chrome Web Store

---

