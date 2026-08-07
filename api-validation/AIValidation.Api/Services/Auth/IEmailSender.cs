namespace AIValidation.Api.Services.Auth;

/// <summary>Gửi email dạng HTML. Cài đặt SMTP ở <see cref="SmtpEmailSender"/>.</summary>
public interface IEmailSender
{
    /// <summary>Gửi một email HTML tới <paramref name="toEmail"/>.</summary>
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}
