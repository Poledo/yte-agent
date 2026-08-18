using AIValidation.Api.Data.Entities.Auth;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Data.Seed;

/// <summary>
/// Dịch 19 mã quyền thô sơ cũ ("Catalog.Manage", "System.Admin"...) sang bộ mã mới
/// mịn tới từng endpoint, rồi xóa hẳn mã cũ.
///
/// Đây là rào an toàn quan trọng nhất của đợt chuyển đổi: đổi bộ mã quyền mà không
/// dịch lại thì ngay sau khi deploy, mọi tài khoản trừ SuperAdmin đều nhận 403 ở
/// mọi màn hình. Chạy MỘT LẦN và tự đánh dấu: xóa xong mã cũ thì lần khởi động sau
/// không còn gì để dịch nữa.
///
/// Phải chạy SAU bộ quét endpoint, vì mã mới chỉ tồn tại sau khi bảng quyền được
/// đồng bộ với mã nguồn.
/// </summary>
public static class LegacyPermissionMigrator
{
    /// <summary>
    /// Bảng dịch: mã cũ → các mã endpoint mới tương đương. Cố ý liệt kê tường minh
    /// chứ không khớp theo tiền tố — khớp tiền tố sẽ âm thầm cấp thừa quyền
    /// (vd "Catalog." kéo theo cả nhóm đưa danh mục vào kho tri thức vốn là quyền riêng).
    /// </summary>
    private static readonly Dictionary<string, string[]> GrantMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["System.Admin"] = new[]
        {
            "LlmConfig.Get", "LlmConfig.Update", "LlmConfig.Test",
            "RateLimitConfig.Get", "RateLimitConfig.Update",
            "ExtensionConfigAdmin.Get", "ExtensionConfigAdmin.Update",
        },
        ["Document.View"] = new[]
        {
            "Assistant.List", "Assistant.GetDocument", "Assistant.GetDocumentFile",
            "Assistant.EmbeddingsStatus",
        },
        ["Document.Manage"] = new[]
        {
            "Assistant.Ingest", "Assistant.Deactivate", "Assistant.Restore",
            "Assistant.DeleteAllDocuments", "Assistant.DeleteExpiredDocuments",
            "Assistant.UpdateDocumentValidity", "Assistant.RebuildEmbeddings",
        },
        ["Knowledge.View"] = new[]
        {
            "Legal.Search", "Legal.ListDownloads", "Legal.GetContent",
        },
        ["Knowledge.Manage"] = new[]
        {
            "Legal.Download", "Legal.IngestSelected", "Legal.RemoveKnowledge", "Legal.DeleteDownload",
        },
        ["Catalog.View"] = new[]
        {
            "Catalog.GetSources", "Catalog.GetItems", "Catalog.GetProfiles", "Catalog.GetSourceFile",
            "Facility.GetAll", "Facility.GetTree", "Facility.GetCatalogScope",
            "Icd.GetSummary", "Icd.GetCode", "Icd.ValidateCode",
            "Icd.GetSyncStatus", "Icd.GetSyncSettings", "Icd.GetProviderStats",
        },
        ["Catalog.Manage"] = new[]
        {
            "Catalog.DeleteSource", "Catalog.DeleteAllSources", "Catalog.RestoreSource",
            "Facility.Create", "Facility.Update", "Facility.Delete",
            "Icd.Sync", "Icd.Import", "Icd.UpdateSyncSettings", "Icd.ClearAll",
        },
        ["Catalog.Knowledge"] = new[]
        {
            "Catalog.AddToKnowledge", "Catalog.RemoveFromKnowledge", "Catalog.AddManyToKnowledge",
        },
        ["Validation.View"] = new[]
        {
            "Xml130.GetRules", "Xml130.GetFieldSpecs",
            "Stats.GetUsage", "Stats.GetEvents", "Stats.GetEventDetail",
        },
        ["Validation.Execute"] = new[]
        {
            "Xml130.ImportFieldSpecs",
        },
        ["AI.Chat"] = new[]
        {
            "Assistant.SearchDebug",
        },
        // Không còn endpoint nào tương ứng — giữ khóa rỗng để bảng này vẫn là danh
        // sách đầy đủ 19 mã cũ, ai đọc lại cũng thấy mã đó đã được cân nhắc.
        ["Prompt.Manage"] = Array.Empty<string>(),
        ["Audit.View"] = new[]
        {
            "Audit.List",
        },
        ["User.Manage"] = new[]
        {
            "Users.List", "Users.Get", "Users.Create", "Users.Update", "Users.Delete",
            "Users.AssignRoles", "Users.Lock", "Users.Unlock",
        },
        ["Role.Manage"] = new[]
        {
            "Roles.List", "Roles.Get", "Roles.Create", "Roles.Update", "Roles.Delete",
            "Roles.AssignPermissions", "Permissions.List",
        },
        ["License.View"] = new[]
        {
            "License.GetAll",
        },
        ["License.Manage"] = new[]
        {
            "License.Create", "License.Update", "License.Rotate", "License.Revoke", "License.Restore",
        },
        ["Billing.View"] = new[]
        {
            "Billing.GetUsage", "Billing.GetDetail", "Billing.GetInvoices",
        },
        ["Billing.Close"] = new[]
        {
            "Billing.Close",
        },
    };

    /// <summary>Dịch và dọn mã cũ. Trả số dòng gán quyền đã thêm.</summary>
    public static async Task<int> ApplyAsync(AppDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        var legacyCodes = GrantMap.Keys.ToList();

        // Mã cũ do seeder trước tạo nên không mang metadata endpoint (ControllerName rỗng).
        var legacy = await db.Permissions
            .Where(p => legacyCodes.Contains(p.Code))
            .ToListAsync(cancellationToken);

        if (legacy.Count == 0)
        {
            return 0;
        }

        var legacyIds = legacy.Select(p => p.Id).ToHashSet();

        var newIdByCode = await db.Permissions
            .Where(p => p.ControllerName != "")
            .Select(p => new { p.Code, p.Id })
            .ToDictionaryAsync(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var links = await db.RolePermissions.ToListAsync(cancellationToken);
        var heldByRole = links
            .GroupBy(l => l.RoleId)
            .ToDictionary(g => g.Key, g => g.Select(l => l.PermissionId).ToHashSet());

        var added = 0;
        var missing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var oldPermission in legacy)
        {
            if (!GrantMap.TryGetValue(oldPermission.Code, out var newCodes) || newCodes.Length == 0)
            {
                continue;
            }

            var roleIds = links.Where(l => l.PermissionId == oldPermission.Id).Select(l => l.RoleId).Distinct();

            foreach (var roleId in roleIds)
            {
                var held = heldByRole.TryGetValue(roleId, out var set) ? set : heldByRole[roleId] = new HashSet<Guid>();

                foreach (var newCode in newCodes)
                {
                    if (!newIdByCode.TryGetValue(newCode, out var newId))
                    {
                        missing.Add(newCode);
                        continue;
                    }

                    if (!held.Add(newId))
                    {
                        continue;
                    }

                    db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = newId });
                    added++;
                }
            }
        }

        if (missing.Count > 0)
        {
            // Không im lặng: mã trong bảng dịch mà bộ quét không sinh ra nghĩa là
            // action đã bị đổi tên, và vai trò tương ứng sẽ thiếu quyền sau khi deploy.
            logger.LogWarning(
                "Bảng dịch quyền cũ có {Count} mã không khớp endpoint nào: {Codes}",
                missing.Count, string.Join(", ", missing.Order()));
        }

        // Dọn mã cũ cùng mọi dòng gán của nó — đây cũng là dấu hiệu để lần khởi động
        // sau biết việc dịch đã xong.
        db.RolePermissions.RemoveRange(links.Where(l => legacyIds.Contains(l.PermissionId)));
        db.Permissions.RemoveRange(legacy);

        await db.SaveChangesAsync(cancellationToken);

        logger.LogWarning(
            "Đã chuyển {Legacy} mã quyền cũ sang bộ mã endpoint mới, thêm {Added} dòng gán quyền.",
            legacy.Count, added);

        return added;
    }
}
