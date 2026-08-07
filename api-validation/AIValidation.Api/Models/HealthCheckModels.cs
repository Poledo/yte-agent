using System.Text.Json.Serialization;

namespace AIValidation.Api.Models;

/// <summary>
/// Health check response model.
/// 
/// Represents the overall health status of the application.
/// Used for monitoring and debugging purposes.
/// </summary>
public class HealthResponse
{
    /// <summary>
    /// Overall system status.
    /// 
    /// Values:
    /// - "healthy": All components working
    /// - "unhealthy": One or more components failed
    /// - "degraded": System operational but with issues
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "healthy";

    /// <summary>
    /// Application version.
    /// Format: semantic versioning (e.g., "1.0.0")
    /// </summary>
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0.0";

    /// <summary>
    /// Current runtime environment.
    /// 
    /// Values:
    /// - "Development"
    /// - "Staging"
    /// - "Production"
    /// </summary>
    [JsonPropertyName("environment")]
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// Server current time in UTC ISO 8601 format.
    /// Example: "2025-01-13T10:30:45.123Z"
    /// </summary>
    [JsonPropertyName("serverTime")]
    public string ServerTime { get; set; } = DateTime.UtcNow.ToString("O");
}

/// <summary>
/// Database health check response.
/// 
/// Contains database connectivity and status information.
/// </summary>
public class DatabaseHealthResponse
{
    /// <summary>
    /// Health status of the database.
    /// 
    /// Values:
    /// - "healthy": Database connection successful
    /// - "unhealthy": Cannot connect to database
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "healthy";

    /// <summary>
    /// Database type identifier.
    /// Fixed value: "PostgreSQL"
    /// </summary>
    [JsonPropertyName("database")]
    public string Database { get; set; } = "PostgreSQL";

    /// <summary>
    /// Indicates whether the application can connect to the database.
    /// true if connection test succeeded, false otherwise.
    /// </summary>
    [JsonPropertyName("canConnect")]
    public bool CanConnect { get; set; } = false;
}

/// <summary>
/// Repository health check response.
/// 
/// Contains information about data repository accessibility.
/// </summary>
public class RepositoryHealthResponse
{
    /// <summary>
    /// Health status of the repository.
    /// 
    /// Values:
    /// - "healthy": Repository accessible and working
    /// - "unhealthy": Repository failed
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "healthy";

    /// <summary>
    /// Sample knowledge item code retrieved for testing.
    /// Example: "O80", "N40", "ICD123"
    /// null if no sample found.
    /// </summary>
    [JsonPropertyName("sampleCode")]
    public string? SampleCode { get; set; }

    /// <summary>
    /// Category of the sample knowledge item.
    /// Example: "ICD", "Procedure", "Drug", "Rule"
    /// null if no sample found.
    /// </summary>
    [JsonPropertyName("sampleCategory")]
    public string? SampleCategory { get; set; }
}
