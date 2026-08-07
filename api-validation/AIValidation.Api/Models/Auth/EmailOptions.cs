namespace AIValidation.Api.Models.Auth;

/// <summary>
/// Cấu hình gửi email qua SMTP (dùng cho luồng đặt lại mật khẩu).
/// Giá trị nhạy cảm (Password) lấy từ secret/biến môi trường, KHÔNG commit.
/// </summary>
public sealed class EmailOptions
{
    /// <summary>Máy chủ SMTP, ví dụ "smtp.gmail.com". Để trống = không gửi thật (chỉ ghi log).</summary>
    public string Host { get; set; } = string.Empty;

    /// <summary>Cổng SMTP. Gmail STARTTLS dùng 587.</summary>
    public int Port { get; set; } = 587;

    /// <summary>Bật SSL/STARTTLS. Gmail yêu cầu true.</summary>
    public bool EnableSsl { get; set; } = true;

    /// <summary>Tài khoản đăng nhập SMTP. Với Gmail là địa chỉ email đầy đủ.</summary>
    public string User { get; set; } = string.Empty;

    /// <summary>Mật khẩu SMTP / App Password của Gmail. LẤY TỪ SECRET.</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>Địa chỉ người gửi hiển thị. Bỏ trống = dùng <see cref="User"/>.</summary>
    public string From { get; set; } = string.Empty;

    /// <summary>Tên hiển thị người gửi.</summary>
    public string FromName { get; set; } = "Chiến binh y tế số";

    /// <summary>URL gốc web-admin để dựng link đặt lại, ví dụ "https://cbyts.vnpt.vn".</summary>
    public string WebAppBaseUrl { get; set; } = "https://cbyts.vnpt.vn";
}
