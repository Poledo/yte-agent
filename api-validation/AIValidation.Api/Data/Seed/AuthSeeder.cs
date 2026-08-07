using AIValidation.Api.Authorization;
using AIValidation.Api.Data.Entities.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Data.Seed;

/// <summary>
/// Seed dữ liệu khởi tạo cho module xác thực/RBAC: danh mục Permission cố định,
/// các role mặc định (SystemAdmin/Manager/Viewer) và tài khoản quản trị mặc định.
/// Gọi lúc startup sau khi migrate. An toàn khi chạy lại (idempotent).
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

        await SeedPermissionsAsync(db);
        await SeedRolesAsync(db, roleManager);
        await SeedAdminUserAsync(userManager, config, logger);
    }

    /// <summary>Seed/đồng bộ danh mục quyền cố định từ <see cref="Permissions.All"/>.</summary>
    private static async Task SeedPermissionsAsync(AppDbContext db)
    {
        var existingCodes = await db.Permissions.Select(p => p.Code).ToListAsync();
        var missing = Permissions.All.Where(p => !existingCodes.Contains(p.Code)).ToList();

        foreach (var def in missing)
        {
            db.Permissions.Add(new Permission
            {
                Id = Guid.NewGuid(),
                Code = def.Code,
                DisplayName = def.DisplayName,
                Group = def.Group,
                CreatedAt = DateTime.UtcNow,
            });
        }

        if (missing.Count > 0)
        {
            await db.SaveChangesAsync();
        }
    }

    /// <summary>Seed các role mặc định và gán quyền tương ứng.</summary>
    private static async Task SeedRolesAsync(AppDbContext db, RoleManager<AppRole> roleManager)
    {
        // SystemAdmin: toàn quyền (chỉ cần System.Admin — handler bỏ qua kiểm tra chi tiết)
        await EnsureRoleAsync(db, roleManager, "SystemAdmin", "Quản trị hệ thống - toàn quyền", isSystem: true,
            new[] { Permissions.SystemAdmin });

        // Manager: mọi View + Manage nghiệp vụ, TRỪ User/Role/System
        var managerPerms = new[]
        {
            Permissions.DocumentView, Permissions.DocumentManage,
            Permissions.KnowledgeView, Permissions.KnowledgeManage,
            Permissions.CatalogView, Permissions.CatalogManage, Permissions.CatalogKnowledge,
            Permissions.ValidationView, Permissions.ValidationExecute,
            Permissions.AiChat,
            Permissions.PromptManage,
            Permissions.AuditView,
        };
        await EnsureRoleAsync(db, roleManager, "Manager", "Quản lý nghiệp vụ", isSystem: true, managerPerms);

        // Viewer: chỉ các *.View + AI.Chat
        var viewerPerms = new[]
        {
            Permissions.DocumentView,
            Permissions.KnowledgeView,
            Permissions.CatalogView,
            Permissions.ValidationView,
            Permissions.AiChat,
        };
        await EnsureRoleAsync(db, roleManager, "Viewer", "Chỉ xem", isSystem: true, viewerPerms);
    }

    /// <summary>Tạo role nếu chưa có và bổ sung các quyền còn thiếu (không xóa quyền đã có).</summary>
    private static async Task EnsureRoleAsync(
        AppDbContext db, RoleManager<AppRole> roleManager,
        string name, string description, bool isSystem, string[] permissionCodes)
    {
        var role = await roleManager.FindByNameAsync(name);
        if (role == null)
        {
            role = new AppRole
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = description,
                IsSystem = isSystem,
            };
            await roleManager.CreateAsync(role);
        }

        var permissionIds = await db.Permissions
            .Where(p => permissionCodes.Contains(p.Code))
            .Select(p => p.Id)
            .ToListAsync();

        var existingLinks = await db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();

        var toAdd = permissionIds.Except(existingLinks).ToList();
        foreach (var pid in toAdd)
        {
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pid });
        }

        if (toAdd.Count > 0)
        {
            await db.SaveChangesAsync();
        }
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
