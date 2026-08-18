using AIValidation.Api.Data;
using AIValidation.Api.Data.Repositories.Interfaces;
using AIValidation.Api.Models;
using AIValidation.Api.Authorization.Dynamic;
using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers;

/// <summary>Health Check API for monitoring system status.</summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ILogger<HealthController> _logger;
    private readonly AppDbContext _dbContext;
    private readonly IKnowledgeRepository _knowledgeRepository;
    private readonly IHostEnvironment _environment;

    /// <summary>Initialize HealthController.</summary>
    public HealthController(
        ILogger<HealthController> logger,
        AppDbContext dbContext,
        IKnowledgeRepository knowledgeRepository,
        IHostEnvironment environment)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _knowledgeRepository = knowledgeRepository ?? throw new ArgumentNullException(nameof(knowledgeRepository));
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
    }

    /// <summary>Get overall system health status.</summary>
    /// <returns>HealthResponse with system status information</returns>
    [IgnorePermission("Đầu dò sức khỏe của hạ tầng, gọi trước khi có tài khoản")]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HealthResponse))]
    public ActionResult<HealthResponse> GetHealth()
    {
        _logger.LogInformation("Health check endpoint called");

        var response = new HealthResponse
        {
            Status = "healthy",
            Version = "1.0.0",
            Environment = _environment.EnvironmentName,
            ServerTime = DateTime.UtcNow.ToString("O")
        };

        return Ok(response);
    }

    /// <summary>Check database connectivity.</summary>
    /// <param name="cancellationToken">Cancellation token for async operation</param>
    /// <returns>DatabaseHealthResponse with connection status</returns>
    [IgnorePermission("Đầu dò sức khỏe của hạ tầng, gọi trước khi có tài khoản")]
    [HttpGet("database")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(DatabaseHealthResponse))]
    public async Task<ActionResult<DatabaseHealthResponse>> GetDatabaseHealth(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Database health check requested");

        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
            _logger.LogInformation("Database connectivity check: {CanConnect}", canConnect);

            var response = new DatabaseHealthResponse
            {
                Status = canConnect ? "healthy" : "unhealthy",
                Database = "PostgreSQL",
                CanConnect = canConnect
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database health check failed");

            var errorResponse = new DatabaseHealthResponse
            {
                Status = "unhealthy",
                Database = "PostgreSQL",
                CanConnect = false
            };

            return Ok(errorResponse);
        }
    }

    /// <summary>Check repository functionality.</summary>
    /// <param name="cancellationToken">Cancellation token for async operation</param>
    /// <returns>RepositoryHealthResponse with sample data</returns>
    [IgnorePermission("Đầu dò sức khỏe của hạ tầng, gọi trước khi có tài khoản")]
    [HttpGet("repository")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(RepositoryHealthResponse))]
    public async Task<ActionResult<RepositoryHealthResponse>> GetRepositoryHealth(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Repository health check requested");

        try
        {
            var items = await _knowledgeRepository.GetIcdAsync(cancellationToken);
            var firstItem = items.FirstOrDefault();

            if (firstItem != null)
            {
                _logger.LogInformation(
                    "Repository health check succeeded. Sample: Code={Code}, Category={Category}",
                    firstItem.Code,
                    firstItem.Category);

                var response = new RepositoryHealthResponse
                {
                    Status = "healthy",
                    SampleCode = firstItem.Code,
                    SampleCategory = firstItem.Category
                };

                return Ok(response);
            }
            else
            {
                _logger.LogWarning("Repository health check: No data found");

                var emptyResponse = new RepositoryHealthResponse
                {
                    Status = "healthy",
                    SampleCode = null,
                    SampleCategory = null
                };

                return Ok(emptyResponse);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Repository health check failed");

            var errorResponse = new RepositoryHealthResponse
            {
                Status = "unhealthy",
                SampleCode = null,
                SampleCategory = null
            };

            return Ok(errorResponse);
        }
    }
}
