# Multi-Provider Architecture Quick Reference

## Overview

The LLM layer now supports multiple providers through a **Factory Pattern** implementation. `ValidationService` doesn't need to know about specific providers - it just uses the configured one.

## Files Changed/Created

### New Files
- `Providers/LLM/OllamaProvider.cs` - New Ollama provider implementation

### Modified Files
- `Program.cs` - Updated DI registration for factory pattern

### Unchanged Files
- `Providers/Interfaces/ILLMProvider.cs` - No changes
- `Providers/LLM/OpenRouterProvider.cs` - No changes
- `Services/ValidationService.cs` - No changes

## How It Works

```
appsettings.json (LLM.Provider="Ollama")
		 ↓
LLMProvider (Factory)
		 ↓
Selects OllamaProvider
		 ↓
HTTP POST /api/chat
		 ↓
AIResponse returned
```

## Configuration

### Using OpenRouter (Default)
```json
{
  "LLM": {
	"Provider": "OpenRouter",
	"BaseUrl": "https://openrouter.ai/api/v1",
	"ApiKey": "sk-or-v1-xxx",
	"Model": "openai/gpt-4",
	"Temperature": 0.0,
	"TimeoutSeconds": 60
  }
}
```

### Using Ollama
```json
{
  "LLM": {
	"Provider": "Ollama",
	"BaseUrl": "http://localhost:11434",
	"Model": "llama2",
	"Temperature": 0.0,
	"TimeoutSeconds": 60
  }
}
```

## Supported Configuration Values

### Provider
- `"OpenRouter"` - OpenRouter API (supports 100+ models)
- `"Ollama"` - Local/Remote Ollama instance
- Default: `"OpenRouter"` (if not specified)

### BaseUrl Examples
- OpenRouter: `https://openrouter.ai/api/v1`
- Ollama Local: `http://localhost:11434`
- Ollama Remote: `http://ollama-server:11434`

### Model Examples
- OpenRouter: `openai/gpt-4`, `anthropic/claude-3-opus`, `google/gemini-pro`
- Ollama: `llama2`, `mistral`, `neural-chat`, `gemma`

## Adding a New Provider

### Step 1: Create Provider Class
```csharp
public class MyNewProvider : IAIProvider
{
	private readonly HttpClient _httpClient;
	private readonly LLMOptions _options;
	private readonly ILogger<MyNewProvider> _logger;

	public MyNewProvider(HttpClient httpClient, IOptions<LLMOptions> options, ILogger<MyNewProvider> logger)
	{
		_httpClient = httpClient;
		_options = options.Value;
		_logger = logger;
	}

	public async Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken = default)
	{
		// Implement provider-specific logic here
		// Transform AIRequest to provider format
		// Call provider API
		// Transform response to AIResponse
	}
}
```

### Step 2: Register in Program.cs
```csharp
builder.Services.AddHttpClient<MyNewProvider>();

// In LLMProvider factory registration:
var myNewProvider = provider.GetRequiredService<MyNewProvider>();
var providers = new List<IAIProvider> 
{ 
	openRouterProvider, 
	ollamaProvider,
	myNewProvider  // Add here
};
```

### Step 3: Use in Configuration
```json
{
  "LLM": {
	"Provider": "MyNew",
	"BaseUrl": "https://api.mynewprovider.com",
	"Model": "model-name"
  }
}
```

## Provider Selection Logic

LLMProvider matches configuration to provider class name (case-insensitive):
- `"openrouter"` → matches `OpenRouterProvider`
- `"ollama"` → matches `OllamaProvider`
- `"mynew"` → matches `MyNewProvider`

Example:
```csharp
providerName = "ollama"
typeName = "OllamaProvider".ToLower() = "ollamaprovider"
Match: "ollamaprovider".Contains("ollama") = true ✓
```

## Ollama Provider Details

### API Endpoint
```
POST http://localhost:11434/api/chat
```

### Request Format
```json
{
  "model": "llama2",
  "messages": [
	{"role": "system", "content": "..."},
	{"role": "user", "content": "..."}
  ],
  "temperature": 0.7,
  "stream": false
}
```

### Response Format
```json
{
  "model": "llama2",
  "message": {
	"role": "assistant",
	"content": "Response content here"
  },
  "done": true,
  "prompt_eval_count": 100,
  "eval_count": 50
}
```

### Features
- ✅ No API key required
- ✅ Local execution (privacy-preserving)
- ✅ Multiple model support
- ✅ Performance metrics included
- ✅ Suitable for development/testing

## Docker Example: Running Ollama

```bash
# Pull Ollama image
docker pull ollama/ollama

# Run Ollama server
docker run -d \
  --name ollama \
  -p 11434:11434 \
  ollama/ollama

# Pull a model (e.g., llama2)
docker exec ollama ollama pull llama2

# Test API
curl http://localhost:11434/api/chat \
  -d '{
	"model": "llama2",
	"messages": [{"role": "user", "content": "Hello"}],
	"stream": false
  }'
```

## Switching Providers at Runtime

### Via Environment Variables
```bash
export LLM__Provider=Ollama
export LLM__BaseUrl=http://localhost:11434
export LLM__Model=llama2
dotnet run
```

### Via appsettings Files
```bash
# Development with Ollama
dotnet run --environment "Development" # Uses appsettings.Development.json with "Ollama"

# Production with OpenRouter
dotnet run --environment "Production" # Uses appsettings.Production.json with "OpenRouter"
```

## Error Messages

### Configuration Errors

**"LLMOptions.BaseUrl is required for Ollama provider"**
→ Set `LLM:BaseUrl` in appsettings.json

**"LLMOptions.Model is required for Ollama provider"**
→ Set `LLM:Model` in appsettings.json

**"LLM Provider 'xyz' not found. Registered providers: OpenRouterProvider, OllamaProvider"**
→ Provider name doesn't match any registered provider

### Runtime Errors

**"Ollama API returned 503:"**
→ Ollama server is not running or model not loaded

**"Ollama API request cancelled or timed out"**
→ Increase `TimeoutSeconds` in configuration or check network

## Performance Notes

| Scenario | Recommended Provider |
|----------|---------------------|
| Development | Ollama (local) |
| Testing | Ollama (fast iteration) |
| Production | OpenRouter (variety, reliability) |
| Privacy-Critical | Ollama (self-hosted) |
| Cost-Sensitive | Ollama (free compute) |

## Debugging

### Enable Detailed Logging
```json
{
  "Logging": {
	"LogLevel": {
	  "AIValidation.Api.Providers.LLMProvider": "Debug",
	  "AIValidation.Api.Providers.LLM.OllamaProvider": "Debug",
	  "AIValidation.Api.Services.ValidationService": "Debug"
	}
  }
}
```

### Check Provider Selection
Look for logs like:
```
LLM Provider: Selecting provider 'ollama'
LLM Provider: Using OllamaProvider for model 'llama2'
LLM Provider: Successfully received response from OllamaProvider
```

### Test Provider Directly
```csharp
var ollamaProvider = serviceProvider.GetRequiredService<OllamaProvider>();
var response = await ollamaProvider.GenerateAsync(request);
```

## Backward Compatibility

✅ **No Breaking Changes**
- Old code continues to work
- Default provider is "openrouter"
- ValidationService unchanged
- API interfaces unchanged

## Next Steps

1. **Test with Ollama**: Set up local Ollama instance and test
2. **Monitor Performance**: Track response times for both providers
3. **Add More Providers**: Gemini, Claude, etc. follow same pattern
4. **Optimize Configuration**: Find best provider/model for your use case

---

**Quick Start:**

Change one line in appsettings.json:
```json
"Provider": "Ollama"  // or "OpenRouter"
```

That's it! The entire system automatically uses the configured provider.

