using AIValidation.Api.Data.Entities;
using AIValidation.Api.Data.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Data.Repositories;

/// <summary>
/// KnowledgeRepository - EF Core implementation of IKnowledgeRepository.
///
/// Mục đích:
/// - Implement data access layer using Entity Framework Core
/// - Execute queries against PostgreSQL database
/// - Return filtered, active knowledge items
/// - Handle async database operations
///
/// Responsibilities:
/// - Build LINQ queries
/// - Execute against DbContext
/// - Apply category filter
/// - Apply keyword filter (if provided)
/// - Filter active items (IsActive = true)
/// - Return results as IReadOnlyList
///
/// Design:
/// - Zero business logic
/// - Pure data access
/// - EF Core query execution
/// - Async/await support
/// - CancellationToken support
///
/// Query Strategy:
/// - Category filter: Use indexed column
/// - IsActive filter: Part of indexed query
/// - Keyword filter: LINQ Contains (translates to SQL LIKE)
/// - Result: IQueryable → ToListAsync → AsReadOnly
/// </summary>
public class KnowledgeRepository : IKnowledgeRepository
{
    private readonly AppDbContext _context;

    /// <summary>
    /// Khởi tạo KnowledgeRepository.
    ///
    /// Constructor Injection:
    /// - AppDbContext: Database context từ DI
    ///
    /// Scoped Lifetime:
    /// - One instance per request
    /// - DbContext also scoped (same instance)
    /// - Proper transaction boundaries
    /// </summary>
    /// <param name="context">AppDbContext instance.</param>
    /// <exception cref="ArgumentNullException">Nếu context null.</exception>
    public KnowledgeRepository(AppDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Search knowledge items by category and optional keyword.
    ///
    /// Implementation Details:
    /// 1. Validate category is not empty
    /// 2. Start with KnowledgeItems DbSet
    /// 3. Filter by category (uses index)
    /// 4. Filter by IsActive = true
    /// 5. If keyword provided:
    ///    - Filter by EF.Functions.Like for SQL LIKE query
    ///    - Or filter by Contains on Name + Content
    /// 6. Execute query asynchronously
    /// 7. Convert to List
    /// 8. Return as IReadOnlyList (immutable)
    ///
    /// Query Execution:
    /// - LINQ query built and translated to SQL
    /// - Executed on PostgreSQL database
    /// - Results materialized into memory
    /// - Awaited asynchronously
    ///
    /// Performance:
    /// - Category + IsActive: Indexed query (fast)
    /// - Keyword: May scan multiple filtered rows (acceptable for now)
    /// - Future optimization: Full-text search index, Vector search
    ///
    /// Async Pattern:
    /// - ToListAsync() executes query asynchronously
    /// - Doesn't block thread
    /// - CancellationToken honored by DbContext
    /// </summary>
    /// <param name="category">Knowledge category (ICD, DVKT, Drug, etc.).</param>
    /// <param name="keyword">Optional keyword to filter by name or content.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of matching KnowledgeItems.</returns>
    /// <exception cref="ArgumentException">Nếu category null hoặc empty.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    public async Task<IReadOnlyList<KnowledgeItem>> SearchAsync(
        string category,
        string? keyword,
        CancellationToken cancellationToken = default)
    {
        // Validate category
        if (string.IsNullOrWhiteSpace(category))
        {
            throw new ArgumentException("Category cannot be null or empty", nameof(category));
        }

        // Build query
        var query = _context.KnowledgeItems
            .Where(k => k.Category == category && k.IsActive);

        // Apply keyword filter if provided
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            // Search in Name or Content (case-insensitive)
            var keywordLower = keyword.ToLower();
            query = query.Where(k =>
                k.Name.ToLower().Contains(keywordLower) ||
                k.Content.ToLower().Contains(keywordLower));
        }

        // Execute query asynchronously
        var items = await query.ToListAsync(cancellationToken);

        // Return as IReadOnlyList (immutable)
        return items.AsReadOnly();
    }

    /// <summary>
    /// Search knowledge items by category and exact code match.
    ///
    /// Implementation Details:
    /// 1. Validate category and code are not empty
    /// 2. Start with KnowledgeItems DbSet
    /// 3. Filter by category (uses index)
    /// 4. Filter by code (exact match, uses index)
    /// 5. Filter by IsActive = true
    /// 6. Execute query asynchronously
    /// 7. Convert to List
    /// 8. Return as IReadOnlyList (immutable)
    ///
    /// Query Execution:
    /// - LINQ query with indexed column filters
    /// - Fast lookup via unique code per category
    /// - Returns 0 or 1 result typically
    ///
    /// Performance:
    /// - Category + Code: Both indexed (very fast)
    /// - IsActive: Additional filter post-index
    /// - Single code lookup
    ///
    /// Use Cases:
    /// - Retrieve specific ICD code (e.g., "O80")
    /// - Gender/applicability validation
    /// - Exact knowledge reference
    /// </summary>
    /// <param name="category">Knowledge category (ICD, DVKT, Drug, etc.).</param>
    /// <param name="code">Standard code to find (exact match).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of matching KnowledgeItems (0 or 1).</returns>
    /// <exception cref="ArgumentException">Nếu category hoặc code null hoặc empty.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    public async Task<IReadOnlyList<KnowledgeItem>> SearchByCodeAsync(
        string category,
        string code,
        CancellationToken cancellationToken = default)
    {
        // Validate category and code
        if (string.IsNullOrWhiteSpace(category))
        {
            throw new ArgumentException("Category cannot be null or empty", nameof(category));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Code cannot be null or empty", nameof(code));
        }

        // Build query
        var items = await _context.KnowledgeItems
            .Where(k => k.Category == category && k.Code == code && k.IsActive)
            .ToListAsync(cancellationToken);

        // Return as IReadOnlyList (immutable)
        return items.AsReadOnly();
    }

    /// <summary>
    /// Get all ICD knowledge items.
    ///
    /// Implementation:
    /// - Query KnowledgeItems with category = "ICD"
    /// - Filter IsActive = true
    /// - Order by Code for consistency
    /// - Execute asynchronously
    /// - Return immutable list
    ///
    /// Performance:
    /// - Category indexed query
    /// - Typically 1000-5000 items
    /// - Consider pagination for large datasets
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of all active ICD items.</returns>
    public async Task<IReadOnlyList<KnowledgeItem>> GetIcdAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await _context.KnowledgeItems
            .Where(k => k.Category == "ICD" && k.IsActive)
            .OrderBy(k => k.Code)
            .Select(k => new KnowledgeItem
            {
                Id = k.Id,
                Category = k.Category,
                Code = k.Code,
                Name = k.Name,
                Content = k.Content,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                Metadata = null  // Explicit null to avoid JSONB deserialization
            })
            .ToListAsync(cancellationToken);

        return items.AsReadOnly();
    }

    /// <summary>
    /// Get a specific ICD code by its code value.
    ///
    /// Implementation:
    /// - Query KnowledgeItems with category = "ICD"
    /// - Filter by exact code match (case-insensitive)
    /// - Filter IsActive = true
    /// - Return single item or null
    /// - Execute asynchronously
    ///
    /// Performance:
    /// - Code indexed query for fast lookup
    /// - Single record fetch
    /// </summary>
    public async Task<KnowledgeItem?> GetIcdByCodeAsync(
        string code,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var item = await _context.KnowledgeItems
            .Where(k => k.Category == "ICD" 
                && k.IsActive 
                && k.Code.ToLower() == code.ToLower())
            .Select(k => new KnowledgeItem
            {
                Id = k.Id,
                Category = k.Category,
                Code = k.Code,
                Name = k.Name,
                Content = k.Content,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                Metadata = k.Metadata  // Include metadata for flags
            })
            .FirstOrDefaultAsync(cancellationToken);

        return item;
    }

    /// <summary>
    /// Get all Procedure (DVKT) knowledge items.
    ///
    /// Implementation:
    /// - Query KnowledgeItems with category = "Procedure"
    /// - Filter IsActive = true
    /// - Order by Code for consistency
    /// - Execute asynchronously
    /// - Return immutable list
    ///
    /// Performance:
    /// - Category indexed query
    /// - Typically 500-2000 items
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of all active procedure items.</returns>
    public async Task<IReadOnlyList<KnowledgeItem>> GetProceduresAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await _context.KnowledgeItems
            .Where(k => k.Category == "Procedure" && k.IsActive)
            .OrderBy(k => k.Code)
            .Select(k => new KnowledgeItem
            {
                Id = k.Id,
                Category = k.Category,
                Code = k.Code,
                Name = k.Name,
                Content = k.Content,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                Metadata = null  // Explicit null to avoid JSONB deserialization
            })
            .ToListAsync(cancellationToken);

        return items.AsReadOnly();
    }

    /// <summary>
    /// Get all Drug knowledge items.
    ///
    /// Implementation:
    /// - Query KnowledgeItems with category = "Drug"
    /// - Filter IsActive = true
    /// - Order by Code for consistency
    /// - Execute asynchronously
    /// - Return immutable list
    ///
    /// Performance:
    /// - Category indexed query
    /// - Typically 5000-15000 items (consider pagination)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of all active drug items.</returns>
    public async Task<IReadOnlyList<KnowledgeItem>> GetDrugsAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await _context.KnowledgeItems
            .Where(k => k.Category == "Drug" && k.IsActive)
            .OrderBy(k => k.Code)
            .Select(k => new KnowledgeItem
            {
                Id = k.Id,
                Category = k.Category,
                Code = k.Code,
                Name = k.Name,
                Content = k.Content,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                Metadata = null  // Explicit null to avoid JSONB deserialization
            })
            .ToListAsync(cancellationToken);

        return items.AsReadOnly();
    }

    /// <summary>
    /// Get all Rule knowledge items.
    ///
    /// Implementation:
    /// - Query KnowledgeItems with category = "Rule"
    /// - Filter IsActive = true
    /// - Order by Code for consistency
    /// - Execute asynchronously
    /// - Return immutable list
    ///
    /// Performance:
    /// - Category indexed query
    /// - Typically 100-500 items
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>IReadOnlyList of all active rule items.</returns>
    public async Task<IReadOnlyList<KnowledgeItem>> GetRulesAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await _context.KnowledgeItems
            .Where(k => k.Category == "Rule" && k.IsActive)
            .OrderBy(k => k.Code)
            .Select(k => new KnowledgeItem
            {
                Id = k.Id,
                Category = k.Category,
                Code = k.Code,
                Name = k.Name,
                Content = k.Content,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                Metadata = null  // Explicit null to avoid JSONB deserialization
            })
            .ToListAsync(cancellationToken);

        return items.AsReadOnly();
    }
}

