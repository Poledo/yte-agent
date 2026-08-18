using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Bộ quét endpoint là NGUỒN SỰ THẬT của bảng quyền: thêm một action là lần khởi động
/// sau có quyền tương ứng, không ai phải sửa danh sách mã trong code.
///
/// Cái đắt giá cần bảo vệ ở đây không phải là "quét ra đúng số mã" mà là phép hợp nhất
/// với bảng đang có: gỡ một endpoint không được xóa dòng (mất sạch gán quyền), đổi tên
/// action không được sinh dòng mới (vai trò mất quyền im lặng), và quyền do người quản
/// trị tự tạo phải được để yên tuyệt đối.
/// </summary>
public class PermissionScannerTests
{
    /// <summary>Endpoint mẫu: GET api/catalog/items thuộc CatalogController.List.</summary>
    private static RouteEndpoint CatalogList() =>
        RbacTestHarness.Endpoint("Catalog", "List", "api/catalog/items");

    [Fact]
    public void SinhMaTheoControllerVaAction()
    {
        var scanner = Scanner(CatalogList());

        var permission = Assert.Single(scanner.Scan());

        Assert.Equal("Catalog.List", permission.Code);
        Assert.Equal("Catalog", permission.Category);
        Assert.Equal("api/catalog/items", permission.Route);
        Assert.Equal("GET", permission.HttpMethod);
        Assert.Equal("Xem danh sách Catalog", permission.DisplayName);
    }

    [Fact]
    public void CoPermissionAttributeThiLayMaGhimSan()
    {
        // [Permission] dùng khi nhiều endpoint chung một quyền — mã ghim phải THẮNG
        // quy ước {Controller}.{Action}, nếu không thì gom quyền lại là vô nghĩa.
        var scanner = Scanner(RbacTestHarness.Endpoint(
            "Catalog", "ImportExcel", "api/catalog/import",
            methods: new[] { "POST" },
            extraMetadata: new object[] { new PermissionAttribute("Catalog.Manage") }));

        var permission = Assert.Single(scanner.Scan());

        Assert.Equal("Catalog.Manage", permission.Code);
        // Category/Controller/Action vẫn là của endpoint thật: màn hình gán quyền gom
        // theo controller, còn bộ quét nhận diện dòng theo (controller, action).
        Assert.Equal("Catalog", permission.ControllerName);
        Assert.Equal("ImportExcel", permission.ActionName);
    }

    [Fact]
    public void BoQuaEndpointCongKhaiVaEndpointDuocMien()
    {
        var scanner = Scanner(
            CatalogList(),
            RbacTestHarness.Endpoint("Auth", "Login", "api/auth/login",
                extraMetadata: new object[] { new AllowAnonymousAttribute() }),
            RbacTestHarness.Endpoint("ExtensionConfig", "Get", "api/extension-config",
                extraMetadata: new object[] { new IgnorePermissionAttribute("Extension gọi bằng khóa bản quyền") }));

        var codes = scanner.Scan().Select(p => p.Code).ToList();

        Assert.Equal(new[] { "Catalog.List" }, codes);
    }

    [Fact]
    public void BoQuaEndpointNgoaiTienToDuocSoi()
    {
        // IncludeRoutePrefixes = ["api/"]. Trang health/scalar không phải nghiệp vụ,
        // sinh quyền cho chúng chỉ làm bảng quyền rác và dễ khóa nhầm trang kiểm tra sống.
        var scanner = Scanner(
            CatalogList(),
            RbacTestHarness.Endpoint("Health", "Live", "healthz"));

        Assert.Equal(new[] { "Catalog.List" }, scanner.Scan().Select(p => p.Code));
    }

    [Fact]
    public void ActionNhieuVerbSinhMoiVerbMotDong()
    {
        var scanner = Scanner(RbacTestHarness.Endpoint(
            "Facility", "Save", "api/facility", methods: new[] { "POST", "PUT" }));

        var methods = scanner.Scan().Select(p => p.HttpMethod).Order().ToList();

        Assert.Equal(new[] { "POST", "PUT" }, methods);
    }

    [Fact]
    public void BuildRouteMapTraCuuDuocTheoVerbVaRoute()
    {
        var scanner = Scanner(CatalogList());

        var map = scanner.BuildRouteMap();

        Assert.Equal("Catalog.List", map[PermissionScanner.RouteKey("GET", "api/catalog/items")]);
        // Route được chuẩn hóa cả hai phía (bỏ '/' đầu cuối, hạ chữ thường) — lệch
        // chuẩn hóa là mọi request tra không ra mã và nhận PermissionNotFound.
        Assert.Equal("api/catalog/items", PermissionScanner.NormalizeRoute("/API/Catalog/Items/"));
    }

    [Fact]
    public async Task DongBoLanDauThemMoiVaTuCapChoVaiTroQuanTri()
    {
        await using var db = RbacTestHarness.NewDb(nameof(DongBoLanDauThemMoiVaTuCapChoVaiTroQuanTri));
        var adminRole = new AppRole { Id = Guid.NewGuid(), Name = "Quản trị", Code = "ADMIN", IsSystem = true };
        db.Roles.Add(adminRole);
        await db.SaveChangesAsync();

        var scanner = Scanner(db, autoGrantRoleCode: "ADMIN", endpoints: CatalogList());
        var result = await scanner.SyncAsync();

        Assert.Equal(1, result.Scanned);
        Assert.Equal(1, result.Added);
        // Thêm API mới mà không tự cấp cho ADMIN thì chính người quản trị bị 403 ở
        // màn hình vừa viết ra — đây là rào chống tự khóa cửa.
        Assert.Equal(1, result.AutoGranted);

        var row = await db.Permissions.SingleAsync();
        Assert.Equal("Catalog.List", row.Code);
        Assert.True(row.IsActive);
        Assert.True(row.IsSystem);
        Assert.Single(db.RolePermissions.Where(rp => rp.RoleId == adminRole.Id));
    }

    [Fact]
    public async Task DoiRouteThiCapNhatTaiChoVaGiuNguyenGanQuyen()
    {
        await using var db = RbacTestHarness.NewDb(nameof(DoiRouteThiCapNhatTaiChoVaGiuNguyenGanQuyen));
        var role = new AppRole { Id = Guid.NewGuid(), Name = "Kế toán", Code = "KE_TOAN" };
        db.Roles.Add(role);
        await db.SaveChangesAsync();

        var scanner = Scanner(db, endpoints: CatalogList());
        await scanner.SyncAsync();

        var permissionId = (await db.Permissions.SingleAsync()).Id;
        db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permissionId });
        await db.SaveChangesAsync();

        // Đổi route (giữ nguyên controller/action) — dòng cũ phải được sửa tại chỗ.
        var moved = Scanner(db, endpoints: RbacTestHarness.Endpoint("Catalog", "List", "api/catalog/danh-muc"));
        var result = await moved.SyncAsync();

        Assert.Equal(0, result.Added);
        Assert.Equal(1, result.Updated);
        Assert.Equal(0, result.Deactivated);

        var row = await db.Permissions.SingleAsync();
        Assert.Equal(permissionId, row.Id);
        Assert.Equal("api/catalog/danh-muc", row.Route);
        // Sinh dòng mới thay vì sửa tại chỗ là vai trò mất quyền mà không ai báo.
        Assert.Single(db.RolePermissions.Where(rp => rp.PermissionId == permissionId));
    }

    [Fact]
    public async Task DoiTenActionThiGiuDongCuVaDoiMa()
    {
        await using var db = RbacTestHarness.NewDb(nameof(DoiTenActionThiGiuDongCuVaDoiMa));
        await Scanner(db, endpoints: CatalogList()).SyncAsync();
        var originalId = (await db.Permissions.SingleAsync()).Id;

        // Đổi tên action: mã đổi theo, nhưng khóa nhận diện của bộ quét là
        // (controller, action)... action cũng đổi nên nhánh này khớp theo mã cũ không
        // được — kỳ vọng: sinh dòng MỚI và tắt dòng cũ, không mất bản ghi nào.
        var renamed = Scanner(db, endpoints: RbacTestHarness.Endpoint("Catalog", "GetAll", "api/catalog/items"));
        await renamed.SyncAsync();

        var rows = await db.Permissions.OrderBy(p => p.Code).ToListAsync();
        Assert.Equal(2, rows.Count);
        var old = rows.Single(r => r.Id == originalId);
        Assert.False(old.IsActive);
        Assert.Contains(rows, r => r.Code == "Catalog.GetAll" && r.IsActive);
    }

    [Fact]
    public async Task GoEndpointThiChiTatChuKhongXoa()
    {
        await using var db = RbacTestHarness.NewDb(nameof(GoEndpointThiChiTatChuKhongXoa));
        await Scanner(db, endpoints: CatalogList()).SyncAsync();

        // Endpoint biến mất khỏi code (gỡ action, hoặc quét lúc chưa nạp xong route).
        var result = await Scanner(db, endpoints: Array.Empty<RouteEndpoint>()).SyncAsync();

        Assert.Equal(1, result.Deactivated);
        var row = await db.Permissions.SingleAsync();
        // Xóa dòng sẽ kéo theo mọi role_permissions; gắn lại endpoint là mất sạch
        // cấu hình phân quyền mà không ai nhớ nó từng có.
        Assert.False(row.IsActive);
    }

    [Fact]
    public async Task EndpointQuayLaiThiBatLaiDongCu()
    {
        await using var db = RbacTestHarness.NewDb(nameof(EndpointQuayLaiThiBatLaiDongCu));
        await Scanner(db, endpoints: CatalogList()).SyncAsync();
        var id = (await db.Permissions.SingleAsync()).Id;
        await Scanner(db, endpoints: Array.Empty<RouteEndpoint>()).SyncAsync();

        var result = await Scanner(db, endpoints: CatalogList()).SyncAsync();

        Assert.Equal(1, result.Reactivated);
        Assert.Equal(0, result.Added);
        var row = await db.Permissions.SingleAsync();
        Assert.Equal(id, row.Id);
        Assert.True(row.IsActive);
    }

    [Fact]
    public async Task GiuTenHienThiNguoiQuanTriDaSuaTay()
    {
        await using var db = RbacTestHarness.NewDb(nameof(GiuTenHienThiNguoiQuanTriDaSuaTay));
        await Scanner(db, endpoints: CatalogList()).SyncAsync();

        var row = await db.Permissions.SingleAsync();
        row.DisplayName = "Xem danh mục dùng chung của bệnh viện";
        await db.SaveChangesAsync();

        await Scanner(db, endpoints: CatalogList()).SyncAsync();

        // Ghi đè tên mỗi lần quét thì công sức đặt tên sát nghiệp vụ mất sau mỗi lần
        // deploy — người quản trị sẽ thôi không đặt tên nữa.
        Assert.Equal("Xem danh mục dùng chung của bệnh viện", (await db.Permissions.SingleAsync()).DisplayName);
    }

    [Fact]
    public async Task KhongDungToiQuyenNguoiQuanTriTuTao()
    {
        await using var db = RbacTestHarness.NewDb(nameof(KhongDungToiQuyenNguoiQuanTriTuTao));
        // Quyền tự tạo: không gắn với endpoint nào nên ControllerName rỗng.
        db.Permissions.Add(new Permission
        {
            Id = Guid.NewGuid(),
            Code = "BaoCao.XemToanVien",
            DisplayName = "Xem báo cáo toàn viện",
            Category = "Báo cáo",
            ControllerName = string.Empty,
            ActionName = string.Empty,
            IsSystem = false,
            IsActive = true,
        });
        await db.SaveChangesAsync();

        var result = await Scanner(db, endpoints: CatalogList()).SyncAsync();

        // Không được tính là "endpoint đã gỡ": tắt nó đi là người quản trị mất một
        // quyền họ tự định nghĩa mà chẳng hiểu vì sao.
        Assert.Equal(0, result.Deactivated);
        var custom = await db.Permissions.SingleAsync(p => p.Code == "BaoCao.XemToanVien");
        Assert.True(custom.IsActive);
    }

    // ===== tiện ích =====

    /// <summary>Bộ quét không chạm CSDL (chỉ dùng cho Scan/BuildRouteMap).</summary>
    private static PermissionScanner Scanner(params Endpoint[] endpoints) =>
        RbacTestHarness.Scanner(endpoints, new SingleDbScopeFactory(null!));

    private static PermissionScanner Scanner(
        Microsoft.EntityFrameworkCore.DbContext db,
        string? autoGrantRoleCode = null,
        params Endpoint[] endpoints) =>
        RbacTestHarness.Scanner(
            endpoints,
            new SingleDbScopeFactory((AIValidation.Api.Data.AppDbContext)db),
            RbacTestHarness.Options(autoGrantRoleCode: autoGrantRoleCode));
}
