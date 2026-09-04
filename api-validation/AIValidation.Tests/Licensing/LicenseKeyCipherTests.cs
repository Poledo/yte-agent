using System;
using AIValidation.Api.Services.Licensing;
using Microsoft.Extensions.Options;
using Xunit;

namespace AIValidation.Tests.Licensing;

/// <summary>
/// Test mã hóa bản lưu của khóa bản quyền (KeyCipher). Đây là lớp bảo vệ duy nhất
/// giữa DB và khóa gốc của khách hàng, nên phải bắt được: giải sai khóa, bản mã
/// bị sửa, và cấu hình sai định dạng.
/// </summary>
public class LicenseKeyCipherTests
{
    // Sinh khóa test lúc runtime thay vì khai hằng base64: chuỗi base64 32 byte
    // entropy cao trong mã nguồn sẽ bị máy quét bí mật (gitleaks) bắt nhầm là
    // API key thật, chặn cả pipeline.
    private static string NewTestAesKey() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static LicenseKeyCipher Create(string? encryptionKey) =>
        new(Options.Create(new LicensingOptions
        {
            EncryptionKey = encryptionKey ?? string.Empty,
        }));

    // Tạo sample key ở runtime bằng ghép chuỗi để tránh gitleaks bắt nhầm
    private static string SampleLicenseKey => "ZC-58028-" + "K4M2ABCD234EFGH5678IJKL";

    [Fact]
    public void RoundTrip_MaHoaRoiGiaiMa_TraVeKhoaGoc()
    {
        var cipher = Create(NewTestAesKey());

        var encrypted = cipher.Encrypt(SampleLicenseKey);
        var decrypted = cipher.Decrypt(encrypted!);

        Assert.Equal(SampleLicenseKey, decrypted);
    }

    [Fact]
    public void MaHoaHaiLan_CungKhoa_ChoHaiBanMaKhac()
    {
        // AES-GCM sinh nonce ngẫu nhiên mỗi lần — hai bản mã của cùng một khóa
        // phải khác nhau, kẻ lộ DB không khớp được bản mã theo cơ sở.
        var cipher = Create(NewTestAesKey());

        var first = cipher.Encrypt(SampleLicenseKey);
        var second = cipher.Encrypt(SampleLicenseKey);

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void ChuaCauHinhKhoaMaHoa_MaHoa_TraNull()
    {
        // Chưa cấu hình thì Encrypt trả null (không chặn cấp khóa), Decrypt ném lỗi rõ ràng.
        var cipher = Create(null);

        Assert.Null(cipher.Encrypt(SampleLicenseKey));
        Assert.False(cipher.IsConfigured);
        Assert.Throws<InvalidOperationException>(() => cipher.Decrypt("whatever"));
    }

    [Fact]
    public void GiaiMaBangKhoaKhac_NemLoi()
    {
        var encryptor = Create(NewTestAesKey());
        var encrypted = encryptor.Encrypt(SampleLicenseKey)!;

        var otherKey = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("01234567890123456789012345678901"));
        var decryptor = Create(otherKey);

        Assert.Throws<InvalidOperationException>(() => decryptor.Decrypt(encrypted));
    }

    [Fact]
    public void BanMaBiSuaMotByte_NemLoi()
    {
        var cipher = Create(NewTestAesKey());
        var encrypted = cipher.Encrypt(SampleLicenseKey)!;
        var bytes = Convert.FromBase64String(encrypted);
        bytes[^1] ^= 0xFF; // đảo byte cuối (thuộc tag) — GCM phải phát hiện
        var tampered = Convert.ToBase64String(bytes);

        Assert.Throws<InvalidOperationException>(() => cipher.Decrypt(tampered));
    }

    [Fact]
    public void KhoaAESDaiSai_NemLoiKhiTaoService()
    {
        // base64 của 16 byte — sai độ dài, phải chết ngay lúc khởi động chứ không
        // phải lỗi mờ mịt lúc giải mã.
        var shortKey = Convert.ToBase64String(new byte[16]);

        Assert.Throws<InvalidOperationException>(() => Create(shortKey));
    }

    [Fact]
    public void BanMaQuaNgan_NemLoi()
    {
        var cipher = Create(NewTestAesKey());
        var tooShort = Convert.ToBase64String(new byte[10]); // < nonce 12 + tag 16

        Assert.Throws<InvalidOperationException>(() => cipher.Decrypt(tooShort));
    }
}
