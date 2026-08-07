using AIValidation.Api.Data.Entities;

namespace AIValidation.Api.Data.Repositories.Interfaces;

/// <summary>
/// Repository interface cho Knowledge data access.
///
/// Mục đích:
/// - Abstract database access logic
/// - Provide contract for data retrieval
/// - Enable unit testing via mocking
/// - Implement Repository Pattern
///
/// Design:
/// - Simple, targeted methods
/// - Async/await support
/// - CancellationToken integration
/// - IReadOnlyList (immutable results)
///
/// Typical Usage:
/// - Called by KnowledgeProvider
/// - Searches for relevant knowledge
/// - Returns filtered, active items
/// - Results used in prompt building
/// </summary>
public interface IKnowledgeRepository
{
    /// <summary>
    /// Search knowledge items by category and optional keyword.
    ///
    /// Criteria:
    /// - Category (required): Type of knowledge (ICD, DVKT, Drug, etc.)
    /// - Keyword (optional): Filter by name or content
    /// - IsActive: Implicitly true (only active items)
    ///
    /// Process:
    /// 1. Filter by category
    /// 2. Filter by IsActive = true
    /// 3. If keyword provided: Filter by name or content contains
    /// 4. Return results
    /// 5. No specific ordering (caller can order if needed)
    ///
    /// Performance:
    /// - Category index ensures fast category filter
    /// - Keyword search may do table scan (consider FULLTEXT later)
    ///
    /// Notes:
    /// - Returns readonly list (immutable)
    /// - Can return empty list if no matches
    /// - Does not throw if no results (null is not returned)
    /// </summary>
    /// <param name="category">
    /// Knowledge category to search (required).
    /// Examples: "ICD", "DVKT", "Drug"
    /// </param>
    /// <param name="keyword">
    /// Optional keyword to filter by name or content.
    /// Null/empty means no keyword filter (return all in category).
    /// </param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>
    /// IReadOnlyList of matching KnowledgeItems.
    /// Empty list if no matches.
    /// Never null.
    /// </returns>
    /// <exception cref="ArgumentException">Nếu category null hoặc empty.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> SearchAsync(
        string category,
        string? keyword,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Search knowledge items by category and code.
    ///
    /// Criteria:
    /// - Category (required): Type of knowledge (ICD, DVKT, Drug, etc.)
    /// - Code (required): Standard code (exact match)
    /// - IsActive: Implicitly true (only active items)
    ///
    /// Process:
    /// 1. Filter by category
    /// 2. Filter by code (exact match)
    /// 3. Filter by IsActive = true
    /// 4. Return results
    ///
    /// Performance:
    /// - Code index ensures fast lookup
    /// - Typically returns 0 or 1 result (code is unique per category)
    ///
    /// Usage:
    /// - Find specific ICD code (e.g., "O80")
    /// - Retrieve exact knowledge record
    /// - Used for gender/applicability validation
    ///
    /// Notes:
    /// - Returns readonly list (immutable)
    /// - Can return empty list if code not found
    /// - Does not throw if no results (null is not returned)
    /// </summary>
    /// <param name="category">
    /// Knowledge category to search (required).
    /// Examples: "ICD", "DVKT", "Drug"
    /// </param>
    /// <param name="code">
    /// Standard code to search for (required, exact match).
    /// Examples: "O80", "N40", "ICD-10-A00.0"
    /// </param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>
    /// IReadOnlyList of matching KnowledgeItems (0 or 1 typically).
    /// Empty list if not found.
    /// Never null.
    /// </returns>
    /// <exception cref="ArgumentException">Nếu category hoặc code null hoặc empty.</exception>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> SearchByCodeAsync(
        string category,
        string code,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all ICD knowledge items.
    ///
    /// Convenience method for retrieving ICD (International Classification of Diseases) data.
    ///
    /// Usage:
    /// - Fetch all ICD codes for display
    /// - Search without specific code
    /// - Populate dropdowns/autocomplete
    /// - Batch retrieve for caching
    ///
    /// Returns:
    /// - All active ICD knowledge items
    /// - Ordered by code for consistency
    /// - Never null (empty list if none)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>IReadOnlyList of all active ICD items.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> GetIcdAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a specific ICD code by its code value.
    ///
    /// Usage:
    /// - Fallback lookup when code not found in JSON cache
    /// - On-demand query for new codes added to database
    /// - Avoid loading all ICD codes into memory
    ///
    /// Returns:
    /// - A single KnowledgeItem if found
    /// - Null if code does not exist
    /// - Only returns active items
    /// </summary>
    /// <param name="code">ICD code to look up (e.g., "A00", "A00.0")</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>KnowledgeItem if found, null otherwise.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<KnowledgeItem?> GetIcdByCodeAsync(
        string code, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all Procedure (DVKT) knowledge items.
    ///
    /// Convenience method for retrieving procedure/technique (DVKT) data.
    ///
    /// Usage:
    /// - Fetch all procedure codes
    /// - Validate procedure references
    /// - Build procedure catalogs
    ///
    /// Returns:
    /// - All active procedure knowledge items
    /// - Ordered by code for consistency
    /// - Never null (empty list if none)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>IReadOnlyList of all active procedure items.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> GetProceduresAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all Drug knowledge items.
    ///
    /// Convenience method for retrieving drug/medication data.
    ///
    /// Usage:
    /// - Fetch all drug codes
    /// - Validate drug prescriptions
    /// - Check drug interactions
    /// - Build formularies
    ///
    /// Returns:
    /// - All active drug knowledge items
    /// - Ordered by code for consistency
    /// - Never null (empty list if none)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>IReadOnlyList of all active drug items.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> GetDrugsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all Rule knowledge items (Insurance Rules, Guidelines, etc.).
    ///
    /// Convenience method for retrieving rules and guidelines.
    ///
    /// Usage:
    /// - Fetch insurance coverage rules
    /// - Retrieve clinical guidelines
    /// - Get validation rules
    /// - Load business logic rules
    ///
    /// Returns:
    /// - All active rule knowledge items
    /// - Ordered by code for consistency
    /// - Never null (empty list if none)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>IReadOnlyList of all active rule items.</returns>
    /// <exception cref="OperationCanceledException">Nếu operation bị hủy.</exception>
    Task<IReadOnlyList<KnowledgeItem>> GetRulesAsync(
        CancellationToken cancellationToken = default);
}
