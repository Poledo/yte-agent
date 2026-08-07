Task-024

Refactor the current LLM layer to support multiple providers.

Current implementation only supports OpenRouter.

Requirements:

1. Introduce provider abstraction.

Current interface:

ILLMProvider

must remain unchanged.

2. Implement

OpenRouterProvider

and

OllamaProvider

Both must implement IAIProvider.

3. Read configuration from

LLM.Provider

Supported values:

- OpenRouter
- Ollama

4. If Provider == Ollama

Call

POST /api/chat

BaseUrl comes from appsettings.

No API Key.

Request format:

{
    "model": "...",
    "messages":[...],
    "stream":false
}

Return assistant message.

5. Register providers through Dependency Injection.

Do not use if/else inside ValidationService.

Use Factory Pattern.

ValidationService must not know which provider is running.

6. Existing OpenRouter implementation must continue working without breaking changes.

7. Add XML documentation.

8. Keep code SOLID.

9. Preserve existing folder structure.

10. Provide unit-testable design.

Do not modify business logic.

Only refactor LLM infrastructure.