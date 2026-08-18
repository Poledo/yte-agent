using System.Security.Claims;
using AIValidation.Api.Authorization.Dynamic;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Models.Auth;
using AIValidation.Api.Services.Auth;
using AIValidation.Api.Services.Tenancy;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Quản trị người dùng là chỗ hai lỗ hổng rẻ nhất nằm cạnh nhau:
///
/// 1. Tin <c>facilityId</c> gửi lên từ client - sửa một con số trong body là tạo được
///    tài khoản ở cơ sở khác, hoặc tài khoản cấp hệ thống thấy hết.
/// 2. Cho gán vai trò mạnh hơn chính mình - quản trị cơ sở tự tạo một tài khoản, gán
///    cho nó vai trò quản trị hệ thống, rồi đăng nhập bằng tài khoản đó.
///
/// Cây dùng ở đây giống <see cref="TenantScopeTests"/>: 1 SYT ⟶ (2 BV-A ⟶ 3 TYT-A1, 4 BV-C).
/// </summary>
public class UserAdminTenancyTests
{
    private static readonly Guid ActorId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private const string Password = "Abc12345!";

    [Fact]
    public async Task QuanTriCoSoTaoUserThiFacilityIdBiEpVeCoSoCuaMinh()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(QuanTriCoSoTaoUserThiFacilityIdBiEpVeCoSoCuaMinh), facilityId: 2);

        // Body cố tình khai cơ sở của nhánh khác.
        var result = await fixture.Service.CreateAsync(
            new CreateUserRequest("moi@bv-a.vn", Password, "Người mới", null, FacilityId: 4), ActorId, null);

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(2, result.Data!.FacilityId);
        Assert.Equal("BV-A", result.Data.FacilityCode);
    }

    [Fact]
    public async Task QuanTriHeThongDuocChonCoSoTuDoNhungPhaiCoThatTrongCay()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(QuanTriHeThongDuocChonCoSoTuDoNhungPhaiCoThatTrongCay), facilityId: null);

        var ok = await fixture.Service.CreateAsync(
            new CreateUserRequest("a@bv-c.vn", Password, "Ở nhánh khác", null, FacilityId: 4), ActorId, null);
        Assert.True(ok.Succeeded, ok.Message);
        Assert.Equal(4, ok.Data!.FacilityId);

        var lost = await fixture.Service.CreateAsync(
            new CreateUserRequest("b@khong-co.vn", Password, "Cơ sở ma", null, FacilityId: 999), ActorId, null);
        Assert.False(lost.Succeeded);
        Assert.Contains("999", lost.Message);
    }

    [Fact]
    public async Task ChanGanVaiTroCoQuyenVuotQuyenCuaMinhVaNeuThangMaConThieu()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(ChanGanVaiTroCoQuyenVuotQuyenCuaMinhVaNeuThangMaConThieu), facilityId: 2);
        await fixture.AddRoleAsync("Quản trị hệ thống", "Users.Delete", "Rbac.ToggleActive");
        fixture.SetActorPermissions("Users.Create");

        var result = await fixture.Service.CreateAsync(
            new CreateUserRequest("leo-thang@bv-a.vn", Password, "Tài khoản mồi",
                new[] { "Quản trị hệ thống" }, FacilityId: 2), ActorId, null);

        Assert.False(result.Succeeded);
        Assert.Equal(403, result.StatusCode);
        Assert.Contains("Users.Delete", result.Message);
        Assert.Contains("Rbac.ToggleActive", result.Message);
        Assert.Null(await fixture.Users.FindByEmailAsync("leo-thang@bv-a.vn"));
    }

    [Fact]
    public async Task GanVaiTroNamGonTrongTapQuyenCuaMinhThiDuocPhep()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(GanVaiTroNamGonTrongTapQuyenCuaMinhThiDuocPhep), facilityId: 2);
        await fixture.AddRoleAsync("Nhập liệu", "Catalog.Import");
        fixture.SetActorPermissions("Catalog.Import", "Users.Create");

        var result = await fixture.Service.CreateAsync(
            new CreateUserRequest("nhaplieu@bv-a.vn", Password, "Nhân viên nhập liệu",
                new[] { "Nhập liệu" }, FacilityId: 2), ActorId, null);

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(new[] { "Nhập liệu" }, result.Data!.Roles);
    }

    [Fact]
    public async Task SuperAdminGanVaiTroTuDoDuDangODuoiMotCoSo()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(SuperAdminGanVaiTroTuDoDuDangODuoiMotCoSo), facilityId: 2);
        await fixture.AddRoleAsync("Quản trị hệ thống", "Users.Delete");
        fixture.SetActorPermissions(isSuperAdmin: true);

        var result = await fixture.Service.CreateAsync(
            new CreateUserRequest("sa-tao@bv-a.vn", Password, "Do SuperAdmin tạo",
                new[] { "Quản trị hệ thống" }, FacilityId: 2), ActorId, null);

        Assert.True(result.Succeeded, result.Message);
    }

    [Fact]
    public async Task DanhSachChiGomNhanhCuaMinh_KhongGomTaiKhoanCapHeThong()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(DanhSachChiGomNhanhCuaMinh_KhongGomTaiKhoanCapHeThong), facilityId: 2);
        fixture.SeedUser("bv-a@x.vn", 2);
        fixture.SeedUser("tyt-a1@x.vn", 3);
        fixture.SeedUser("bv-c@x.vn", 4);
        fixture.SeedUser("he-thong@x.vn", null);

        var list = await fixture.Service.ListAsync(null);

        Assert.Equal(new[] { "bv-a@x.vn", "tyt-a1@x.vn" }, list.Select(u => u.Email).OrderBy(e => e));
    }

    [Fact]
    public async Task QuanTriHeThongThayCaTaiKhoanCapHeThongLanMoiCoSo()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(QuanTriHeThongThayCaTaiKhoanCapHeThongLanMoiCoSo), facilityId: null);
        fixture.SeedUser("bv-a@x.vn", 2);
        fixture.SeedUser("bv-c@x.vn", 4);
        fixture.SeedUser("he-thong@x.vn", null);

        var list = await fixture.Service.ListAsync(null);

        Assert.Equal(3, list.Count);
        Assert.Contains(list, u => u.Email == "he-thong@x.vn" && u.FacilityId == null);
        Assert.Contains(list, u => u.Email == "bv-a@x.vn" && u.FacilityCode == "BV-A");
    }

    [Fact]
    public async Task SuaHoacXoaTaiKhoanNgoaiPhamViDeuBi403()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(SuaHoacXoaTaiKhoanNgoaiPhamViDeuBi403), facilityId: 2);
        var outsider = fixture.SeedUser("bv-c@x.vn", 4);
        var systemUser = fixture.SeedUser("he-thong@x.vn", null);

        var read = await fixture.Service.GetAsync(outsider);
        Assert.False(read.Succeeded);
        Assert.Equal(403, read.StatusCode);

        var updated = await fixture.Service.UpdateAsync(outsider, new UpdateUserRequest("Tên mới", null), ActorId, null);
        Assert.False(updated.Succeeded);
        Assert.Equal(403, updated.StatusCode);

        var deleted = await fixture.Service.DeleteAsync(outsider, ActorId, null);
        Assert.False(deleted.Succeeded);
        Assert.Equal(403, deleted.StatusCode);

        // Tài khoản cấp hệ thống (FacilityId null) cũng ngoài tầm với của quản trị cơ sở.
        var systemDenied = await fixture.Service.GetAsync(systemUser);
        Assert.False(systemDenied.Succeeded);
        Assert.Equal(403, systemDenied.StatusCode);
    }

    [Fact]
    public async Task GanVaiTroXongThiCacheQuyenBiXoaNgay()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(GanVaiTroXongThiCacheQuyenBiXoaNgay), facilityId: null);
        await fixture.AddRoleAsync("Nhập liệu", "Catalog.Import");
        var target = fixture.SeedUser("nv@bv-a.vn", 2);

        var result = await fixture.Service.AssignRolesAsync(
            target, new AssignRolesRequest(new[] { "Nhập liệu" }), ActorId, null);

        Assert.True(result.Succeeded, result.Message);
        Assert.Equal(1, fixture.Cache.InvalidateCount);
    }

    [Fact]
    public async Task KhoaTaiKhoanCungPhaiXoaCacheQuyen()
    {
        await using var fixture = await Fixture.CreateAsync(nameof(KhoaTaiKhoanCungPhaiXoaCacheQuyen), facilityId: null);
        var target = fixture.SeedUser("nv@bv-a.vn", 2);

        var result = await fixture.Service.SetLockAsync(target, locked: true, ActorId, null);

        Assert.True(result.Succeeded, result.Message);
        Assert.False(result.Data!.IsActive);
        Assert.Equal(1, fixture.Cache.InvalidateCount);
    }

    // ----- đồ nghề riêng -----

    /// <summary>
    /// Dựng UserAdminService thật với Identity chạy trên CSDL trong bộ nhớ. Cố ý dùng
    /// UserManager/RoleManager thật thay vì giả lập: phần lớn cạm bẫy ở đây (chuẩn hóa
    /// email, tra vai trò theo tên chuẩn hóa) nằm chính trong Identity.
    /// </summary>
    private sealed class Fixture : IAsyncDisposable
    {
        public required AppDbContext Db { get; init; }
        public required UserManager<AppUser> Users { get; init; }
        public required RoleManager<AppRole> Roles { get; init; }
        public required FakePermissionCache Cache { get; init; }
        public required UserAdminService Service { get; init; }

        public static async Task<Fixture> CreateAsync(string name, long? facilityId)
        {
            var db = RbacTestHarness.NewDb(name);

            var users = new UserManager<AppUser>(
                new UserStore<AppUser, AppRole, AppDbContext, Guid>(db),
                Options.Create(new IdentityOptions()),
                new PasswordHasher<AppUser>(),
                new IUserValidator<AppUser>[] { new UserValidator<AppUser>() },
                new IPasswordValidator<AppUser>[] { new PasswordValidator<AppUser>() },
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                services: null!,
                NullLogger<UserManager<AppUser>>.Instance);

            var roles = new RoleManager<AppRole>(
                new RoleStore<AppRole, AppDbContext, Guid>(db),
                new IRoleValidator<AppRole>[] { new RoleValidator<AppRole>() },
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                NullLogger<RoleManager<AppRole>>.Instance);

            var tree = new FakeFacilityTree()
                .Add(1, "SYT", "Sở Y tế")
                .Add(2, "BV-A", "Bệnh viện A", parentId: 1)
                .Add(3, "TYT-A1", "Trạm Y tế A1", parentId: 2)
                .Add(4, "BV-C", "Bệnh viện C", parentId: 1);

            var accessor = new StubHttpContextAccessor(RbacTestHarness.User(ActorId, facilityId: facilityId));

            var cache = new FakePermissionCache();
            var fixture = new Fixture
            {
                Db = db,
                Users = users,
                Roles = roles,
                Cache = cache,
                Service = new UserAdminService(
                    users, roles, db, new NoOpAuditService(),
                    new TenantScope(tree, accessor), tree, cache),
            };

            // Người thực hiện mặc định: có vài quyền thường, không phải SuperAdmin.
            fixture.SetActorPermissions("Users.Create");
            await Task.CompletedTask;
            return fixture;
        }

        /// <summary>Tập quyền mà NGƯỜI ĐANG THAO TÁC đang có - mốc so sánh khi chặn leo thang.</summary>
        public void SetActorPermissions(params string[] codes) => SetActorPermissions(false, codes);

        public void SetActorPermissions(bool isSuperAdmin, params string[] codes) =>
            Cache.Snapshots[ActorId] = new UserPermissionSnapshot(
                IsActive: true, IsSuperAdmin: isSuperAdmin, RoleCount: 1,
                Codes: codes.ToHashSet(StringComparer.OrdinalIgnoreCase));

        /// <summary>Một vai trò kèm đúng các quyền được nêu tên.</summary>
        public async Task AddRoleAsync(string name, params string[] codes)
        {
            var role = new AppRole { Id = Guid.NewGuid(), Name = name, Code = name.ToUpperInvariant() };
            await Roles.CreateAsync(role);

            foreach (var code in codes)
            {
                var permission = new Permission { Id = Guid.NewGuid(), Code = code, IsActive = true };
                Db.Permissions.Add(permission);
                Db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permission.Id });
            }
            Db.SaveChanges();
        }

        /// <summary>Một tài khoản có sẵn ở cơ sở nào đó; null = tài khoản cấp hệ thống.</summary>
        public Guid SeedUser(string email, long? facilityId)
        {
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                UserName = email,
                NormalizedUserName = email.ToUpperInvariant(),
                IsActive = true,
                FacilityId = facilityId,
                SecurityStamp = Guid.NewGuid().ToString("N"),
            };
            Db.Users.Add(user);
            Db.SaveChanges();
            return user.Id;
        }

        public async ValueTask DisposeAsync()
        {
            Users.Dispose();
            Roles.Dispose();
            await Db.DisposeAsync();
        }
    }

    /// <summary>Nhật ký kiểm toán không phải phần đang kiểm ở đây.</summary>
    private sealed class NoOpAuditService : IAuditService
    {
        public Task LogAsync(
            string action, Guid? userId = null, string? userName = null, string? entityType = null,
            string? entityId = null, string? detail = null, string? ipAddress = null,
            CancellationToken ct = default) => Task.CompletedTask;
    }
}
