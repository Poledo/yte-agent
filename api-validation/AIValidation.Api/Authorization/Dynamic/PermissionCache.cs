using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace AIValidation.Api.Authorization.Dynamic;

/// <summary>Ảnh chụp quyền của một tài khoản tại thời điểm cache.</summary>
/// <param name="IsActive">Tài khoản còn hiệu lực.</param>
/// <param name="IsSuperAdmin">Cờ quản trị toàn hệ thống.</param>
/// <param name="RoleCount">Số vai trò đang giữ — 0 nghĩa là chưa được phân vai trò nào.</param>
/// <param name="Codes">Tập mã quyền có được từ các vai trò.</param>
public sealed record UserPermissionSnapshot(
    bool IsActive,
    bool IsSuperAdmin,
    int RoleCount,
    IReadOnlySet<string> Codes);

public interface IPermissionCache
{
    /// <summary>Bản đồ "METHOD:route" → mã quyền, nạp một lần lúc khởi động.</summary>
    IReadOnlyDictionary<string, string> RouteMap { get; }

    /// <summary>Nạp bản đồ route sau khi bộ quét chạy xong.</summary>
    void SetRouteMap(IReadOnlyDictionary<string, string> routeMap);

    /// <summary>Bảng trạng thái quyền: mã → còn hiệu lực. Thiếu mã = quyền chưa tồn tại.</summary>
    Task<IReadOnlyDictionary<string, bool>> GetPermissionStatesAsync(CancellationToken cancellationToken = default);

    /// <summary>Ảnh chụp quyền của tài khoản; null nghĩa là tài khoản không tồn tại.</summary>
    Task<UserPermissionSnapshot?> GetUserSnapshotAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Xóa sạch cache quyền. Gọi ngay sau mọi thao tác sửa vai trò/quyền/gán quyền,
    /// nếu không người quản trị phải chờ hết TTL mới thấy thay đổi có hiệu lực.
    /// </summary>
    void InvalidateAll();
}

/// <summary>
/// Cache quyền dùng chung cho toàn ứng dụng. Là Singleton nên đọc CSDL phải qua
/// <see cref="IServiceScopeFactory"/> — DbContext là Scoped, giữ thẳng một instance
/// trong Singleton sẽ hỏng ngay khi có hai request đồng thời.
/// </summary>
public sealed class PermissionCache : IPermissionCache, IDisposable
{
    private const string PermissionStatesKey = "rbac:permission-states";
    private const string UserKeyPrefix = "rbac:user:";

    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RbacOptions _options;
    private readonly ILogger<PermissionCache> _logger;

    private readonly Lock _tokenLock = new();
    private CancellationTokenSource _resetSource = new();
    private IReadOnlyDictionary<string, string> _routeMap = new Dictionary<string, string>();

    public PermissionCache(
        IMemoryCache cache,
        IServiceScopeFactory scopeFactory,
        IOptions<RbacOptions> options,
        ILogger<PermissionCache> logger)
    {
        _cache = cache;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public IReadOnlyDictionary<string, string> RouteMap => _routeMap;

    public void SetRouteMap(IReadOnlyDictionary<string, string> routeMap) => _routeMap = routeMap;

    public async Task<IReadOnlyDictionary<string, bool>> GetPermissionStatesAsync(CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(PermissionStatesKey, out IReadOnlyDictionary<string, bool>? cached) && cached is not null)
        {
            return cached;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var rows = await db.Permissions
            .AsNoTracking()
            .Select(p => new { p.Code, p.IsActive })
            .ToListAsync(cancellationToken);

        var states = rows
            .GroupBy(r => r.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().IsActive, StringComparer.OrdinalIgnoreCase);

        _cache.Set(PermissionStatesKey, (IReadOnlyDictionary<string, bool>)states, BuildEntryOptions());
        return states;
    }

    public async Task<UserPermissionSnapshot?> GetUserSnapshotAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var key = UserKeyPrefix + userId.ToString("N");

        // Cache CẢ kết quả null: token rác mang userId không tồn tại vẫn bắn vào đây
        // mỗi request, không cache thì mỗi lần là một truy vấn CSDL.
        if (_cache.TryGetValue(key, out UserPermissionSnapshot? cached))
        {
            return cached;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsActive, u.IsSuperAdmin })
            .FirstOrDefaultAsync(cancellationToken);

        UserPermissionSnapshot? snapshot = null;
        if (user is not null)
        {
            var roleIds = await db.UserRoles
                .AsNoTracking()
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .ToListAsync(cancellationToken);

            var codes = roleIds.Count == 0
                ? new List<string>()
                : await db.RolePermissions
                    .AsNoTracking()
                    .Where(rp => roleIds.Contains(rp.RoleId))
                    .Select(rp => rp.Permission!.Code)
                    .Distinct()
                    .ToListAsync(cancellationToken);

            snapshot = new UserPermissionSnapshot(
                IsActive: user.IsActive,
                IsSuperAdmin: user.IsSuperAdmin,
                RoleCount: roleIds.Count,
                Codes: codes.ToHashSet(StringComparer.OrdinalIgnoreCase));
        }

        _cache.Set(key, snapshot, BuildEntryOptions());
        return snapshot;
    }

    public void InvalidateAll()
    {
        CancellationTokenSource old;
        lock (_tokenLock)
        {
            old = _resetSource;
            _resetSource = new CancellationTokenSource();
        }

        // Hủy token cũ khiến mọi entry gắn với nó bị loại khỏi IMemoryCache ngay lập tức,
        // không cần biết có bao nhiêu khóa và tên là gì.
        old.Cancel();
        old.Dispose();
        _logger.LogInformation("Đã xóa cache phân quyền");
    }

    private MemoryCacheEntryOptions BuildEntryOptions()
    {
        CancellationTokenSource source;
        lock (_tokenLock)
        {
            source = _resetSource;
        }

        return new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromSeconds(Math.Max(5, _options.CacheSeconds)))
            .AddExpirationToken(new CancellationChangeToken(source.Token));
    }

    public void Dispose()
    {
        lock (_tokenLock)
        {
            _resetSource.Dispose();
        }
    }
}
