using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Cache quyền là thứ đứng giữa mỗi request và CSDL, nên nó có đúng hai việc phải làm
/// đúng: (1) không bắn CSDL mỗi request, (2) buông cache NGAY khi người quản trị sửa
/// vai trò. Sai vế (1) thì hệ thống chậm; sai vế (2) thì người vừa bị gỡ quyền vẫn
/// dùng được quyền cũ tới hết TTL - đó là lỗ hổng, không phải sự bất tiện.
/// </summary>
public class PermissionCacheTests
{
    private static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid RoleId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public async Task AnhChupQuyenGomDuMaTuCacVaiTroDangGiu()
    {
        await using var db = RbacTestHarness.NewDb(nameof(AnhChupQuyenGomDuMaTuCacVaiTroDangGiu));
        Seed(db, "Catalog.Import", "Catalog.List");
        var cache = Cache(db);

        var snapshot = await cache.GetUserSnapshotAsync(UserId);

        Assert.NotNull(snapshot);
        Assert.True(snapshot!.IsActive);
        Assert.False(snapshot.IsSuperAdmin);
        Assert.Equal(1, snapshot.RoleCount);
        Assert.Equal(new[] { "Catalog.Import", "Catalog.List" }, snapshot.Codes.OrderBy(c => c));
    }

    [Fact]
    public async Task ChuaXoaCacheThiKhongThayQuyenVuaThem_XoaXongThayNgay()
    {
        await using var db = RbacTestHarness.NewDb(nameof(ChuaXoaCacheThiKhongThayQuyenVuaThem_XoaXongThayNgay));
        Seed(db, "Catalog.List");
        var cache = Cache(db);

        Assert.DoesNotContain("Catalog.Import", (await cache.GetUserSnapshotAsync(UserId))!.Codes);

        var added = new Permission { Id = Guid.NewGuid(), Code = "Catalog.Import", IsActive = true };
        db.Permissions.Add(added);
        db.RolePermissions.Add(new RolePermission { RoleId = RoleId, PermissionId = added.Id });
        await db.SaveChangesAsync();

        // Vẫn là ảnh chụp cũ: đây là hành vi ĐÚNG của cache, không phải lỗi.
        Assert.DoesNotContain("Catalog.Import", (await cache.GetUserSnapshotAsync(UserId))!.Codes);

        cache.InvalidateAll();

        Assert.Contains("Catalog.Import", (await cache.GetUserSnapshotAsync(UserId))!.Codes);
    }

    [Fact]
    public async Task BangTrangThaiQuyenCungBiXoaTheoInvalidateAll()
    {
        await using var db = RbacTestHarness.NewDb(nameof(BangTrangThaiQuyenCungBiXoaTheoInvalidateAll));
        Seed(db, "Catalog.List");
        var cache = Cache(db);

        Assert.True((await cache.GetPermissionStatesAsync())["Catalog.List"]);

        var permission = db.Permissions.Single(p => p.Code == "Catalog.List");
        permission.IsActive = false;
        await db.SaveChangesAsync();

        Assert.True((await cache.GetPermissionStatesAsync())["Catalog.List"]);
        cache.InvalidateAll();
        Assert.False((await cache.GetPermissionStatesAsync())["Catalog.List"]);
    }

    [Fact]
    public async Task TaiKhoanKhongTonTaiTraNullVaKetQuaNullCungDuocDem()
    {
        await using var db = RbacTestHarness.NewDb(nameof(TaiKhoanKhongTonTaiTraNullVaKetQuaNullCungDuocDem));
        Seed(db, "Catalog.List");
        var memory = new MemoryCache(new MemoryCacheOptions());
        var cache = Cache(db, memory);
        var stranger = Guid.NewGuid();

        Assert.Null(await cache.GetUserSnapshotAsync(stranger));

        // Chốt bằng chính khóa cache: token rác bắn vào đây mỗi request mà không đệm
        // kết quả null thì mỗi lần là một truy vấn CSDL.
        Assert.True(memory.TryGetValue("rbac:user:" + stranger.ToString("N"), out UserPermissionSnapshot? cached));
        Assert.Null(cached);
    }

    [Fact]
    public async Task ChuaGanVaiTroThiRoleCountBangKhongVaKhongCoMaNao()
    {
        await using var db = RbacTestHarness.NewDb(nameof(ChuaGanVaiTroThiRoleCountBangKhongVaKhongCoMaNao));
        Seed(db, "Catalog.List", assignRole: false);
        var cache = Cache(db);

        var snapshot = await cache.GetUserSnapshotAsync(UserId);

        Assert.NotNull(snapshot);
        Assert.Equal(0, snapshot!.RoleCount);
        Assert.Empty(snapshot.Codes);
    }

    // ----- đồ nghề riêng -----

    private static PermissionCache Cache(AppDbContext db, IMemoryCache? memory = null) =>
        new(memory ?? new MemoryCache(new MemoryCacheOptions()),
            new SingleDbScopeFactory(db),
            RbacTestHarness.Options(),
            NullLogger<PermissionCache>.Instance);

    /// <summary>Một tài khoản, một vai trò, và các quyền được nêu tên đều gắn vào vai trò đó.</summary>
    private static void Seed(AppDbContext db, params string[] codes) => Seed(db, codes, assignRole: true);

    private static void Seed(AppDbContext db, string code, bool assignRole) => Seed(db, new[] { code }, assignRole);

    private static void Seed(AppDbContext db, string[] codes, bool assignRole)
    {
        db.Users.Add(new AppUser { Id = UserId, Email = "a@b.vn", UserName = "a@b.vn", IsActive = true });
        db.Roles.Add(new AppRole { Id = RoleId, Name = "Quản trị", Code = "ADMIN" });

        foreach (var code in codes)
        {
            var permission = new Permission { Id = Guid.NewGuid(), Code = code, IsActive = true };
            db.Permissions.Add(permission);
            db.RolePermissions.Add(new RolePermission { RoleId = RoleId, PermissionId = permission.Id });
        }

        if (assignRole)
        {
            db.UserRoles.Add(new IdentityUserRole<Guid> { UserId = UserId, RoleId = RoleId });
        }

        db.SaveChanges();
    }
}
