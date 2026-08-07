namespace AIValidation.Api.Authorization;

/// <summary>
/// Danh mục mã quyền cố định (fine-grained). Đây là nguồn sự thật duy nhất cho
/// cả seed dữ liệu lẫn attribute [RequirePermission]. Mã dạng "Resource.Action".
/// </summary>
public static class Permissions
{
    // Nhóm Document
    public const string DocumentView = "Document.View";
    public const string DocumentManage = "Document.Manage";

    // Nhóm Knowledge
    public const string KnowledgeView = "Knowledge.View";
    public const string KnowledgeManage = "Knowledge.Manage";

    // Nhóm Catalog
    public const string CatalogView = "Catalog.View";
    public const string CatalogManage = "Catalog.Manage";
    public const string CatalogKnowledge = "Catalog.Knowledge";

    // Nhóm Validation
    public const string ValidationView = "Validation.View";
    public const string ValidationExecute = "Validation.Execute";

    // Nhóm AI
    public const string AiChat = "AI.Chat";

    // Nhóm Prompt
    public const string PromptManage = "Prompt.Manage";

    // Nhóm User
    public const string UserManage = "User.Manage";

    // Nhóm Role
    public const string RoleManage = "Role.Manage";

    // Nhóm Audit
    public const string AuditView = "Audit.View";

    // Nhóm System
    public const string SystemAdmin = "System.Admin";

    /// <summary>
    /// Định nghĩa đầy đủ của một quyền phục vụ seed (mã, tên hiển thị, nhóm).
    /// </summary>
    public sealed record Definition(string Code, string DisplayName, string Group);

    /// <summary>Toàn bộ quyền hệ thống — dùng để seed bảng permissions.</summary>
    public static readonly IReadOnlyList<Definition> All = new List<Definition>
    {
        new(DocumentView,     "Xem tài liệu",              "Document"),
        new(DocumentManage,   "Quản lý tài liệu",          "Document"),
        new(KnowledgeView,    "Xem tri thức",              "Knowledge"),
        new(KnowledgeManage,  "Quản lý tri thức",          "Knowledge"),
        new(CatalogView,      "Xem danh mục",              "Catalog"),
        new(CatalogManage,    "Quản lý danh mục",          "Catalog"),
        new(CatalogKnowledge, "Nạp danh mục vào kho tri thức", "Catalog"),
        new(ValidationView,   "Xem kết quả kiểm tra",      "Validation"),
        new(ValidationExecute,"Chạy kiểm tra hồ sơ",       "Validation"),
        new(AiChat,           "Hỏi đáp AI",                "AI"),
        new(PromptManage,     "Quản lý prompt",            "Prompt"),
        new(UserManage,       "Quản lý người dùng",        "User"),
        new(RoleManage,       "Quản lý vai trò & quyền",   "Role"),
        new(AuditView,        "Xem nhật ký kiểm toán",     "Audit"),
        new(SystemAdmin,      "Toàn quyền hệ thống",       "System"),
    };
}
