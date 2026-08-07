using System.Security.Cryptography;
using System.Text;
using AIValidation.Api.Configuration;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Cấp/xoay vòng/thu hồi refresh token. Token thô là 32 byte ngẫu nhiên mã hóa
/// base64url; DB chỉ lưu SHA256 hash để nếu lộ DB cũng không dùng lại được.
/// </summary>
public sealed class RefreshTokenService : IRefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly JwtOptions _options;

    public RefreshTokenService(AppDbContext db, IOptions<JwtOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    /// <inheritdoc/>
    public async Task<(string RawToken, RefreshToken Entity)> IssueAsync(
        Guid userId, string? ip, CancellationToken ct = default)
    {
        var raw = GenerateRawToken();
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = Hash(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ip,
        };

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);
        return (raw, entity);
    }

    /// <inheritdoc/>
    public async Task<(string RawToken, RefreshToken Entity)?> RotateAsync(
        string rawToken, string? ip, CancellationToken ct = default)
    {
        var hash = Hash(rawToken);
        var existing = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        // Token không tồn tại, đã thu hồi hoặc đã hết hạn -> từ chối
        if (existing == null || existing.RevokedAt != null || DateTime.UtcNow >= existing.ExpiresAt)
        {
            return null;
        }

        var raw = GenerateRawToken();
        var replacement = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = existing.UserId,
            TokenHash = Hash(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ip,
        };

        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenHash = replacement.TokenHash;

        _db.RefreshTokens.Add(replacement);
        await _db.SaveChangesAsync(ct);
        return (raw, replacement);
    }

    /// <inheritdoc/>
    public async Task<Guid?> RevokeAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = Hash(rawToken);
        var existing = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (existing == null || existing.RevokedAt != null)
        {
            return null;
        }

        existing.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return existing.UserId;
    }

    /// <inheritdoc/>
    public string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToBase64String(bytes);
    }

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        // base64url: an toàn khi truyền qua URL/header, không có ký tự +/=
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
