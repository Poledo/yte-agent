using System.Security.Claims;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Providers.Catalog;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Đồ nghề dùng chung cho các test phân quyền động: dựng endpoint giả, cache giả,
/// HttpContext giả và một AppDbContext trong bộ nhớ.
///
/// Cố ý KHÔNG dùng thư viện giả lập: những thứ cần giả ở đây đều là giao diện nhỏ,
/// tự viết thì đọc test là thấy ngay nó trả ra cái gì, không phải lần theo chuỗi
/// Setup().Returns() để đoán.
/// </summary>
internal static class RbacTestHarness
{
    /// <summary>AppDbContext trong bộ nhớ, mỗi test một tên riêng để không dính nhau.</summary>
    public static AppDbContext NewDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            // Bảng quyền có index duy nhất trên Code mà InMemory không cưỡng chế được;
            // cảnh báo này chỉ làm ồn log test chứ không nói lên điều gì.
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new TestDbContext(options);
    }

    /// <summary>RbacOptions mặc định cho test: bật, chế độ cưỡng chế, chỉ soi tiền tố api/.</summary>
    public static IOptions<RbacOptions> Options(
        bool enabled = true,
        RbacMode mode = RbacMode.Enforce,
        string? autoGrantRoleCode = null) =>
        Microsoft.Extensions.Options.Options.Create(new RbacOptions
        {
            Enabled = enabled,
            Mode = mode,
            AutoGrantToRoleCode = autoGrantRoleCode ?? string.Empty,
            IncludeRoutePrefixes = new[] { "api/" },
        });

    /// <summary>Bộ quét chạy trên danh sách endpoint tự dựng thay vì endpoint thật.</summary>
    public static PermissionScanner Scanner(
        IEnumerable<Endpoint> endpoints,
        IServiceScopeFactory scopeFactory,
        IOptions<RbacOptions>? options = null) =>
        new(new StubEndpointDataSource(endpoints),
            scopeFactory,
            options ?? Options(),
            NullLogger<PermissionScanner>.Instance);

    /// <summary>
    /// Một endpoint action của controller như ASP.NET Core dựng lúc chạy: route pattern,
    /// verb, ControllerActionDescriptor và các attribute đi kèm.
    /// </summary>
    public static RouteEndpoint Endpoint(
        string controller,
        string action,
        string route,
        string[]? methods = null,
        object[]? extraMetadata = null)
    {
        var metadata = new List<object>
        {
            new ControllerActionDescriptor { ControllerName = controller, ActionName = action },
            new HttpMethodMetadata(methods ?? new[] { "GET" }),
        };
        if (extraMetadata != null)
        {
            metadata.AddRange(extraMetadata);
        }

        return new RouteEndpoint(
            _ => Task.CompletedTask,
            RoutePatternFactory.Parse(route),
            order: 0,
            new EndpointMetadataCollection(metadata),
            displayName: $"{controller}.{action}");
    }

    /// <summary>HttpContext tối thiểu: verb, đường dẫn, endpoint và danh tính người gọi.</summary>
    public static DefaultHttpContext Request(
        string method,
        string path,
        Endpoint? endpoint = null,
        ClaimsPrincipal? user = null)
    {
        var http = new DefaultHttpContext();
        http.Request.Method = method;
        http.Request.Path = path.StartsWith('/') ? path : "/" + path;
        http.User = user ?? new ClaimsPrincipal(new ClaimsIdentity());
        if (endpoint != null)
        {
            http.SetEndpoint(endpoint);
        }
        return http;
    }

    /// <summary>Người dùng đã đăng nhập (có scheme nên IsAuthenticated = true).</summary>
    public static ClaimsPrincipal User(Guid id, bool isSuperAdmin = false, long? facilityId = null)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, id.ToString()) };
        if (isSuperAdmin) claims.Add(new Claim(RbacClaimTypes.IsSuperAdmin, "true"));
        if (facilityId.HasValue)
        {
            claims.Add(new Claim(RbacClaimTypes.FacilityId,
                facilityId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }
        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
    }

    /// <summary>Người dùng chưa đăng nhập: identity không có authenticationType.</summary>
    public static ClaimsPrincipal Anonymous() => new(new ClaimsIdentity());
}

/// <summary>
/// AppDbContext chạy trên nhà cung cấp InMemory.
///
/// Mô hình thật có vài cột chỉ Postgres hiểu (jsonb, tsvector, vector nhúng). Chúng
/// KHÔNG liên quan gì tới phân quyền, nhưng bộ kiểm mô hình của InMemory bắt lỗi mọi
/// thuộc tính không ánh xạ được nên phải bỏ chúng ra thì mô hình mới dựng nổi.
///
/// Cố ý bỏ THEO TỪNG CỘT thay vì bỏ cả bảng: nếu sau này phần phân quyền có tra tới
/// mấy bảng đó thì test vẫn chạy được, chỉ là không có cột đặc thù Postgres.
/// </summary>
internal sealed class TestDbContext : AppDbContext
{
    public TestDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Passkey của ASP.NET Identity 10 lưu bằng cột JSON - InMemory không có kiểu
        // JSON nên nó rớt thành một bảng không khóa chính và cả mô hình vỡ. Phần phân
        // quyền không đụng tới passkey, bỏ hẳn.
        modelBuilder.Ignore<Microsoft.AspNetCore.Identity.IdentityUserPasskey<Guid>>();

        // Bỏ bảng cha chưa dọn được kiểu con nằm trong cột JSON của nó (IdentityPasskeyData):
        // nó ở lại mô hình như một bảng mồ côi không khóa chính và bộ kiểm mô hình chặn ngay.
        // Quét theo "không có khóa chính" thay vì gọi đích danh tên kiểu để bản Identity sau
        // đổi tên cũng không làm test vỡ.
        foreach (var orphan in modelBuilder.Model.GetEntityTypes()
                     .Where(e => e.FindPrimaryKey() == null).ToList())
        {
            modelBuilder.Model.RemoveEntityType(orphan);
        }

        foreach (var entity in modelBuilder.Model.GetEntityTypes().ToList())
        {
            foreach (var property in entity.GetDeclaredProperties().ToList())
            {
                if (IsPostgresOnly(property.ClrType))
                {
                    modelBuilder.Entity(entity.ClrType).Ignore(property.Name);
                }
            }
        }
    }

    /// <summary>Kiểu chỉ Postgres ánh xạ được: từ điển/danh sách (jsonb), tsvector, mảng số thực (vector).</summary>
    private static bool IsPostgresOnly(Type type)
    {
        if (type == typeof(NpgsqlTypes.NpgsqlTsVector)) return true;
        if (type == typeof(string) || type == typeof(byte[])) return false;
        if (type.IsArray) return true;
        return type.IsGenericType
            && (type.GetGenericTypeDefinition() == typeof(Dictionary<,>)
                || type.GetGenericTypeDefinition() == typeof(List<>));
    }
}

/// <summary>EndpointDataSource trả về đúng danh sách endpoint được đưa vào.</summary>
internal sealed class StubEndpointDataSource : EndpointDataSource
{
    public StubEndpointDataSource(IEnumerable<Endpoint> endpoints) => Endpoints = endpoints.ToList();

    public override IReadOnlyList<Endpoint> Endpoints { get; }

    /// <summary>Danh sách endpoint trong test không đổi, nên báo "không bao giờ đổi".</summary>
    public override IChangeToken GetChangeToken() => new CancellationChangeToken(CancellationToken.None);
}

/// <summary>
/// Cache quyền giả: giữ đúng ba thứ mà bộ kiểm quyền hỏi tới, sửa trực tiếp trong
/// test để dựng từng nhánh từ chối.
/// </summary>
internal sealed class FakePermissionCache : IPermissionCache
{
    private Dictionary<string, string> _routeMap = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Mã quyền → còn hiệu lực. Thiếu mã nghĩa là quyền chưa tồn tại.</summary>
    public Dictionary<string, bool> States { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Ảnh chụp quyền theo tài khoản; thiếu khóa nghĩa là tài khoản không tồn tại.</summary>
    public Dictionary<Guid, UserPermissionSnapshot> Snapshots { get; } = new();

    /// <summary>Đếm số lần bị xóa cache — dùng để chốt "sửa vai trò thì phải xóa cache".</summary>
    public int InvalidateCount { get; private set; }

    public IReadOnlyDictionary<string, string> RouteMap => _routeMap;

    public void SetRouteMap(IReadOnlyDictionary<string, string> routeMap) =>
        _routeMap = new Dictionary<string, string>(routeMap, StringComparer.OrdinalIgnoreCase);

    public Task<IReadOnlyDictionary<string, bool>> GetPermissionStatesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<string, bool>>(States);

    public Task<UserPermissionSnapshot?> GetUserSnapshotAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult(Snapshots.GetValueOrDefault(userId));

    public void InvalidateAll() => InvalidateCount++;
}

/// <summary>Cây đơn vị giả: khai bằng cặp (con → cha), tự suy ra nhánh trên/dưới.</summary>
internal sealed class FakeFacilityTree : IFacilityTreeProvider
{
    private readonly Dictionary<long, long?> _parents = new();
    private readonly Dictionary<long, FacilityRef> _refs = new();

    /// <summary>Khai một cơ sở: id, mã, tên và cơ sở cha (null = gốc).</summary>
    public FakeFacilityTree Add(long id, string code, string name, long? parentId = null)
    {
        _parents[id] = parentId;
        _refs[id] = new FacilityRef(id, code, name);
        return this;
    }

    public Task<IReadOnlyList<string>> GetCatalogChainAsync(string facilityCode, CancellationToken cancellationToken = default) =>
        GetAncestorChainAsync(facilityCode, cancellationToken);

    public async Task<IReadOnlyList<string>> GetAncestorChainAsync(string facilityCode, CancellationToken cancellationToken = default)
    {
        var start = _refs.Values.FirstOrDefault(r => string.Equals(r.Code, facilityCode, StringComparison.OrdinalIgnoreCase));
        if (start == null)
        {
            return new[] { facilityCode };
        }

        var ids = await GetAncestorChainIdsAsync(start.Id, cancellationToken);
        return ids.Select(id => _refs[id].Code).ToList();
    }

    public Task<IReadOnlyList<long>> GetAncestorChainIdsAsync(long facilityId, CancellationToken cancellationToken = default)
    {
        var chain = new List<long>();
        long? current = facilityId;
        while (current.HasValue && _parents.ContainsKey(current.Value) && !chain.Contains(current.Value))
        {
            chain.Add(current.Value);
            current = _parents[current.Value];
        }
        return Task.FromResult<IReadOnlyList<long>>(chain);
    }

    public Task<IReadOnlySet<long>> GetDescendantIdsAsync(long facilityId, CancellationToken cancellationToken = default)
    {
        var result = new HashSet<long>();
        void Walk(long id)
        {
            if (!result.Add(id)) return;
            foreach (var (child, parent) in _parents)
            {
                if (parent == id) Walk(child);
            }
        }
        Walk(facilityId);
        return Task.FromResult<IReadOnlySet<long>>(result);
    }

    public async Task<IReadOnlySet<string>> GetDescendantCodesAsync(long facilityId, CancellationToken cancellationToken = default)
    {
        var ids = await GetDescendantIdsAsync(facilityId, cancellationToken);
        return ids.Where(_refs.ContainsKey).Select(id => _refs[id].Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public Task<FacilityRef?> FindByIdAsync(long facilityId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_refs.GetValueOrDefault(facilityId));

    public Task<FacilityRef?> FindByCodeAsync(string facilityCode, CancellationToken cancellationToken = default) =>
        Task.FromResult(_refs.Values.FirstOrDefault(r => string.Equals(r.Code, facilityCode, StringComparison.OrdinalIgnoreCase)));

    public Task<IReadOnlyDictionary<long, FacilityRef>> MapByIdsAsync(
        IEnumerable<long> facilityIds, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<long, FacilityRef>>(
            facilityIds.Distinct().Where(_refs.ContainsKey).ToDictionary(id => id, id => _refs[id]));

    public Task<IReadOnlyDictionary<string, FacilityRef>> MapByCodesAsync(
        IEnumerable<string> facilityCodes, CancellationToken cancellationToken = default)
    {
        var wanted = facilityCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return Task.FromResult<IReadOnlyDictionary<string, FacilityRef>>(
            _refs.Values.Where(r => wanted.Contains(r.Code))
                .ToDictionary(r => r.Code, r => r, StringComparer.OrdinalIgnoreCase));
    }

    public void Invalidate() { }
}

/// <summary>
/// IHttpContextAccessor giữ thẳng một HttpContext.
///
/// KHÔNG dùng <c>HttpContextAccessor</c> thật trong test: nó lưu vào một AsyncLocal
/// tĩnh, nên gán bên trong một hàm async thì giá trị chỉ chảy XUỐNG chứ không quay
/// ngược lên người gọi - test dựng đồ nghề bằng hàm async sẽ thấy HttpContext là null,
/// và các test chạy song song còn giẫm lên nhau.
/// </summary>
internal sealed class StubHttpContextAccessor : IHttpContextAccessor
{
    public StubHttpContextAccessor(ClaimsPrincipal user) =>
        HttpContext = new DefaultHttpContext { User = user };

    public HttpContext? HttpContext { get; set; }
}

/// <summary>IServiceScopeFactory trả về đúng một AppDbContext có sẵn.</summary>
internal sealed class SingleDbScopeFactory : IServiceScopeFactory, IServiceScope, IServiceProvider
{
    private readonly AppDbContext _db;

    public SingleDbScopeFactory(AppDbContext db) => _db = db;

    public IServiceScope CreateScope() => this;
    public IServiceProvider ServiceProvider => this;
    public object? GetService(Type serviceType) => serviceType == typeof(AppDbContext) ? _db : null;
    public void Dispose() { }
}
