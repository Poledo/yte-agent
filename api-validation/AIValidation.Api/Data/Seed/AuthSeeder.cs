using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Data.Seed;

/// <summary>
/// Seed dữ liệu khởi tạo cho module xác thực/RBAC: các vai trò hệ thống và tài khoản
/// quản trị mặc định. Gọi lúc startup sau khi migrate. An toàn khi chạy lại (idempotent).
///
/// Danh mục QUYỀN không còn được seed ở đây: quyền do bộ quét endpoint sinh ra sau khi
/// ứng dụng đã dựng xong bảng định tuyến (xem PermissionScannerHostedService).
/// </summary>
public static class AuthSeeder
{
    /// <summary>Chạy toàn bộ quá trình seed.</summary>
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var roleManager = sp.GetRequiredService<RoleManager<AppRole>>();
        var userManager = sp.GetRequiredService<UserManager<AppUser>>();
        var config = sp.GetRequiredService<IConfiguration>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("AuthSeeder");

        await SeedRolesAsync(db, roleManager);
        await SeedAdminUserAsync(userManager, config, logger);
    }

    /// <summary>
    /// Đặt mã bất biến cho các vai trò có sẵn và bổ sung vai trò quản trị cơ sở.
    /// Không gán quyền ở đây: quyền của ADMIN do bộ quét tự cấp, quyền của các vai trò
    /// còn lại do người quản trị tự tick ở màn hình Vai trò.
    /// </summary>
    private static async Task SeedRolesAsync(AppDbContext db, RoleManager<AppRole> roleManager)
    {
        // Vai trò cũ giữ nguyên tên hiển thị, chỉ nhận mã chuẩn. Migration đã điền mã
        // suy từ tên (SYSTEMADMIN, VIEWER...) nên ở đây là bước chuẩn hóa lại.
        await EnsureCodeAsync(db, roleManager, roleName: "SystemAdmin", code: SystemRoles.Admin);
        await EnsureCodeAsync(db, roleManager, roleName: "Viewer", code: SystemRoles.Guest);

        await EnsureRoleAsync(db, roleManager,
            code: SystemRoles.FacilityAdmin,
            name: "Quản trị cơ sở",
            description: "Quản trị một cơ sở KCB và toàn bộ nhánh cấp dưới");

        await db.SaveChangesAsync();
    }

    /// <summary>Đặt mã cho một vai trò đã tồn tại theo tên; bỏ qua nếu vai trò không có.</summary>
    private static async Task EnsureCodeAsync(
        AppDbContext db, RoleManager<AppRole> roleManager, string roleName, string code)
    {
        var role = await roleManager.FindByNameAsync(roleName);
        if (role is null || role.Code == code)
        {
            return;
        }

        // Mã có index duy nhất: nếu vai trò khác đã giữ mã này thì để yên, tránh làm
        // đổ cả quá trình seed vì một xung đột tên.
        var taken = await db.Roles.AnyAsync(r => r.Code == code && r.Id != role.Id);
        if (taken)
        {
            return;
        }

        role.Code = code;
        db.Roles.Update(role);
    }

    /// <summary>Tạo vai trò theo mã nếu chưa có.</summary>
    private static async Task EnsureRoleAsync(
        AppDbContext db, RoleManager<AppRole> roleManager, string code, string name, string description)
    {
        if (await db.Roles.AnyAsync(r => r.Code == code))
        {
            return;
        }

        await roleManager.CreateAsync(new AppRole
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code,
            Description = description,
            IsSystem = true,
        });
    }

    /// <summary>
    /// Tạo tài khoản quản trị mặc định nếu chưa có. Đồng thời DI TRÚ (một lần)
    /// tài khoản admin cũ <c>admin@chienbinhyteso.vn</c> sang email quản trị mới,
    /// giữ nguyên mật khẩu và role. Idempotent: sau khi đã đổi thì bỏ qua.
    /// </summary>
    private static async Task SeedAdminUserAsync(
        UserManager<AppUser> userManager, IConfiguration config, ILogger logger)
    {
        const string legacyEmail = "admin@chienbinhyteso.vn";
        const string adminEmail = "dhthi.itc@gmail.com";
        var configuredPassword = config["Seed:AdminPassword"];
        var password = string.IsNullOrWhiteSpace(configuredPassword) ? "Admin@123456" : configuredPassword;

        // Di trú: đổi email tài khoản admin cũ sang email mới (chỉ khi email mới
        // chưa tồn tại). Giữ nguyên mật khẩu và role; email mới coi như đã xác
        // nhận để không chặn đăng nhập. Sau lần đầu, không còn tài khoản cũ → bỏ qua.
        var legacy = await userManager.FindByEmailAsync(legacyEmail);
        if (legacy != null && await userManager.FindByEmailAsync(adminEmail) == null)
        {
            await userManager.SetUserNameAsync(legacy, adminEmail);
            await userManager.SetEmailAsync(legacy, adminEmail);
            legacy.EmailConfirmed = true;
            await userManager.UpdateAsync(legacy);
            logger.LogWarning(
                "Đã đổi email tài khoản quản trị: {Old} -> {New} (giữ nguyên mật khẩu).",
                legacyEmail, adminEmail);
        }

        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin == null)
        {
            admin = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Quản trị hệ thống",
                EmailConfirmed = true,
                IsActive = true,
                IsSuperAdmin = true,
                CreatedAt = DateTime.UtcNow,
            };

            var created = await userManager.CreateAsync(admin, password);
            if (!created.Succeeded)
            {
                logger.LogError("Không tạo được tài khoản quản trị mặc định: {Errors}",
                    string.Join("; ", created.Errors.Select(e => e.Description)));
                return;
            }
        }
        else if (!admin.IsSuperAdmin)
        {
            // Chốt chặn cuối: lỡ tay gỡ hết quyền của vai trò ADMIN thì vẫn còn một
            // tài khoản vào được để sửa lại.
            admin.IsSuperAdmin = true;
            await userManager.UpdateAsync(admin);
        }

        if (!await userManager.IsInRoleAsync(admin, "SystemAdmin"))
        {
            await userManager.AddToRoleAsync(admin, "SystemAdmin");
        }

        logger.LogWarning(
            "Tài khoản quản trị: {Email} — mật khẩu mặc định {Password} nếu là tài khoản mới; " +
            "tài khoản di trú giữ nguyên mật khẩu cũ. Đổi mật khẩu ngay sau khi đăng nhập.",
            adminEmail, password);
    }
}
