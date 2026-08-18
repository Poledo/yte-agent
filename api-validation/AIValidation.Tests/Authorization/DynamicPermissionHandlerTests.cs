using System.Security.Claims;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Chốt kiểm quyền lúc chạy: mỗi nhánh từ chối phải trả ĐÚNG một lý do riêng.
///
/// Vì sao chốt tới từng lý do chứ không chỉ chốt "bị chặn": lý do là thứ hiện lên
/// màn hình cho người quản trị và là thứ ghi vào nhật ký từ chối. Gộp hết thành
/// "Denied" thì lúc deploy xong nhìn log không phân biệt nổi "quên cấp quyền" với
/// "quên quét quyền" - hai việc phải xử lý khác hẳn nhau.
/// </summary>
public class DynamicPermissionHandlerTests
{
    private static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task ChuaDangNhapThiTraLyDoUnauthenticated()
    {
        var cache = new FakePermissionCache();
        var (context, http) = Scenario(cache, RbacTestHarness.Anonymous());

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Unauthenticated, allowed: false);
    }

    [Fact]
    public async Task KhongTraDuocMaThiTraPermissionNotFound()
    {
        var cache = new FakePermissionCache();
        // Có tài khoản hợp lệ nhưng bản đồ route rỗng: endpoint chưa được quét.
        cache.Snapshots[UserId] = Snapshot();
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId));

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.PermissionNotFound, allowed: false);
    }

    [Fact]
    public async Task MaCoTrongBanDoNhungChuaCoTrongBangQuyenThiVanLaNotFound()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot();
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.PermissionNotFound, allowed: false, code: "Catalog.Import");
    }

    [Fact]
    public async Task QuyenBiTatThiTraPermissionDisabled()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Catalog.Import");
        cache.States["Catalog.Import"] = false;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.PermissionDisabled, allowed: false, code: "Catalog.Import");
    }

    [Fact]
    public async Task ChuaCoVaiTroNaoThiTraNoRole()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = new UserPermissionSnapshot(
            IsActive: true, IsSuperAdmin: false, RoleCount: 0, Codes: new HashSet<string>());
        cache.States["Catalog.Import"] = true;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.NoRole, allowed: false, code: "Catalog.Import");
    }

    [Fact]
    public async Task CoVaiTroNhungThieuMaThiTraDenied()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Catalog.List");
        cache.States["Catalog.Import"] = true;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Denied, allowed: false, code: "Catalog.Import");
    }

    [Fact]
    public async Task DuQuyenThiDiTiepVaKhongGhiDauVet()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Catalog.Import");
        cache.States["Catalog.Import"] = true;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(http.Items.ContainsKey(PermissionCheckOutcome.ItemKey));
    }

    [Fact]
    public async Task TaiKhoanBiKhoaThiChanDuDaCoDuQuyen()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = new UserPermissionSnapshot(
            IsActive: false, IsSuperAdmin: false, RoleCount: 1,
            Codes: new HashSet<string> { "Catalog.Import" });
        cache.States["Catalog.Import"] = true;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Unauthenticated, allowed: false);
    }

    [Fact]
    public async Task TokenMangUserIdKhongTonTaiThiChan()
    {
        var cache = new FakePermissionCache();
        var (context, http) = Scenario(cache, RbacTestHarness.User(Guid.NewGuid()), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Unauthenticated, allowed: false);
    }

    [Fact]
    public async Task SuperAdminTheoClaimDiQuaMaKhongChamCache()
    {
        var cache = new FakePermissionCache();
        // Cố ý KHÔNG khai ảnh chụp quyền: nếu handler có hỏi cache thì sẽ chặn ngay,
        // nên test này chốt luôn "SuperAdmin không tốn một truy vấn nào".
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId, isSuperAdmin: true), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
        Assert.False(http.Items.ContainsKey(PermissionCheckOutcome.ItemKey));
    }

    [Fact]
    public async Task SuperAdminTheoCsdlDiQuaDuTokenCuKhongCoClaim()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = new UserPermissionSnapshot(
            IsActive: true, IsSuperAdmin: true, RoleCount: 0, Codes: new HashSet<string>());
        var (context, _) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task CheDoAuditThiThieuQuyenVanDiTiepNhungVanDeLaiDauVet()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Catalog.List");
        cache.States["Catalog.Import"] = true;
        var (context, http) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);

        await Handler(cache, RbacTestHarness.Options(mode: RbacMode.Audit)).HandleAsync(context);

        Assert.True(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Denied, allowed: true, code: "Catalog.Import");
    }

    [Fact]
    public async Task CheDoAuditKhongMoCuaChoNguoiChuaDangNhap()
    {
        var cache = new FakePermissionCache();
        var (context, http) = Scenario(cache, RbacTestHarness.Anonymous(), mapRoute: true);

        await Handler(cache, RbacTestHarness.Options(mode: RbacMode.Audit)).HandleAsync(context);

        Assert.False(context.HasSucceeded);
        AssertOutcome(http, PermissionAuditResult.Unauthenticated, allowed: false);
    }

    [Fact]
    public async Task TatRbacVanBatBuocDangNhap()
    {
        var cache = new FakePermissionCache();
        var options = RbacTestHarness.Options(enabled: false);

        var (anonymous, anonymousHttp) = Scenario(cache, RbacTestHarness.Anonymous(), mapRoute: true);
        await Handler(cache, options).HandleAsync(anonymous);
        Assert.False(anonymous.HasSucceeded);
        AssertOutcome(anonymousHttp, PermissionAuditResult.Unauthenticated, allowed: false);

        // Đã đăng nhập thì đi qua dù không có quyền nào - đó mới là ý nghĩa của "tắt RBAC".
        var (loggedIn, _) = Scenario(cache, RbacTestHarness.User(UserId), mapRoute: true);
        await Handler(cache, options).HandleAsync(loggedIn);
        Assert.True(loggedIn.HasSucceeded);
    }

    [Fact]
    public async Task EndpointDuocMienTuongMinhThiDiQuaKhiChuaDangNhap()
    {
        var cache = new FakePermissionCache();
        var endpoint = RbacTestHarness.Endpoint(
            "Extension", "Config", "api/extension-config",
            extraMetadata: new object[] { new IgnorePermissionAttribute("extension gọi trước khi đăng nhập") });
        var (context, _) = Scenario(
            cache, RbacTestHarness.Anonymous(), endpoint: endpoint, path: "/api/extension-config");

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task DuongDanNgoaiTienToDuocSoiThiDiQua()
    {
        var cache = new FakePermissionCache();
        var endpoint = RbacTestHarness.Endpoint("Health", "Live", "health/live");
        var (context, _) = Scenario(cache, RbacTestHarness.Anonymous(), endpoint: endpoint, path: "/health/live");

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task MaGhimSanDuocDungThayVaoChoBanDoRoute()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Report.Export");
        cache.States["Report.Export"] = true;
        // Bản đồ route trỏ endpoint này sang một mã khác; mã ghim sẵn phải thắng.
        cache.SetRouteMap(new Dictionary<string, string> { ["POST:api/catalog/import"] = "Catalog.Import" });

        var endpoint = RbacTestHarness.Endpoint("Catalog", "Import", "api/catalog/import", new[] { "POST" });
        var http = RbacTestHarness.Request("POST", "/api/catalog/import", endpoint, RbacTestHarness.User(UserId));
        var context = new AuthorizationHandlerContext(
            new[] { new PermissionCodeRequirement("Report.Export") }, http.User, http);

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task ActionKhongRangBuocVerbDuocTraQuaKyTuDaiDien()
    {
        var cache = new FakePermissionCache();
        cache.Snapshots[UserId] = Snapshot("Catalog.Any");
        cache.States["Catalog.Any"] = true;
        cache.SetRouteMap(new Dictionary<string, string> { ["*:api/catalog/any"] = "Catalog.Any" });

        var endpoint = RbacTestHarness.Endpoint("Catalog", "Any", "api/catalog/any", Array.Empty<string>());
        var http = RbacTestHarness.Request("DELETE", "/api/catalog/any", endpoint, RbacTestHarness.User(UserId));
        var context = new AuthorizationHandlerContext(
            new[] { new DynamicPermissionRequirement() }, http.User, http);

        await Handler(cache).HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task KhongCoHttpContextThiKhongDoanMoOKhongChoQua()
    {
        var cache = new FakePermissionCache();
        var context = new AuthorizationHandlerContext(
            new[] { new DynamicPermissionRequirement() },
            RbacTestHarness.User(UserId, isSuperAdmin: true),
            resource: null);

        await Handler(cache).HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }

    // ----- đồ nghề riêng của bộ test này -----

    private static DynamicPermissionHandler Handler(
        IPermissionCache cache, IOptions<RbacOptions>? options = null) =>
        new(cache, options ?? RbacTestHarness.Options(), NullLogger<DynamicPermissionHandler>.Instance);

    private static UserPermissionSnapshot Snapshot(params string[] codes) =>
        new(IsActive: true, IsSuperAdmin: false, RoleCount: 1,
            Codes: codes.ToHashSet(StringComparer.OrdinalIgnoreCase));

    /// <summary>Dựng sẵn một lần gọi POST api/catalog/import với requirement tự tra mã.</summary>
    private static (AuthorizationHandlerContext Context, HttpContext Http) Scenario(
        FakePermissionCache cache,
        ClaimsPrincipal user,
        bool mapRoute = false,
        Endpoint? endpoint = null,
        string path = "/api/catalog/import")
    {
        endpoint ??= RbacTestHarness.Endpoint("Catalog", "Import", "api/catalog/import", new[] { "POST" });
        if (mapRoute)
        {
            cache.SetRouteMap(new Dictionary<string, string> { ["POST:api/catalog/import"] = "Catalog.Import" });
        }

        var http = RbacTestHarness.Request("POST", path, endpoint, user);
        var context = new AuthorizationHandlerContext(
            new[] { new DynamicPermissionRequirement() }, user, http);
        return (context, http);
    }

    private static void AssertOutcome(
        HttpContext http, PermissionAuditResult expected, bool allowed, string code = "")
    {
        var outcome = Assert.IsType<PermissionCheckOutcome>(http.Items[PermissionCheckOutcome.ItemKey]);
        Assert.Equal(expected, outcome.Result);
        Assert.Equal(allowed, outcome.Allowed);
        Assert.Equal(code, outcome.Code);
        Assert.False(string.IsNullOrWhiteSpace(outcome.Reason));
    }
}
