using System.Net;
using System.Net.Mail;
using AIValidation.Api.Models.Auth;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Gửi email qua SMTP bằng <see cref="SmtpClient"/> của .NET (không cần thư viện ngoài).
/// Nếu chưa cấu hình <c>Email:Host</c> thì chỉ ghi log nội dung (tiện chạy dev không
/// cần SMTP) và KHÔNG ném lỗi, để luồng quên mật khẩu vẫn trả về bình thường.
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Host))
        {
            _logger.LogWarning(
                "Email:Host chưa cấu hình -> bỏ qua gửi email tới {To} (tiêu đề: {Subject}). " +
                "Cấu hình SMTP để bật gửi thật.", toEmail, subject);
            return;
        }

        var fromAddress = string.IsNullOrWhiteSpace(_options.From) ? _options.User : _options.From;

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, _options.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            Credentials = new NetworkCredential(_options.User, _options.Password),
        };

        await client.SendMailAsync(message, ct);
        _logger.LogInformation("Đã gửi email '{Subject}' tới {To}", subject, toEmail);
    }
}
