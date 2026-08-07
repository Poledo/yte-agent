using AIValidation.Api.Models;

namespace AIValidation.Api.Providers.Interfaces;

/// <summary>
/// Interface for validation rules that execute within the Rule Engine.
/// 
/// Each rule is responsible for validating a specific aspect of the validation request
/// and producing validation issues if problems are found.
/// 
/// Role:
/// - Receive ValidationRequest containing page, trigger, context, and form
/// - Perform validation logic
/// - Return list of ValidationIssue objects (empty if no issues)
/// 
/// SOLID Principles:
/// - Single Responsibility: Each rule validates one specific concern
/// - Open/Closed: New rules can be added without modifying existing code
/// - Liskov Substitution: All rules are interchangeable
/// - Interface Segregation: Minimal interface contract
/// </summary>
public interface IRule
{
    /// <summary>
    /// Gets a unique identifier for this rule.
    /// Used for logging, debugging, and rule management.
    /// </summary>
    string RuleId { get; }

    /// <summary>
    /// Gets the display name for this rule (human-readable).
    /// </summary>
    string RuleName { get; }

    /// <summary>
    /// Executes the validation rule asynchronously.
    /// </summary>
    /// <param name="request">The validation request containing all necessary data for validation.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>
    /// A list of ValidationIssue objects representing problems found during validation.
    /// Returns an empty list if no issues are found.
    /// </returns>
    /// <exception cref="ArgumentNullException">If request is null.</exception>
    /// <exception cref="OperationCanceledException">If operation is cancelled.</exception>
    Task<List<ValidationIssue>> ValidateAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default);
}
