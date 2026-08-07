namespace AIValidation.Api.Exceptions;

/// <summary>
/// Exception thrown when response processing fails.
///
/// This exception is thrown by ResponseProcessor when:
/// - AI response cannot be parsed as valid JSON
/// - JSON is malformed or incomplete
/// - Required fields are missing from the response
/// - Response structure doesn't match ValidationResponse contract
///
/// Wraps underlying technical exceptions (JsonException, etc.) into a
/// domain-specific exception for consistent error handling in the validation pipeline.
/// </summary>
public class ResponseProcessingException : InvalidOperationException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ResponseProcessingException"/> class.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    public ResponseProcessingException(string message) : base(message)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ResponseProcessingException"/> class with a specified error message and a reference to the inner exception that is the cause of this exception.
    /// </summary>
    /// <param name="message">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception.</param>
    public ResponseProcessingException(string message, Exception? innerException) : base(message, innerException)
    {
    }
}
