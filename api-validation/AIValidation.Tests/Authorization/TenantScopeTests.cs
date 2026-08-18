using System.Security.Claims;
using AIValidation.Api.Services.Tenancy;
using Xunit;

namespace AIValidation.Tests.Authorization;

/// <summary>
/// Phạm vi dữ liệu theo cơ sở KCB. Cây dùng trong cả bộ test:
///
/// <code>
/// 1 SYT  ─┬─ 2 BV-A ── 3 TYT-A1
///         └─ 4 BV-C
/// </code>
///
/// Chỗ dễ sai nhất không phải "thấy nhánh dưới" mà là hai mặc định ngược nhau:
/// chưa đăng nhập thì thấy RỖNG (không phải thấy tất), còn đăng nhập mà không gắn cơ
/// sở nào thì là tài khoản cấp hệ thống nên thấy TẤT. Lẫn hai cái này là rò dữ liệu.
/// </summary>
public class TenantScopeTests
{
    [Fact]
    public async Task QuanTriCoSoThayChinhMinhVaCaNhanhDuoi()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), facilityId: 2));

        var filter = await scope.GetFilterAsync();

        Assert.False(filter.IsSystemScope);
        Assert.Equal(new long[] { 2, 3 }, filter.Ids.OrderBy(i => i));
        Assert.Equal(new[] { "BV-A", "TYT-A1" }, filter.Codes.OrderBy(c => c));
    }

    [Fact]
    public async Task KhongThayCapTrenVaKhongThayNhanhKhac()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), facilityId: 2));

        Assert.True(await scope.CanAccessAsync(2));
        Assert.True(await scope.CanAccessAsync(3));
        Assert.False(await scope.CanAccessAsync(1));  // cấp trên
        Assert.False(await scope.CanAccessAsync(4));  // nhánh khác
        Assert.True(await scope.CanAccessAsync("tyt-a1"));  // mã không phân biệt hoa thường
        Assert.False(await scope.CanAccessAsync("BV-C"));
    }

    [Fact]
    public async Task DuLieuKhongGanCoSoKhongTuDongThuocVeQuanTriCoSo()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), facilityId: 2));
        var filter = await scope.GetFilterAsync();

        // null trên tài khoản/nhật ký nghĩa là "cấp hệ thống", không phải "dùng chung".
        Assert.False(filter.Allows((long?)null));
        Assert.False(filter.Allows((string?)null));
        Assert.False(filter.Allows(string.Empty));
    }

    [Fact]
    public async Task SuperAdminLaPhamViHeThongVaKhongLocGiCa()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), isSuperAdmin: true, facilityId: 2));

        Assert.True(scope.IsSystemScope);
        var filter = await scope.GetFilterAsync();
        Assert.True(filter.IsSystemScope);
        Assert.True(filter.Allows(999L));
        Assert.True(filter.Allows("cơ sở lạ"));
        Assert.True(filter.Allows((long?)null));
    }

    [Fact]
    public async Task TaiKhoanKhongGanCoSoLaTaiKhoanCapHeThong()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid()));

        Assert.True(scope.IsSystemScope);
        Assert.Null(scope.FacilityId);
        Assert.True((await scope.GetFilterAsync()).IsSystemScope);
    }

    [Fact]
    public async Task ChuaDangNhapThiPhamViRONGChuKhongPhaiThayTat()
    {
        var scope = Scope(RbacTestHarness.Anonymous());

        Assert.False(scope.IsAuthenticated);
        Assert.False(scope.IsSystemScope);

        var filter = await scope.GetFilterAsync();
        Assert.False(filter.IsSystemScope);
        Assert.Empty(filter.Ids);
        Assert.False(filter.Allows(1L));
    }

    [Fact]
    public async Task CoSoLaLaGocNhanhThiChiThayMinhNo()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), facilityId: 3));

        var filter = await scope.GetFilterAsync();

        Assert.Equal(new long[] { 3 }, filter.Ids);
        Assert.False(await scope.CanAccessAsync(2));
    }

    [Fact]
    public async Task PhamViChiTraCayMotLanRoiDungLai()
    {
        var scope = Scope(RbacTestHarness.User(Guid.NewGuid(), facilityId: 1));

        var first = await scope.GetFilterAsync();
        var second = await scope.GetFilterAsync();

        // Cùng một đối tượng: mỗi request chỉ tra cây một lần, các truy vấn sau dùng lại.
        Assert.Same(first, second);
        Assert.Equal(new long[] { 1, 2, 3, 4 }, first.Ids.OrderBy(i => i));
    }

    /// <summary>TenantScope thật, chạy trên cây giả và một HttpContext mang sẵn danh tính.</summary>
    private static TenantScope Scope(ClaimsPrincipal user)
    {
        var tree = new FakeFacilityTree()
            .Add(1, "SYT", "Sở Y tế")
            .Add(2, "BV-A", "Bệnh viện A", parentId: 1)
            .Add(3, "TYT-A1", "Trạm Y tế A1", parentId: 2)
            .Add(4, "BV-C", "Bệnh viện C", parentId: 1);

        return new TenantScope(tree, new StubHttpContextAccessor(user));
    }
}
