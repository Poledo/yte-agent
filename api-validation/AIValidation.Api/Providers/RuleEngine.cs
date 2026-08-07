using AIValidation.Api.Models;
using AIValidation.Api.Providers.Interfaces;

namespace AIValidation.Api.Providers;

/// <summary>
/// The Rule Engine orchestrates validation rule execution.
/// 
/// Responsibilities:
/// - Executes all registered validation rules
/// - Aggregates validation issues from all rules
/// - Returns ValidationResponse with collected issues
/// - Handles rule execution errors gracefully
/// - Provides logging and tracing
/// 
/// Architecture:
/// - Depends on IEnumerable&lt;IRule&gt; for rule discovery (DI collection)
/// - Each rule executes independently and contributes its validation issues
/// - Rules are executed sequentially (can be optimized to parallel in future)
/// - If no rules are registered, returns ValidationResponse with empty Issues
/// 
/// SOLID Principles:
/// - Single Responsibility: Orchestrates rule execution only
/// - Open/Closed: New rules can be added via DI without modifying RuleEngine
/// - Liskov Substitution: All IRule implementations are treated uniformly
/// - Interface Segregation: Minimal dependency on IRuleEngine
/// - Dependency Inversion: Depends on IRule abstraction, not concrete rules
/// </summary>
public class RuleEngine : IRuleEngine
{
    private readonly IEnumerable<IRule> _rules;
    private readonly ILogger<RuleEngine> _logger;

    /// <summary>
    /// Initializes a new instance of the RuleEngine.
    /// </summary>
    /// <param name="rules">Collection of validation rules to execute. Can be empty.</param>
    /// <param name="logger">Logger for diagnostic information.</param>
    /// <exception cref="ArgumentNullException">If rules or logger is null.</exception>
    public RuleEngine(
        IEnumerable<IRule> rules,
        ILogger<RuleEngine> logger)
    {
        _rules = rules ?? throw new ArgumentNullException(nameof(rules));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Executes all registered validation rules asynchronously.
    /// 
    /// Execution Flow:
    /// 1. Log the start of rule engine execution
    /// 2. Iterate through all registered rules
    /// 3. Execute each rule with the provided request
    /// 4. Collect validation issues from each rule
    /// 5. Aggregate results into a ValidationResponse
    /// 6. Return response with IsValid flag and collected issues
    /// 
    /// Error Handling:
    /// - If a rule throws an exception, it is caught and logged
    /// - Other rules continue executing (fail-safe behavior)
    /// - The exception does not propagate (allows partial validation)
    /// 
    /// Empty Rules Case:
    /// - If no rules are registered, returns ValidationResponse with empty Issues
    /// - IsValid is set to true (no issues = valid)
    /// - Summary indicates no rules were executed
    /// </summary>
    /// <param name="request">The validation request containing page, trigger, context, and form.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>
    /// ValidationResponse containing:
    /// - IsValid: true if no issues found, false if any issues exist
    /// - Issues: Aggregated list of ValidationIssue objects from all rules
    /// - Summary: A summary of validation results
    /// </returns>
    /// <exception cref="ArgumentNullException">If request is null.</exception>
    /// <exception cref="OperationCanceledException">If operation is cancelled.</exception>
    public async Task<ValidationResponse> ExecuteAsync(
        ValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        try
        {
            _logger.LogInformation(
                "Thực thi RuleEngine bắt đầu cho Page={Page}, Trigger={Trigger}",
                request.Page,
                request.Trigger.Field);

            var allIssues = new List<ValidationIssue>();
            var rulesList = _rules.ToList();

            if (rulesList.Count == 0)
            {
                _logger.LogInformation("Không có quy tắc xác thực được đăng ký");
                return new ValidationResponse
                {
                    IsValid = true,
                    Issues = new List<ValidationIssue>(),
                    Summary = "Không có quy tắc xác thực được đăng ký"
                };
            }

            _logger.LogInformation("Thực thi {RuleCount} quy tắc xác thực", rulesList.Count);

            // Thực thi các quy tắc và thu thập lỗi
            foreach (var rule in rulesList)
            {
                try
                {
                    //cancellationToken.ThrowIfCancellationRequested();

                    _logger.LogDebug("Thực thi quy tắc: {RuleId} - {RuleName}", rule.RuleId, rule.RuleName);

                    var ruleIssues = await rule.ValidateAsync(request, cancellationToken);

                    if (ruleIssues != null && ruleIssues.Count > 0)
                    {
                        allIssues.AddRange(ruleIssues);
                        _logger.LogInformation(
                            "Quy tắc {RuleId} tìm thấy {IssueCount} lỗi",
                            rule.RuleId,
                            ruleIssues.Count);

                        // Dừng sớm: Nếu ICD không tồn tại hoặc bị hủy, dừng kiểm tra các quy tắc khác
                        if (ruleIssues.Any(issue => issue.Code == "ICD_NOT_FOUND" || issue.Code == "ICD_CANCELLED"))
                        {
                            _logger.LogInformation("Dừng kiểm tra vì tìm thấy lỗi ICD nghiêm trọng");
                            break; // Dừng kiểm tra các quy tắc tiếp theo
                        }
                    }
                    else
                    {
                        _logger.LogDebug("Quy tắc {RuleId} hoàn thành không có lỗi", rule.RuleId);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Quy tắc {RuleId} thực thi bị hủy", rule.RuleId);
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Lỗi khi thực thi quy tắc {RuleId}: {Message}",
                        rule.RuleId,
                        ex.Message);

                    // Tiếp tục với các quy tắc khác ngay cả khi quy tắc này thất bại
                    // Điều này đảm bảo hành vi xác thực an toàn
                }
            }

            // Xây dựng phản hồi xác thực
            var isValid = allIssues.Count == 0;
            var summary = isValid
                ? "Xác thực hoàn thành thành công không có lỗi"
                : $"Xác thực hoàn thành với {allIssues.Count} lỗi được tìm thấy";

            _logger.LogInformation(
                "Thực thi RuleEngine hoàn thành: IsValid={IsValid}, IssueCount={IssueCount}",
                isValid,
                allIssues.Count);

            return new ValidationResponse
            {
                IsValid = isValid,
                Issues = allIssues,
                Summary = summary
            };
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "Thực thi RuleEngine bị hủy");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi nghiêm trọng trong thực thi RuleEngine");
            throw new InvalidOperationException("Thực thi RuleEngine thất bại", ex);
        }
    }
}
