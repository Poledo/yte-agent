namespace AIValidation.Api.Providers.Interfaces;

using AIValidation.Api.Models;

/// <summary>
/// Interface for the Rule Engine that orchestrates validation rule execution.
/// 
/// Role:
/// - Manages a collection of registered validation rules
/// - Executes all rules sequentially or in parallel
/// - Aggregates validation issues from all rules
/// - Returns a ValidationResponse with collected issues
/// 
/// Responsibilities:
/// - Register/manage IRule implementations
/// - Execute rules in a consistent manner
/// - Collect and deduplicate issues if needed
/// - Handle rule failures gracefully
/// - Log rule execution details
/// 
/// SOLID Principles:
/// - Single Responsibility: Orchestrates rule execution
/// - Open/Closed: New rule implementations don't require changes
/// - Liskov Substitution: All rule implementations are treated uniformly
/// - Dependency Inversion: Depends on IRule abstraction
/// </summary>
public interface IRuleEngine
{
    /// <summary>
    /// Executes all registered validation rules asynchronously.
    /// </summary>
    /// <param name="request">The validation request containing page, trigger, context, and form data.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>
    /// A ValidationResponse containing:
    /// - IsValid: true if no issues found, false if any issues exist
    /// - Issues: Aggregated list of ValidationIssue objects from all rules
    /// - Summary: A summary of validation results
    /// </returns>
    /// <exception cref="ArgumentNullException">If request is null.</exception>
    /// <exception cref="OperationCanceledException">If operation is cancelled.</exception>
    Task<ValidationResponse> ExecuteAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default);
}
