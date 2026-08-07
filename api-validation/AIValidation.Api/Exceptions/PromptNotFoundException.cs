namespace AIValidation.Api.Exceptions;

/// <summary>
/// Exception thrown when a requested prompt file is not found.
/// 
/// This exception should be thrown by PromptLoader when a prompt file
/// is missing from the prompts directory.
/// </summary>
public class PromptNotFoundException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PromptNotFoundException"/> class.
    /// </summary>
    /// <param name="promptName">The name of the prompt that was not found.</param>
    public PromptNotFoundException(string promptName)
        : base($"Prompt '{promptName}' not found in the prompts directory.")
    {
        PromptName = promptName;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="PromptNotFoundException"/> class
    /// with a custom message and inner exception.
    /// </summary>
    /// <param name="promptName">The name of the prompt that was not found.</param>
    /// <param name="message">A custom error message.</param>
    public PromptNotFoundException(string promptName, string message)
        : base(message)
    {
        PromptName = promptName;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="PromptNotFoundException"/> class
    /// with a custom message and inner exception.
    /// </summary>
    /// <param name="promptName">The name of the prompt that was not found.</param>
    /// <param name="message">A custom error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public PromptNotFoundException(string promptName, string message, Exception innerException)
        : base(message, innerException)
    {
        PromptName = promptName;
    }

    /// <summary>
    /// Gets the name of the prompt that was not found.
    /// </summary>
    public string PromptName { get; }
}
