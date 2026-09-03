using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Licensing;

/// <summary>
/// Mã hóa / giải mã bản lưu của khóa bản quyền.
///
/// DB vẫn giữ KeyHash (SHA-256) làm chuẩn đối chiếu khi client gửi khóa lên; bản
/// mã hóa AES-256-GCM (KeyCipher) chỉ phục vụ một việc: quản trị xem lại khóa khi
/// cơ sở báo mất, thay vì rotate rồi nhập lại khóa mới cho cả tuyến máy trạm.
///
/// Khóa AES nằm ở secret của môi trường chạy, không nằm trong DB — lộ cơ sở dữ
/// liệu cũng không lộ khóa của khách hàng.
/// </summary>
public interface ILicenseKeyCipher
{
    /// <summary>
    /// Mã hóa khóa gốc để lưu vào KeyCipher. Trả về null nếu chưa cấu hình
    /// <see cref="LicensingOptions.EncryptionKey"/> — không chặn nghiệp vụ cấp khóa.
    /// </summary>
    string? Encrypt(string key);

    /// <summary>
    /// Giải mã bản lưu trong KeyCipher. Ném <see cref="InvalidOperationException"/>
    /// khi chưa cấu hình khóa giải mã hoặc bản mã hỏng / giải sai khóa.
    /// </summary>
    string Decrypt(string cipher);
}

/// <inheritdoc />
public sealed class LicenseKeyCipher : ILicenseKeyCipher
{
    private const int NonceBytes = 12;
    private const int TagBytes = 16;

    private readonly byte[]? _aesKey;

    public LicenseKeyCipher(IOptions<LicensingOptions> options)
    {
        var raw = options.Value.EncryptionKey;
        if (string.IsNullOrWhiteSpace(raw))
        {
            _aesKey = null;
            return;
        }

        try
        {
            var key = Convert.FromBase64String(raw.Trim());
            if (key.Length != 32)
            {
                throw new FormatException($"Khóa AES phải đúng 32 byte sau khi base64-decode, nhận được {key.Length} byte.");
            }
            _aesKey = key;
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                "Licensing:EncryptionKey không phải base64 hợp lệ của 32 byte — chạy openssl rand -base64 32 để tạo.", ex);
        }
    }

    /// <summary>Khóa mã hóa đã cấu hình hay chưa — để controller ghi log cảnh báo khi cấp khóa mà không lưu được bản mã.</summary>
    public bool IsConfigured => _aesKey is not null;

    public string? Encrypt(string key)
    {
        if (_aesKey is null) return null;
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        var nonce = RandomNumberGenerator.GetBytes(NonceBytes);
        var plaintext = System.Text.Encoding.UTF8.GetBytes(key);
        var cipher = new byte[plaintext.Length];
        var tag = new byte[TagBytes];

        using var aes = new AesGcm(_aesKey, TagBytes);
        aes.Encrypt(nonce, plaintext, cipher, tag);

        // Gộp nonce + ciphertext + tag thành một khối base64 cho khỏi lưu ba cột.
        var packed = new byte[NonceBytes + cipher.Length + TagBytes];
        Buffer.BlockCopy(nonce, 0, packed, 0, NonceBytes);
        Buffer.BlockCopy(cipher, 0, packed, NonceBytes, cipher.Length);
        Buffer.BlockCopy(tag, 0, packed, NonceBytes + cipher.Length, TagBytes);

        return Convert.ToBase64String(packed);
    }

    public string Decrypt(string cipher)
    {
        if (_aesKey is null)
        {
            throw new InvalidOperationException(
                "Chưa cấu hình Licensing:EncryptionKey nên không giải mã được bản lưu của khóa. "
                + "Khai báo biến môi trường Licensing__EncryptionKey rồi khởi động lại.");
        }
        ArgumentException.ThrowIfNullOrWhiteSpace(cipher);

        byte[] packed;
        try
        {
            packed = Convert.FromBase64String(cipher.Trim());
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("Bản mã hóa của khóa không đúng định dạng base64.", ex);
        }

        if (packed.Length < NonceBytes + TagBytes)
        {
            throw new InvalidOperationException("Bản mã hóa của khóa quá ngắn — dữ liệu hỏng.");
        }

        var nonce = packed[..NonceBytes];
        var encrypted = packed[NonceBytes..^TagBytes];
        var tag = packed[^TagBytes..];
        var plaintext = new byte[encrypted.Length];

        try
        {
            using var aes = new AesGcm(_aesKey, TagBytes);
            aes.Decrypt(nonce, encrypted, tag, plaintext);
            return System.Text.Encoding.UTF8.GetString(plaintext);
        }
        catch (CryptographicException ex)
        {
            throw new InvalidOperationException(
                "Giải mã khóa bản quyền thất bại — bản mã hỏng hoặc khóa mã hóa đã đổi. "
                + "Phải cấp lại khóa cho hợp đồng này.", ex);
        }
    }
}
