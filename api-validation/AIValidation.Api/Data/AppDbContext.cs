using AIValidation.Api.Data.Entities;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Data.Entities.Licensing;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Data;

/// <summary>
/// Application DbContext - Entity Framework Core context cho AI Validation API.
///
/// Chức năng:
/// - Define entity models (DbSet)
/// - Configure entity relationships
/// - Configure indexes, constraints
/// - Provide database access layer
///
/// Kết nối:
/// - PostgreSQL via Npgsql.EntityFrameworkCore.PostgreSQL
/// - ConnectionString từ appsettings.json
/// - Database: AIValidationDb (configurable)
///
/// Entities:
/// - KnowledgeItem: General knowledge data (ICD, DVKT, Drugs, etc.)
///   - Unified model, category indicates type
///   - Supports search and filtering
///   - Timestamps for audit trail
///   - Metadata (JSONB) for extensible data
///
/// Design Principles:
/// - DbContext-only responsibility: Entity mapping
/// - Repository pattern: Data access logic
/// - Fluent API: Configuration
/// - No business logic in DbContext
/// </summary>
public class AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    /// <summary>
    /// Khởi tạo AppDbContext.
    ///
    /// DbContext Constructor Pattern:
    /// - Options từ Dependency Injection
    /// - Configured in Program.cs via AddDbContext
    /// </summary>
    /// <param name="options">DbContext options từ DI.</param>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// DbSet cho KnowledgeItem - General knowledge repository entities.
    ///
    /// Mục đích:
    /// - Store medical knowledge (ICD, procedures, drugs)
    /// - Support category-based organization
    /// - Enable efficient search and retrieval
    ///
    /// Entities:
    /// - Category: Type of knowledge (ICD, DVKT, Drug, etc.)
    /// - Code: Standard code (ICD code, procedure code, drug code)
    /// - Name: Human-readable name
    /// - Content: Full description or details
    /// - IsActive: Soft delete via flag
    /// - Timestamps: CreatedAt, UpdatedAt for audit
    /// - Metadata: JSONB for extensible data
    /// </summary>
    public DbSet<KnowledgeItem> KnowledgeItems { get; set; }

    /// <summary>
    /// DbSet cho MedicalDocument - Văn bản y tế (công văn, thông tư, quyết định)
    /// người dùng nạp vào cho tính năng AI tra cứu (RAG).
    /// </summary>
    public DbSet<MedicalDocument> MedicalDocuments { get; set; }

    /// <summary>
    /// DbSet cho DocumentChunk - Đoạn văn bản đánh chỉ mục full-text (tsvector)
    /// phục vụ truy hồi ngữ cảnh khi AI trả lời.
    /// </summary>
    public DbSet<DocumentChunk> DocumentChunks { get; set; }

    /// <summary>
    /// DbSet cho LegalDownload - Văn bản pháp luật đã tải về từ vbpl.vn
    /// (chức năng "Tải văn bản"); nạp vào kho tri thức là bước riêng do người dùng chọn.
    /// </summary>
    public DbSet<LegalDownload> LegalDownloads { get; set; }

    /// <summary>
    /// DbSet cho CatalogSource - Nguồn danh mục HIS đã nạp (mỗi file Excel một bản ghi).
    /// Cho phép nạp lại/gỡ bỏ từng danh mục khi danh mục thay đổi.
    /// </summary>
    public DbSet<CatalogSource> CatalogSources { get; set; }

    /// <summary>
    /// DbSet cho CatalogItem - Các mục danh mục (thuốc, DVKT, CĐHA, XN, giường,
    /// và danh mục tham chiếu) dùng đối chiếu khi kiểm tra hồ sơ XML 130.
    /// </summary>
    public DbSet<CatalogItem> CatalogItems { get; set; }

    /// <summary>
    /// DbSet cho Facility - cây đơn vị (cơ sở KCB) cha ↔ con ↔ cháu, dùng để
    /// xác định đơn vị con được mượn danh mục HIS của đơn vị cấp trên hay không.
    /// </summary>
    public DbSet<Facility> Facilities { get; set; }

    /// <summary>DbSet cho Permission - danh mục quyền chi tiết (seed cố định).</summary>
    public DbSet<Permission> Permissions { get; set; }

    /// <summary>DbSet cho RolePermission - bảng nối Role↔Permission.</summary>
    public DbSet<RolePermission> RolePermissions { get; set; }

    /// <summary>DbSet cho RefreshToken - token làm mới phiên đăng nhập (lưu hash).</summary>
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    /// <summary>DbSet cho AuditLog - nhật ký kiểm toán các hành động quan trọng.</summary>
    public DbSet<AuditLog> AuditLogs { get; set; }

    /// <summary>DbSet cho UsageEvent - lượt sử dụng (hỏi đáp AI, kiểm tra XML 130) phục vụ thống kê dashboard.</summary>
    public DbSet<UsageEvent> UsageEvents { get; set; }

    /// <summary>DbSet cho FacilityLicense - hợp đồng/giấy phép sử dụng gắn vào một nút cây đơn vị.</summary>
    public DbSet<FacilityLicense> FacilityLicenses { get; set; }

    /// <summary>DbSet cho BillingRecord - sổ tính tiền (tách khỏi UsageEvents vì yêu cầu độ tin cậy khác hẳn).</summary>
    public DbSet<BillingRecord> BillingRecords { get; set; }

    /// <summary>DbSet cho BillingInvoice - bản chốt sổ từng kỳ, bất biến sau khi tạo.</summary>
    public DbSet<BillingInvoice> BillingInvoices { get; set; }

    /// <summary>
    /// Configure DbContext options.
    /// 
    /// Suppresses PendingModelChangesWarning which can be triggered by JSONB Metadata dictionary
    /// comparisons in certain EF Core versions. The model is already deterministic with static
    /// seed data, so this warning can be safely ignored.
    /// </summary>
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.ConfigureWarnings(warnings =>
            warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    /// <summary>
    /// Configure entity models using Fluent API.
    ///
    /// Configuration:
    /// 1. Primary keys
    /// 2. Indexes for query performance
    /// 3. Constraints and defaults
    /// 4. Column mappings (if needed)
    /// 5. Relationships (if needed)
    ///
    /// Current configuration:
    /// - KnowledgeItem: Id as primary key
    /// - Indexes: Category, Code (for search queries)
    /// - Constraints: Not null validations
    /// - Defaults: IsActive = true
    /// - Metadata: JSONB column
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure KnowledgeItem entity
        modelBuilder.Entity<KnowledgeItem>(entity =>
        {
            // Primary key
            entity.HasKey(e => e.Id);

            // Indexes for search performance
            entity.HasIndex(e => e.Category)
                .HasName("IX_KnowledgeItems_Category");

            entity.HasIndex(e => e.Code)
                .HasName("IX_KnowledgeItems_Code");

            // Property configurations
            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Category)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(e => e.Code)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(e => e.Content)
                .IsRequired();

            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.Metadata)
                .HasColumnType("jsonb")
                .IsRequired(false);

            // Table configuration
            entity.ToTable("knowledge_items", schema: "public");
        });

        // Configure MedicalDocument entity (RAG)
        modelBuilder.Entity<LegalDownload>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(600);
            entity.Property(e => e.DocNumber).HasMaxLength(100);
            entity.Property(e => e.SourceUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.DownloadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            // vbpl bản mới định danh văn bản bằng GUID, bản cũ bằng số — lưu chuỗi
            entity.Property(e => e.ItemId).IsRequired().HasMaxLength(100);
            // Mỗi văn bản vbpl chỉ một bản ghi — tải lại thì cập nhật nội dung
            entity.HasIndex(e => e.ItemId).IsUnique();
            entity.ToTable("legal_downloads", schema: "public");
        });

        modelBuilder.Entity<UsageEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(30);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.FacilityCode).IsRequired().HasMaxLength(30);
            entity.Property(e => e.StaffCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Preview).HasMaxLength(400);
            // Thống kê luôn lọc theo khoảng thời gian (+ loại sự kiện)
            entity.HasIndex(e => new { e.CreatedAt, e.EventType });
            // Bảng kê theo đơn vị lọc trước hết theo mã cơ sở rồi mới tới khoảng ngày
            entity.HasIndex(e => new { e.FacilityCode, e.CreatedAt });
            entity.ToTable("usage_events", schema: "public");
        });

        modelBuilder.Entity<FacilityLicense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.FacilityCode).IsRequired().HasMaxLength(20);
            entity.Property(e => e.KeyHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.KeyPrefix).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Plan).IsRequired().HasMaxLength(100);
            entity.Property(e => e.BasePrice).HasColumnType("numeric(18,2)");
            entity.Property(e => e.OverageUnitPrice).HasColumnType("numeric(18,2)");
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.CreatedBy).HasMaxLength(256);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Xóa đơn vị thì giấy phép của nó cũng hết nghĩa
            entity.HasOne(e => e.Facility)
                .WithMany()
                .HasForeignKey(e => e.FacilityId)
                .OnDelete(DeleteBehavior.Cascade);

            // Mọi request đều tra bằng băm khóa — đây là truy vấn nóng nhất của bảng
            entity.HasIndex(e => e.KeyHash).IsUnique();
            entity.HasIndex(e => e.FacilityCode);
            entity.ToTable("facility_licenses", schema: "public");
        });

        modelBuilder.Entity<BillingRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.BilledFacilityCode).IsRequired().HasMaxLength(20);
            entity.Property(e => e.UsedByFacilityCode).IsRequired().HasMaxLength(20);
            entity.Property(e => e.EventType).IsRequired().HasMaxLength(30);
            entity.Property(e => e.RecordKey).IsRequired().HasMaxLength(120);
            entity.Property(e => e.StaffCode).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.License)
                .WithMany()
                .HasForeignKey(e => e.LicenseId)
                .OnDelete(DeleteBehavior.Cascade);

            // KHỬ TRÙNG: nhân viên sửa hồ sơ rồi kiểm lại ba lần vẫn chỉ tính tiền một lần.
            // Ràng buộc đặt ở DB chứ không kiểm bằng code vì nhiều request chạy song song.
            entity.HasIndex(e => new { e.LicenseId, e.PeriodMonth, e.EventType, e.RecordKey })
                .IsUnique()
                .HasDatabaseName("UX_billing_records_dedup");
            entity.HasIndex(e => new { e.BilledFacilityCode, e.PeriodMonth });
            entity.ToTable("billing_records", schema: "public");
        });

        modelBuilder.Entity<BillingInvoice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.FacilityCode).IsRequired().HasMaxLength(20);
            entity.Property(e => e.FacilityName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Plan).IsRequired().HasMaxLength(100);
            entity.Property(e => e.BasePrice).HasColumnType("numeric(18,2)");
            entity.Property(e => e.OverageUnitPrice).HasColumnType("numeric(18,2)");
            entity.Property(e => e.TotalAmount).HasColumnType("numeric(18,2)");
            entity.Property(e => e.ClosedBy).HasMaxLength(256);
            entity.Property(e => e.ClosedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Giấy phép bị xóa vẫn PHẢI giữ hóa đơn cũ — chứng từ đã phát hành
            entity.HasOne(e => e.License)
                .WithMany()
                .HasForeignKey(e => e.LicenseId)
                .OnDelete(DeleteBehavior.Restrict);

            // Một kỳ của một giấy phép chỉ chốt được đúng một lần
            entity.HasIndex(e => new { e.LicenseId, e.PeriodMonth }).IsUnique();
            entity.ToTable("billing_invoices", schema: "public");
        });

        modelBuilder.Entity<MedicalDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.DocType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DocNumber).HasMaxLength(100);
            entity.Property(e => e.IssuedBy).HasMaxLength(255);
            entity.Property(e => e.SourceFileName).HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.DocType);
            entity.ToTable("medical_documents", schema: "public");
        });

        // Configure DocumentChunk entity với tsvector full-text search
        modelBuilder.Entity<DocumentChunk>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Content).IsRequired();

            entity.HasOne(e => e.Document)
                .WithMany(d => d.Chunks)
                .HasForeignKey(e => e.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.DocumentId);

            // Cột tsvector sinh tự động từ Content (config 'simple' — tiếng Việt
            // không có stemmer built-in nên dùng simple + kết hợp ILIKE khi tìm kiếm)
            entity.HasGeneratedTsVectorColumn(
                    e => e.SearchVector!,
                    "simple",
                    e => new { e.Content })
                .HasIndex(e => e.SearchVector)
                .HasMethod("GIN");

            entity.ToTable("document_chunks", schema: "public");
        });

        // Configure CatalogSource entity (danh mục HIS)
        modelBuilder.Entity<CatalogSource>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CatalogType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FacilityCode).HasMaxLength(20);
            entity.Property(e => e.ContentHash).HasMaxLength(64);
            entity.Property(e => e.ImportedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasIndex(e => new { e.CatalogType, e.FacilityCode });
            entity.ToTable("catalog_sources", schema: "public");
        });

        // Configure CatalogItem entity
        modelBuilder.Entity<CatalogItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.CatalogType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FacilityCode).HasMaxLength(20);
            entity.Property(e => e.Code).HasMaxLength(100);
            entity.Property(e => e.HisCode).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(1024);
            entity.Property(e => e.Unit).HasMaxLength(100);
            entity.Property(e => e.PriceBhyt).HasColumnType("numeric(18,2)");
            entity.Property(e => e.PriceHospital).HasColumnType("numeric(18,2)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Metadata).HasColumnType("jsonb");

            entity.HasOne(e => e.Source)
                .WithMany(s => s.Items)
                .HasForeignKey(e => e.SourceId)
                .OnDelete(DeleteBehavior.Cascade);

            // Index phục vụ tra cứu khi kiểm tra hồ sơ: theo loại + cơ sở + mã DMDC
            entity.HasIndex(e => new { e.CatalogType, e.FacilityCode, e.Code });
            entity.HasIndex(e => e.SourceId);
            entity.ToTable("catalog_items", schema: "public");
        });

        // Configure Facility entity (cây đơn vị cha ↔ con ↔ cháu)
        modelBuilder.Entity<Facility>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.InheritCatalogFromParent).HasDefaultValue(true);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Cha bị xóa thì con thành đơn vị gốc chứ không biến mất theo
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.SetNull);

            // Mã cơ sở KCB là khóa nối với danh mục và file XML 130 nên phải duy nhất
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.ParentId);
            entity.ToTable("facilities", schema: "public");
        });

        // ===== Cấu hình module xác thực + RBAC =====
        ConfigureAuth(modelBuilder);

        // Seed knowledge data for all categories with metadata
        SeedKnowledgeData(modelBuilder);
    }

    /// <summary>
    /// Cấu hình các entity của module xác thực và phân quyền RBAC.
    /// Đổi tên bảng Identity sang snake_case (schema public) cho đồng nhất với
    /// các bảng nghiệp vụ hiện có, cấu hình khóa kép và index duy nhất.
    /// </summary>
    private static void ConfigureAuth(ModelBuilder modelBuilder)
    {
        // Đổi tên bảng Identity sang snake_case cho đồng nhất với các bảng khác
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_users", schema: "public");
            entity.Property(e => e.FullName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });
        modelBuilder.Entity<AppRole>(entity =>
        {
            entity.ToTable("app_roles", schema: "public");
            entity.Property(e => e.Description).HasMaxLength(500);
        });
        modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<Guid>>()
            .ToTable("app_user_roles", schema: "public");
        modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<Guid>>()
            .ToTable("app_user_claims", schema: "public");
        modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<Guid>>()
            .ToTable("app_user_logins", schema: "public");
        modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<Guid>>()
            .ToTable("app_user_tokens", schema: "public");
        modelBuilder.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<Guid>>()
            .ToTable("app_role_claims", schema: "public");

        // Permission: mã quyền duy nhất
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Group).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.ToTable("permissions", schema: "public");
        });

        // RolePermission: khóa chính kép (RoleId, PermissionId)
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.HasOne(e => e.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.PermissionId);
            entity.ToTable("role_permissions", schema: "public");
        });

        // RefreshToken: lưu hash, index theo user và hash
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(128);
            entity.Property(e => e.ReplacedByTokenHash).HasMaxLength(128);
            entity.Property(e => e.CreatedByIp).HasMaxLength(64);
            entity.Ignore(e => e.IsActive);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.TokenHash);
            entity.HasIndex(e => e.UserId);
            entity.ToTable("refresh_tokens", schema: "public");
        });

        // AuditLog: index theo user và thời gian
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            entity.Property(e => e.UserName).HasMaxLength(256);
            entity.Property(e => e.EntityType).HasMaxLength(100);
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasMaxLength(64);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Action);
            entity.ToTable("audit_logs", schema: "public");
        });
    }

    /// <summary>
    /// Seed initial knowledge data for all categories.
    ///
    /// Purpose:
    /// - Populate database with sample data for testing
    /// - Support gender-based validation rules
    /// - Provide reference data for validation pipeline
    /// - Test different knowledge categories
    ///
    /// Data Categories:
    /// - ICD: International Classification of Diseases
    /// - Procedure: Medical procedures/techniques (DVKT)
    /// - Drug: Medications and pharmaceuticals
    /// - Rule: Insurance rules, guidelines, business logic
    ///
    /// Notes:
    /// - Seed data should be minimal for testing
    /// - Real data loaded in migrations or separate seeding scripts
    /// - Future: Load seed data from JSON files
    /// </summary>
    private static void SeedKnowledgeData(ModelBuilder modelBuilder)
    {
        // Use a fixed UTC datetime to ensure deterministic model snapshot for EF Core migrations
        // This prevents "PendingModelChangesWarning" caused by dynamic DateTime.UtcNow in HasData()
        var now = new DateTime(2025, 1, 13, 10, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<KnowledgeItem>().HasData(
            // ===== ICD Category (5 samples) =====

            // ICD O80 - Đẻ thường một thai (Normal vaginal delivery)
            // Only applicable for female patients
            new KnowledgeItem
            {
                Id = 1,
                Category = "ICD",
                Code = "O80",
                Name = "Đẻ thường một thai",
                Content = "Chỉ áp dụng cho bệnh nhân nữ. Tình trạng đẻ thường, không có biến chứng, cho một thai.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", "Female" },
                    { "minAge", 18 },
                    { "maxAge", null },
                    { "pregnancyOnly", true },
                    { "description", "Normal vaginal delivery for pregnancy" }
                }
            },

            // ICD N40 - Phì đại tuyến tiền liệt (Benign prostatic hyperplasia)
            // Only applicable for male patients
            new KnowledgeItem
            {
                Id = 2,
                Category = "ICD",
                Code = "N40",
                Name = "Phì đại tuyến tiền liệt",
                Content = "Chỉ áp dụng cho bệnh nhân nam. Phì đại tuyến tiền liệt (Benign Prostatic Hyperplasia - BPH) là tình trạng tuyến tiền liệt phì đại do tuổi tác.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", "Male" },
                    { "minAge", 50 },
                    { "maxAge", null },
                    { "pregnancyOnly", false },
                    { "description", "Benign prostatic hyperplasia" }
                }
            },

            // ICD A00 - Cholera
            new KnowledgeItem
            {
                Id = 3,
                Category = "ICD",
                Code = "A00",
                Name = "Tả (Cholera)",
                Content = "Bệnh truyền nhiễm do vi khuẩn Vibrio cholerae gây ra. Gây tiêu chảy cấp, mất nước và điện giải.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", null },
                    { "minAge", null },
                    { "maxAge", null },
                    { "pregnancyOnly", false },
                    { "description", "Infectious disease caused by Vibrio cholerae" }
                }
            },

            // ICD I10 - Hypertension
            new KnowledgeItem
            {
                Id = 4,
                Category = "ICD",
                Code = "I10",
                Name = "Tăng huyết áp nguyên phát",
                Content = "Tăng huyết áp mạn tính không rõ nguyên nhân. Yếu tố nguy hiểm: tuổi, gia đình, cân nặng, chế độ ăn.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", null },
                    { "minAge", 30 },
                    { "maxAge", null },
                    { "pregnancyOnly", false },
                    { "description", "Essential hypertension" }
                }
            },

            // ICD E10 - Diabetes Type 1
            new KnowledgeItem
            {
                Id = 5,
                Category = "ICD",
                Code = "E10",
                Name = "Bệnh đái tháo đường típ 1",
                Content = "Đái tháo đường típ 1 do tế bào beta tụy bị phá hủy dẫn đến thiếu insulin tuyệt đối. Thường khởi phát ở trẻ em và người trẻ; điều trị bắt buộc bằng insulin.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", null },
                    { "minAge", null },
                    { "maxAge", null },
                    { "pregnancyOnly", false },
                    { "description", "Type 1 diabetes mellitus" }
                }
            },

            // ===== Procedure Category (3 samples) =====

            // DVKT - Nạo hút thai
            new KnowledgeItem
            {
                Id = 6,
                Category = "Procedure",
                Code = "DVKT001",
                Name = "Nạo hút thai",
                Content = "Thủ thuật nạo hút thai trong 3 tháng đầu thai kỳ. Phải khám phụ khoa và siêu âm xác định tuổi thai trước khi thực hiện; bắt buộc có sự đồng ý bằng văn bản của người bệnh.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", "Female" },
                    { "minAge", 18 },
                    { "maxAge", null },
                    { "pregnancyOnly", true },
                    { "riskLevel", "high" }
                }
            },

            // DVKT - Chọc dịch ối
            new KnowledgeItem
            {
                Id = 7,
                Category = "Procedure",
                Code = "DVKT002",
                Name = "Chọc dịch ối",
                Content = "Thủ tục lấy mẫu dịch ối để chẩn đoán dị tật thai nhi. Được thực hiện từ tuần thứ 15 của thai kỳ.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", "Female" },
                    { "minAge", 18 },
                    { "maxAge", null },
                    { "pregnancyOnly", true },
                    { "riskLevel", "medium" },
                    { "gestation_week_min", 15 }
                }
            },

            // DVKT - Siêu âm sản khoa
            new KnowledgeItem
            {
                Id = 8,
                Category = "Procedure",
                Code = "DVKT003",
                Name = "Siêu âm sản khoa",
                Content = "Kỹ thuật hình ảnh không xâm lấn để theo dõi thai kỳ và sức khỏe của thai nhi.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "gender", "Female" },
                    { "minAge", null },
                    { "maxAge", null },
                    { "pregnancyOnly", true },
                    { "riskLevel", "low" }
                }
            },

            // ===== Drug Category (3 samples) =====

            // Drug - Aspirin
            new KnowledgeItem
            {
                Id = 9,
                Category = "Drug",
                Code = "ASPIRIN",
                Name = "Aspirin 100mg",
                Content = "Chống đông máu. Liều phòng ngừa: 100-325mg/ngày. Chống chỉ định: thai kỳ, chảy máu.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "safetyCategory", "D" },
                    { "pregnancyOnly", false },
                    { "minAge", 18 },
                    { "maxAge", null },
                    { "contraindications", new object[] { "pregnancy", "bleeding_disorder" } }
                }
            },

            // Drug - Metformin
            new KnowledgeItem
            {
                Id = 10,
                Category = "Drug",
                Code = "METFORMIN",
                Name = "Metformin 500mg",
                Content = "Điều trị bệnh tiểu đường loại 2. Liều: 500-1000mg 2-3 lần/ngày. Tác dụng phụ: rối loạn tiêu hóa.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "safetyCategory", "B" },
                    { "pregnancyOnly", false },
                    { "minAge", null },
                    { "maxAge", null },
                    { "contraindications", new object[] { "kidney_disease", "liver_disease" } }
                }
            },

            // Drug - Amoxicillin
            new KnowledgeItem
            {
                Id = 11,
                Category = "Drug",
                Code = "AMOXICILLIN",
                Name = "Amoxicillin 500mg",
                Content = "Kháng sinh beta-lactam. Điều trị nhiễm trùng vi khuẩn. Liều: 500mg 3 lần/ngày. Có thể sử dụng trong thai kỳ.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "safetyCategory", "A" },
                    { "pregnancyOnly", false },
                    { "minAge", null },
                    { "maxAge", null },
                    { "contraindications", new object[] { "penicillin_allergy" } }
                }
            },

            // ===== Rule Category (3 samples) =====

            // Rule - Insurance Coverage for ICD O80
            new KnowledgeItem
            {
                Id = 12,
                Category = "Rule",
                Code = "RULE_O80_COVERAGE",
                Name = "Bảo hiểm cho ICD O80",
                Content = "ICD O80 được bảo hiểm y tế chi trả 100% chi phí. Yêu cầu: giấy khám sức khỏe trước sinh, hồ sơ hoàn chỉnh.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "coverage_percent", 100 },
                    { "applicableTo", "O80" },
                    { "requiresApproval", false }
                }
            },

            // Rule - Age Restriction for Drug
            new KnowledgeItem
            {
                Id = 13,
                Category = "Rule",
                Code = "RULE_DRUG_AGE",
                Name = "Hạn chế tuổi với thuốc",
                Content = "Một số thuốc không được sử dụng cho trẻ em dưới 18 tuổi. Cần kiểm tra hướng dẫn sử dụng từng loại thuốc.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "minAge", 18 },
                    { "applicableTo", "all_drugs" },
                    { "riskLevel", "high" }
                }
            },

            // Rule - Pregnancy Safety
            new KnowledgeItem
            {
                Id = 14,
                Category = "Rule",
                Code = "RULE_PREGNANCY_SAFETY",
                Name = "An toàn trong thai kỳ",
                Content = "Nhiều thuốc và thủ tục bị chống chỉ định trong thai kỳ. Phải kiểm tra safety category FDA trước khi điều trị.",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Metadata = new Dictionary<string, object>
                {
                    { "pregnancyOnly", true },
                    { "riskLevel", "high" },
                    { "requiresApproval", true }
                }
            }
        );
    }
}
