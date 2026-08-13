using System.Security.Cryptography;
using System.Text;

namespace AIValidation.Api.Services.Licensing;

/// <summary>Khóa bản quyền vừa sinh — phần bí mật CHỈ trả về đúng lần này.</summary>
/// <param name="Key">Khóa đầy đủ giao cho cơ sở KCB, vd "ZC-58028-K4M2AB...".</param>
/// <param name="Hash">Băm SHA-256 (hex thường) để lưu xuống DB.</param>
/// <param name="Prefix">Phần đầu khóa để hiển thị trên màn hình quản trị.</param>
public sealed record GeneratedLicenseKey(string Key, string Hash, string Prefix);

/// <summary>
/// Sinh và băm khóa bản quyền.
///
/// Lưu băm chứ không lưu khóa gốc, cùng lý do như mật khẩu: người có quyền đọc DB
/// (kể cả bản sao lưu bị lộ) cũng không dùng được dịch vụ dưới danh nghĩa khách hàng.
/// Đổi lại, mất khóa thì không khôi phục được — chỉ cấp khóa mới.
/// </summary>
public interface ILicenseKeyGenerator
{
    /// <summary>Sinh khóa mới cho một mã cơ sở KCB.</summary>
    GeneratedLicenseKey Generate(string facilityCode);

    /// <summary>Băm một khóa do client gửi lên, để đối chiếu với cột KeyHash.</summary>
    string Hash(string key);
}

/// <inheritdoc />
public sealed class LicenseKeyGenerator : ILicenseKeyGenerator
{
    /// <summary>Tiền tố nhận diện khóa của sản phẩm (ZeroCheck).</summary>
    private const string Prefix = "ZC";

    /// <summary>
    /// 16 byte ngẫu nhiên → 32 ký tự. 128 bit là quá đủ để không dò được, mà khóa
    /// vẫn đủ ngắn để nhân viên bệnh viện chép tay từ email vào ô nhập của extension.
    /// </summary>
    private const int SecretBytes = 16;

    /// <summary>
    /// Bảng Base32 BỎ các ký tự dễ đọc nhầm (I, L, O, U, 0, 1) — khóa hay được
    /// nhân viên bệnh viện chép tay từ email vào ô nhập của extension.
    /// </summary>
    private const string Alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

    public GeneratedLicenseKey Generate(string facilityCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(facilityCode);

        var secret = Encode(RandomNumberGenerator.GetBytes(SecretBytes));
        var key = $"{Prefix}-{facilityCode.Trim().ToUpperInvariant()}-{secret}";

        // Phần hiện trên màn hình: đủ để phân biệt các giấy phép của cùng một đơn vị,
        // không đủ để đoán ra khóa thật.
        var display = $"{Prefix}-{facilityCode.Trim().ToUpperInvariant()}-{secret[..6]}...";

        return new GeneratedLicenseKey(key, Hash(key), display);
    }

    public string Hash(string key)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(key.Trim()));
        return Convert.ToHexStringLower(bytes);
    }

    /// <summary>Mã hóa byte thành chuỗi theo bảng chữ đã lọc ký tự dễ nhầm.</summary>
    private static string Encode(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
        {
            // Mỗi byte thành 2 ký tự. Cặp (b / 30, b % 30) xác định duy nhất b nên
            // không mất entropy; đơn giản hơn Base32 chuẩn và không cần ký tự đệm.
            sb.Append(Alphabet[b / Alphabet.Length]);
            sb.Append(Alphabet[b % Alphabet.Length]);
        }
        return sb.ToString();
    }
}
