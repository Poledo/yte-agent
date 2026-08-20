using AIValidation.Api.Data.Repositories.Interfaces;
using AIValidation.Api.Models;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// Provider to retrieve knowledge data from PostgreSQL database via repository.
///
/// Mục đích:
/// - Provide reference knowledge for validation prompts
/// - Query KnowledgeItems from database using repository pattern
/// - Support multiple knowledge categories (ICD, DVKT, Drug, etc.)
/// - Handle cancellation and error cases
/// - Log knowledge retrieval for monitoring
///
/// Architecture:
/// - Depends on IKnowledgeRepository (data layer)
/// - Returns IReadOnlyList&lt;KnowledgeDocument&gt; (immutable contract)
/// - No business logic (data access only)
/// - Async/await with CancellationToken support
/// - Structured logging with document counts
///
/// Future Extensions:
/// - Support vector search for semantic relevance
/// - Implement keyword scoring/ranking
/// - Cache frequently used knowledge items
/// - Support multiple data sources with fallback
/// </summary>
public class KnowledgeProvider : IKnowledgeProvider
{
    private readonly IKnowledgeRepository _repository;
    private readonly ILogger<KnowledgeProvider> _logger;

    /// <summary>
    /// Khởi tạo KnowledgeProvider với knowledge repository.
    ///
    /// Dependency Injection Pattern:
    /// - IKnowledgeRepository: Scoped (one per request)
    /// - ILogger<KnowledgeProvider>: Singleton (logger factory)
    /// - AppDbContext: Scoped (same lifetime as repository)
    /// - Registered in Program.cs via AddScoped<IKnowledgeRepository, KnowledgeRepository>
    ///
    /// Layered Architecture:
    /// KnowledgeProvider (orchestration)
    ///   ↓
    /// IKnowledgeRepository (contract)
    ///   ↓
    /// KnowledgeRepository (EF Core implementation)
    ///   ↓
    /// AppDbContext (PostgreSQL access)
    /// </summary>
    /// <param name="repository">Knowledge repository for database queries.</param>
    /// <param name="logger">Logger for knowledge retrieval tracking.</param>
    /// <exception cref="ArgumentNullException">Nếu repository hoặc logger null.</exception>
    public KnowledgeProvider(IKnowledgeRepository repository, ILogger<KnowledgeProvider> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Get knowledge documents relevant to validation request.
    ///
    /// Purpose:
    /// - Extract ICD code from request form
    /// - Query knowledge repository for specific ICD
    /// - Return knowledge context for prompt building
    ///
    /// Implementation (Task-015):
    /// - Extract ICD code from request.Form (e.g., "icdCode", "ICD")
    /// - Search repository by category="ICD" and code=extracted_code
    /// - Convert KnowledgeItem to KnowledgeDocument
    /// - Include metadata for AI context
    ///
    /// Process:
    /// 1. Parse request.Form to extract ICD code
    /// 2. Query repository: SearchByCodeAsync("ICD", icdCode)
    /// 3. Map KnowledgeItem → KnowledgeDocument
    /// 4. Attach metadata (code, content for AI context)
    /// 5. Return as IReadOnlyList&lt;KnowledgeDocument&gt;
    ///
    /// Task-015 Specific:
    /// - Validates ICD O80 (female only) vs male patients
    /// - Validates ICD N40 (male only) vs female patients
    /// - AI will evaluate based on returned knowledge
    ///
    /// Future Enhancements:
    /// - Support multiple knowledge types (DVKT, Drug)
    /// - Implement intelligent extraction from Form fields
    /// - Add caching for frequently used codes
    /// - Support vector search for semantic matching
    /// </summary>
    /// <param name="request">Validation request containing form data and ICD code.</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>IReadOnlyList of KnowledgeDocument with ICD knowledge context.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    public async Task<IReadOnlyList<KnowledgeDocument>> GetKnowledgeAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var documents = new List<KnowledgeDocument>();

        // Extract ICD code from request.Form (JsonElement)
        // Common field names: "icdCode", "ICD", "diagnosis_code"
        // Attempt to get ICD code from form
        var icdCode = ExtractIcdCodeFromForm(request.Form);

        _logger.LogInformation(
            "KnowledgeProvider retrieving knowledge for request with ICD code: {IcdCode}",
            string.IsNullOrWhiteSpace(icdCode) ? "(not found)" : icdCode);

        if (!string.IsNullOrWhiteSpace(icdCode))
        {
            // Query repository for specific ICD code
            var items = await _repository.SearchByCodeAsync(
                "ICD",
                icdCode,
                cancellationToken);

            _logger.LogInformation(
                "Retrieved {DocumentCount} ICD knowledge items for code: {IcdCode}",
                items.Count,
                icdCode);

            // Map KnowledgeItem to KnowledgeDocument
            var docs = items
                .Select(item => new KnowledgeDocument
                {
                    Name = item.Name,
                    Category = item.Category,
                    Content = item.Content,
                    Score = null,  // No scoring at database layer
                    Metadata = new Dictionary<string, string>
                    {
                        { "code", item.Code },
                        { "id", item.Id.ToString() },
                        { "applicable_to", ExtractApplicabilityInfo(item) }
                    }
                })
                .ToList();

            documents.AddRange(docs);
        }
        else
        {
            _logger.LogWarning("No ICD code found in validation request");
        }

        _logger.LogInformation(
            "KnowledgeProvider completed with total {DocumentCount} knowledge documents",
            documents.Count);

        return documents.AsReadOnly();
    }

    /// <summary>
    /// Extract ICD code from request form data.
    ///
    /// Attempts common field names:
    /// - "icdCode" (camelCase)
    /// - "ICD" (uppercase)
    /// - "diagnosis_code"
    /// - "icd_code"
    ///
    /// Returns null if not found.
    /// </summary>
    private static string? ExtractIcdCodeFromForm(System.Text.Json.JsonElement form)
    {
        // Try different property names
        var propertyNames = new[] { "icdCode", "ICD", "diagnosis_code", "icd_code", "Icd" };

        foreach (var propertyName in propertyNames)
        {
            if (form.TryGetProperty(propertyName, out var property) &&
                property.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                var value = property.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Extract applicability information from knowledge item.
    ///
    /// Parses content to determine if gender-restricted.
    /// Task-015: Detects "chỉ áp dụng cho bệnh nhân nữ" or "nam"
    ///
    /// Returns description for AI context.
    /// </summary>
    private static string ExtractApplicabilityInfo(AIValidation.Api.Data.Entities.KnowledgeItem item)
    {
        var content = item.Content.ToLower();

        if (content.Contains("chỉ áp dụng cho bệnh nhân nữ") || content.Contains("nữ"))
        {
            return "female_only";
        }

        if (content.Contains("chỉ áp dụng cho bệnh nhân nam") || content.Contains("nam"))
        {
            return "male_only";
        }

        return "all";
    }
}

