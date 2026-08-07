using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Controllers
{
    /// <summary>
    /// Weather Forecast API Controller (Sample).
    /// 
    /// This is a sample controller provided by ASP.NET Core template.
    /// It demonstrates basic HTTP GET endpoint functionality.
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly string[] Summaries =
        [
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        ];

        /// <summary>
        /// Gets a list of weather forecasts.
        /// </summary>
        /// <remarks>
        /// Returns 5 days of randomly generated weather forecast data.
        /// This is a sample endpoint for demonstration purposes.
        /// </remarks>
        /// <returns>An enumerable collection of weather forecast objects.</returns>
        [HttpGet(Name = "GetWeatherForecast")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IEnumerable<WeatherForecast> Get()
        {
            return Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            })
            .ToArray();
        }
    }
}
