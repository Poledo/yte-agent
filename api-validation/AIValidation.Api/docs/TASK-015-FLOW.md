# Task-015: End-to-End Pipeline Explanation

## 1. Request Flow Diagram

```
Chrome Extension
	  ↓
   [ValidationRequest]
   {
	 "page": "Diagnosis",
	 "trigger": {"field": "icdCode", "event": "Changed"},
	 "context": {...},
	 "form": {"patientGender": "M", "icdCode": "O80"}
   }
	  ↓
ValidationController (/api/validation POST)
	  ↓
ValidationService.ValidateAsync(request)
	  ↓
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION PIPELINE                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Processing

### Step 1: Knowledge Retrieval
```
KnowledgeProvider.GetKnowledgeAsync(request)

Input: ValidationRequest with form data
{
  "icdCode": "O80"
}

Process:
1. Extract "O80" from request.Form["icdCode"]
2. Query repository: SearchByCodeAsync("ICD", "O80")
   ↓ Database Query
   SELECT * FROM knowledge_items 
   WHERE category = 'ICD' 
   AND code = 'O80' 
   AND is_active = true
   ↓ PostgreSQL executes indexed query
3. Map KnowledgeItem → KnowledgeDocument
   {
	 "name": "Đẻ thường một thai",
	 "category": "ICD",
	 "content": "Chỉ áp dụng cho bệnh nhân nữ...",
	 "metadata": {
	   "code": "O80",
	   "id": "1",
	   "applicable_to": "female_only"
	 }
   }

Output: IReadOnlyList<KnowledgeDocument> (1 document)
```

### Step 2: Prompt Building
```
PromptBuilder.BuildPromptAsync(request, knowledge)

Input:
- ValidationRequest (form data: patient gender, ICD code)
- KnowledgeDocument (ICD rules and restrictions)

Process:
1. Load "system.md" →
   "You are an advanced AI assistant specialized in medical data validation..."

2. Load "validation.md" →
   "1. Required Fields - Validate mandatory fields..."
   "2. Data Format Validation - Date fields must be YYYY-MM-DD..."
   "3. Logical Validation - Check relationships between fields..."
   "4. Reference Data Validation - Validate against provided knowledge..."

3. Load "output.md" →
   JSON Schema:
   {
	 "issues": [
	   {
		 "code": "string",
		 "severity": "Error|Warning|Info",
		 "field": "string",
		 "message": "string",
		 "suggestion": "string (optional)",
		 "canAutoFix": boolean,
		 "fixValue": "string (optional)"
	   }
	 ]
   }

4. Build UserPrompt combining all:
   ```
   ## Thông tin bệnh nhân:
   {
	 "patientGender": "M",
	 "icdCode": "O80", 
	 "patientName": "Nguyễn Văn A"
   }

   ## Trang/Lĩnh vực xác thực:
   - Page: Diagnosis
   - Trigger field: icdCode
   - Trigger event: Changed

   ## Thông tin tham chiếu về ICD:
   - Code: O80
   - Name: Đẻ thường một thai
   - Content: Chỉ áp dụng cho bệnh nhân nữ...
   - Applicable To: female_only

   [Full validation rules]

   [Output schema]

   ## Nhiệm vụ:
   Kiểm tra xem ICD O80 có phù hợp với giới tính bệnh nhân (M) không?
   ```

5. Create AIRequest:
   {
	 "systemPrompt": "You are an advanced AI...",
	 "userPrompt": "[Combined prompt above]",
	 "model": "gpt-4",
	 "temperature": 0,
	 "maxTokens": 4096,
	 "metadata": {
	   "page": "Diagnosis",
	   "trigger_field": "icdCode",
	   "timestamp": "2024-01-15T10:30:00Z",
	   "session_id": "session-123"
	 }
   }

Output: AIRequest ready for LLM
```

### Step 3: AI Evaluation
```
LLMProvider.GenerateAsync(aiRequest)

Input: AIRequest (system prompt + user prompt + knowledge context)

Process:
1. Send to OpenRouter API:
   POST https://openrouter.ai/api/v1/chat/completions
   Headers: Authorization: Bearer {API_KEY}
   Body: {
	 "model": "gpt-4",
	 "messages": [
	   {"role": "system", "content": systemPrompt},
	   {"role": "user", "content": userPrompt}
	 ],
	 "temperature": 0,
	 "max_tokens": 4096
   }

2. AI Reasoning (in LLM):
   - Reads: "Patient is Male (M)"
   - Reads: "ICD O80 is for females only"
   - Concludes: Mismatch found → Issue detected
   - Generates JSON response

3. OpenRouter returns:
   {
	 "choices": [
	   {
		 "message": {
		   "content": "{\"issues\": [{\"code\": \"INVALID_ICD_GENDER\", \"severity\": \"Error\", \"field\": \"icdCode\", \"message\": \"ICD O80 chỉ áp dụng cho bệnh nhân nữ.\", \"canAutoFix\": false, \"fixValue\": null}]}"
		 }
	   }
	 ],
	 "usage": {"prompt_tokens": 500, "completion_tokens": 50}
   }

Output: AIResponse
{
  "content": "```json\n{\"issues\": [{...}]}\n```",
  "usage": {...}
}
```

### Step 4: Response Processing
```
ResponseProcessor.Process(aiResponse)

Input: AIResponse with raw AI output

Process Step 1 - JsonExtractor.Extract()
Input content:
  "```json
   {
	 \"issues\": [
	   {
		 \"code\": \"INVALID_ICD_GENDER\",
		 \"severity\": \"Error\",
		 \"field\": \"icdCode\",
		 \"message\": \"ICD O80 chỉ áp dụng cho bệnh nhân nữ.\"
	   }
	 ]
   }
   ```"

Extraction Steps:
1. Trim whitespace
2. Find and remove markdown code block (```json ... ```)
3. Find first '{' and last '}'
4. Extract substring:
   "{\"issues\": [{\"code\": \"INVALID_ICD_GENDER\", ...}]}"

Output: Clean JSON string

---

Process Step 2 - JsonDeserializer.Deserialize()
Input JSON string:
  "{\"issues\": [{\"code\": \"INVALID_ICD_GENDER\", \"severity\": \"Error\", \"field\": \"icdCode\", \"message\": \"ICD O80 chỉ áp dụng cho bệnh nhân nữ.\", \"canAutoFix\": false, \"fixValue\": null}]}"

Deserialization Steps:
1. Parse JSON using System.Text.Json
2. Extract "issues" array
3. For each issue, validate and create ValidationIssue:
   - Validate "code" is string ✓
   - Validate "severity" is enum (Error/Warning/Info) ✓ (Error)
   - Validate "field" is string ✓
   - Validate "message" is string ✓
   - Validate "canAutoFix" is boolean ✓
   - Extract optional "suggestion" if present
   - Extract optional "fixValue" if present
4. Create ValidationResponse object

Output: ValidationResponse
{
  "issues": [
	{
	  "code": "INVALID_ICD_GENDER",
	  "severity": Error (enum),
	  "field": "icdCode",
	  "message": "ICD O80 chỉ áp dụng cho bệnh nhân nữ.",
	  "suggestion": null,
	  "canAutoFix": false,
	  "fixValue": null
	}
  ]
}
```

---

## 3. Knowledge Database Access Pattern

```
Database Queries (PostgreSQL):

Query 1: Search by Category + Code (Indexed)
  SELECT id, category, code, name, content, is_active 
  FROM public.knowledge_items
  WHERE category = 'ICD'
	AND code = 'O80'
	AND is_active = true
  INDEXES: Category index, Code index
  Result Time: ~1-2ms

Query 2: Search by Category + Keyword (Filtered Scan)
  SELECT id, category, code, name, content, is_active
  FROM public.knowledge_items  
  WHERE category = 'ICD'
	AND is_active = true
	AND (LOWER(name) LIKE '%keyword%' 
		 OR LOWER(content) LIKE '%keyword%')
  INDEXES: Category index used, then keyword scan
  Result Time: ~10-50ms (acceptable)

Database Connection: Scoped (one per request)
Async: All queries use ToListAsync() (non-blocking)
```

---

## 4. Complete Information Flow for Task-015

### Test Case 1: Male (M) + ICD O80 (Females Only) = INVALID

```
Input Request:
┌──────────────────────────────────────────────┐
│ POST /api/validation                         │
│ {                                            │
│   "page": "Diagnosis",                       │
│   "form": {                                  │
│     "patientGender": "M",                    │
│     "icdCode": "O80"                         │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘
				  ↓
		[ValidationService]
				  ↓
	  [KnowledgeProvider] ← Extract "O80"
				  ↓
	[Query PostgreSQL] ← Search ICD O80
				  ↓
  Returns: "Đẻ thường một thai" (Female only)
				  ↓
	  [PromptBuilder] + Knowledge
				  ↓
	[UserPrompt includes:]
	- Gender: M
	- ICD O80 info: "Female only"
	- Task: "Validate ICD for gender"
				  ↓
	   [LLMProvider] → OpenRouter API
				  ↓
	[AI Reasoning]
	IF gender=M AND icd_is_female_only THEN
	  RETURN issue: "ICD O80 for females only"
				  ↓
	Response JSON:
	{
	  "issues": [{
		"code": "INVALID_ICD_GENDER",
		"severity": "Error",
		"field": "icdCode",
		"message": "ICD O80 chỉ áp dụng cho bệnh nhân nữ."
	  }]
	}
				  ↓
	 [ResponseProcessor]
	 - Extract JSON from markdown
	 - Deserialize to ValidationResponse
				  ↓
Output ValidationResponse:
┌──────────────────────────────────────────────┐
│ {                                            │
│   "issues": [                                │
│     {                                        │
│       "code": "INVALID_ICD_GENDER",          │
│       "severity": "Error",                   │
│       "field": "icdCode",                    │
│       "message": "ICD O80 chỉ áp dụng...",  │
│       "canAutoFix": false                    │
│     }                                        │
│   ]                                          │
│ }                                            │
└──────────────────────────────────────────────┘
```

### Test Case 2: Female (F) + ICD O80 (Females Only) = VALID

```
Input Request:
┌──────────────────────────────────────────────┐
│ POST /api/validation                         │
│ {                                            │
│   "page": "Diagnosis",                       │
│   "form": {                                  │
│     "patientGender": "F",                    │
│     "icdCode": "O80"                         │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘
				  ↓ (Same process...)
	[AI sees: Gender F + ICD Female-only]
				  ↓
	IF gender=F AND icd_is_female_only THEN
	  RETURN no issues (valid match)
				  ↓
Output ValidationResponse:
┌──────────────────────────────────────────────┐
│ {                                            │
│   "issues": []                               │
│ }                                            │
└──────────────────────────────────────────────┘
```

---

## 5. Key Design Principles Applied

### 1. **Separation of Concerns**
Each layer has single responsibility:
- **KnowledgeProvider**: Retrieves data only
- **PromptBuilder**: Combines data into text only
- **LLMProvider**: Calls API only
- **ResponseProcessor**: Parses output only

### 2. **Dependency Injection**
All dependencies injected, not created:
```csharp
// In KnowledgeProvider:
public KnowledgeProvider(IKnowledgeRepository repository)

// In PromptBuilder:
public PromptBuilder(IPromptLoader promptLoader)

// In ResponseProcessor:
public ResponseProcessor(IJsonExtractor extractor, IJsonDeserializer deserializer)
```

### 3. **No Business Logic in Database Layer**
- KnowledgeRepository: Pure data access
- No gender validation logic
- No rule enforcement
- Only: Query, filter, return

### 4. **AI Makes Final Decision**
- Database provides context (gender restrictions)
- Prompt provides instructions
- AI evaluates based on both
- AI outputs decision in standardized JSON
- Code doesn't validate (avoids hard-coded rules)

### 5. **Async Throughout**
- All database queries: `ToListAsync()`
- All AI calls: `await llmProvider.GenerateAsync()`
- Non-blocking pipeline
- CancellationToken support

### 6. **Immutable Results**
- KnowledgeRepository returns `IReadOnlyList`
- Cannot modify after retrieval
- Prevents accidental mutations
- Thread-safe collection

### 7. **No Hard-Coded Rules**
- Gender restrictions in database content
- AI reads and evaluates
- Easy to update (just change DB data)
- Extensible to new rules

---

## 6. Technology Stack Highlights

**Data Access**
- EF Core: ORM with LINQ
- PostgreSQL: Reliable relational database
- Npgsql: .NET PostgreSQL provider
- Async queries: Non-blocking I/O

**Prompt Management**
- File-based prompts: System.md, validation.md, output.md
- PromptLoader: Cache + async file reading
- No hard-coded strings in C#

**AI Integration**
- OpenRouter API: Multiple LLM providers
- HttpClientFactory: Connection pooling
- System.Text.Json: Lightweight parsing

**Architecture**
- Dependency Injection: Loose coupling
- Repository Pattern: Data access abstraction
- Strategy Pattern: Pluggable AI providers
- Layer Separation: Clean pipeline

---

## 7. Extensibility Examples

### Example 1: Add Multiple ICD Validations
```csharp
// Just add more seed data
new KnowledgeItem { Code = "I10", Category = "ICD", Content = "Age > 30" },
new KnowledgeItem { Code = "F32", Category = "ICD", Content = "Mental disorder disclaimer" }
```

### Example 2: Support Drug Validation
```csharp
// Create drug knowledge items
new KnowledgeItem { Code = "ASPIRIN", Category = "Drug", Content = "Not for pregnancy" }

// KnowledgeProvider automatically supports:
// searchByCodeAsync("Drug", "ASPIRIN");

// Prompt builder includes drug knowledge in same format
```

### Example 3: Add Custom AI Provider
```csharp
public class AnthropicProvider : IAIProvider
{
	public async Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken)
	{
		// Different API, same interface
	}
}

// Register in Program.cs:
// builder.Services.AddHttpClient<IAIProvider, AnthropicProvider>();
```

### Example 4: Implement Caching
```csharp
public class CachedKnowledgeRepository : IKnowledgeRepository
{
	private readonly IMemoryCache _cache;
	private readonly IKnowledgeRepository _inner;

	public async Task<IReadOnlyList<KnowledgeItem>> SearchByCodeAsync(...)
	{
		var key = $"knowledge_{category}_{code}";
		if (_cache.TryGetValue(key, out var result))
			return result;

		result = await _inner.SearchByCodeAsync(...);
		_cache.Set(key, result);
		return result;
	}
}

// Register in Program.cs:
// builder.Services.AddMemoryCache();
// builder.Services.Decorate<IKnowledgeRepository, CachedKnowledgeRepository>();
```

---

## Summary

Task-015 implements a complete, extensible end-to-end validation pipeline:

1. **Request** comes in with form data
2. **Knowledge** is retrieved from PostgreSQL
3. **Prompt** is built combining rules + knowledge + form data
4. **AI** evaluates based on comprehensive context
5. **Response** is parsed from JSON
6. **Result** is returned in standardized format

Each step is:
- ✅ Independently testable
- ✅ Pluggable/replaceable
- ✅ Documented with XML summaries
- ✅ Async and non-blocking
- ✅ Following SOLID principles
- ✅ No hard-coded business logic
- ✅ Extensible for new features
