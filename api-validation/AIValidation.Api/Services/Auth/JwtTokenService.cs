using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AIValidation.Api.Authorization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AIValidation.Api.Services.Auth;

/// <summary>
/// Sinh access token JWT ký bằng HMAC-SHA256. Nhúng claim danh tính, role và
/// mỗi quyền một claim "permission" (đã gộp từ các role của user).
/// </summary>
public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _signingCredentials;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        var (key, _) = JwtKeyResolver.Resolve(_options);
        _signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);
    }

    /// <inheritdoc/>
    public (string Token, DateTime ExpiresAt) CreateAccessToken(
        AppUser user,
        IEnumerable<string> roles,
        IEnumerable<string> permissions)
    {
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("name", user.FullName),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
        };

        foreach (var role in roles.Distinct())
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var permission in permissions.Distinct())
        {
            claims.Add(new Claim(PermissionAuthorizationHandler.PermissionClaimType, permission));
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: _signingCredentials);

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return (encoded, expiresAt);
    }
}
