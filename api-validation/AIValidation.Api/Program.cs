using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AIValidation.Api.Authorization;
using AIValidation.Api.Configuration;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities.Auth;
using AIValidation.Api.Data.Repositories;
using AIValidation.Api.Data.Repositories.Interfaces;
using AIValidation.Api.Data.Seed;
using AIValidation.Api.Middleware;
using AIValidation.Api.Providers;
using AIValidation.Api.Providers.Catalog;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.ICD.Interfaces;
using AIValidation.Api.Providers.ICD.Parsers;
using AIValidation.Api.Providers.ICD.Services;
using AIValidation.Api.Providers.Interfaces;
using AIValidation.Api.Providers.Knowledge.Sources;
using AIValidation.Api.Providers.LLM;
using AIValidation.Api.Providers.Processing;
using AIValidation.Api.Providers.Rules.Contact;
using AIValidation.Api.Providers.Rules.Demographics;
using AIValidation.Api.Providers.Rules.ICD;
using AIValidation.Api.Providers.Xml130;
using AIValidation.Api.Providers.Xml130.CrossRules;
using AIValidation.Api.Providers.Xml130.Interfaces;
using AIValidation.Api.Providers.Xml130.Rules;
using AIValidation.Api.Services;
using AIValidation.Api.Services.Auth;
using AIValidation.Api.Services.Catalog;
using AIValidation.Api.Services.Interfaces;
using AIValidation.Api.Services.Rag;
using AIValidation.Api.Services.Xml130;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Nhận lô nhiều file XML 130 (cả tháng) trong một request multipart:
// mặc định ASP.NET giới hạn multipart 128MB — nới lên 1GB.
// (Giới hạn tầng IIS/IIS Express nới trong web.config; tầng endpoint bằng [RequestSizeLimit].)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024L * 1024 * 1024; // 1 GB
    options.ValueLengthLimit = int.MaxValue;
});

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enable case-insensitive property binding
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        // Enable enum parsing from strings with case-insensitive matching
        // Using custom converter that allows both "Change" and "change" to map to Change enum
        var enumConverter = new JsonStringEnumConverter(namingPolicy: JsonNamingPolicy.CamelCase, allowIntegerValues: false);
        options.JsonSerializerOptions.Converters.Add(enumConverter);
    })
    // Configure model binding error response
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            return new BadRequestObjectResult(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                title = "One or more validation errors occurred.",
                status = 400,
                errors = errors,
                traceId = context.HttpContext.TraceIdentifier
            });
        };
    });

// ==================== CORS ====================
// Hai policy tách bạch, KHÔNG mở toàn cục:
//   - "WebAdmin" (mặc định cho mọi endpoint): chỉ nhận origin khai trong cấu hình
//     Cors:WebAdminOrigins. Đây là nơi có các endpoint quản trị /api/admin, /api/auth.
//   - "Extension": mở cho mọi origin, chỉ gắn bằng [EnableCors("Extension")] lên đúng
//     4 controller mà extension gọi. Không thu hẹp được vì origin của extension là
//     chrome-extension://<id>, mà id đổi theo từng máy cài bản unpacked.
// Token của web-admin nằm ở localStorage và gửi qua header Authorization (xem
// web-admin/src/app/core/token.store.ts), không dùng cookie phiên, nên không bật
// AllowCredentials — trình duyệt không tự đính kèm gì vào request chéo origin.
var webAdminOrigins = builder.Configuration
    .GetSection("Cors:WebAdminOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (webAdminOrigins.Length > 0)
        {
            policy.WithOrigins(webAdminOrigins).AllowAnyHeader().AllowAnyMethod();
        }
    });

    options.AddPolicy("Extension", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ASP.NET Core 10 OpenAPI support
builder.Services.AddOpenApi();

// Register Entity Framework Core with PostgreSQL
// EnableDynamicJson: bắt buộc từ Npgsql 8 để map Dictionary<,> vào cột jsonb
// (Metadata của KnowledgeItem, CatalogItem). Thiếu dòng này, mọi thao tác
// đọc/ghi jsonb ném InvalidCastException lúc runtime.
var connectionString = builder.Configuration.GetConnectionString("KnowledgeDatabase");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Thiếu chuỗi kết nối CSDL. Đặt bằng một trong hai cách: " +
        "dotnet user-secrets set \"ConnectionStrings:KnowledgeDatabase\" \"...\" (máy dev), " +
        "hoặc biến môi trường ConnectionStrings__KnowledgeDatabase (Docker/K8s).");
}

var npgsqlDataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
npgsqlDataSourceBuilder.EnableDynamicJson();
var npgsqlDataSource = npgsqlDataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(npgsqlDataSource);
});

// ==================== XÁC THỰC + PHÂN QUYỀN RBAC ====================
// Cấu hình JWT
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var (jwtKey, jwtIsDevFallback) = JwtKeyResolver.Resolve(jwtOptions);
if (jwtIsDevFallback)
{
    // Cảnh báo: đang dùng khóa dev tự sinh (theo máy). KHÔNG dùng cho môi trường thật.
    Console.WriteLine("[CẢNH BÁO] Jwt:SecretKey trống — đang dùng khóa dev tự sinh theo máy. " +
        "Đặt Jwt:SecretKey (>=32 ký tự) trước khi triển khai thật.");
}

// ASP.NET Core Identity (hash mật khẩu PBKDF2, lockout, token email/reset)
builder.Services.AddIdentityCore<AppUser>(options =>
{
    // Mật khẩu: tối thiểu 8 ký tự, yêu cầu có chữ + số
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;

    // Khóa tài khoản khi đăng nhập sai nhiều lần
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);

    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
})
    .AddRoles<AppRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// Xác thực: mặc định JWT Bearer; thêm cookie ngoài (external) cho luồng OAuth
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddCookie(IdentityConstants.ExternalScheme) // cookie tạm giữ thông tin đăng nhập ngoài
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidAudience = jwtOptions.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(jwtKey),
        ClockSkew = TimeSpan.FromSeconds(30),
    };
});

// Đăng nhập ngoài CÓ ĐIỀU KIỆN — chỉ bật khi có ClientId trong cấu hình.
// Không cấu hình thì bỏ qua, app vẫn chạy (endpoint external trả 400).
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
if (!string.IsNullOrWhiteSpace(googleClientId))
{
    builder.Services.AddAuthentication().AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? string.Empty;
        options.SignInScheme = IdentityConstants.ExternalScheme;
    });
}

var microsoftClientId = builder.Configuration["Authentication:Microsoft:ClientId"];
if (!string.IsNullOrWhiteSpace(microsoftClientId))
{
    builder.Services.AddAuthentication().AddMicrosoftAccount(options =>
    {
        options.ClientId = microsoftClientId;
        options.ClientSecret = builder.Configuration["Authentication:Microsoft:ClientSecret"] ?? string.Empty;
        options.SignInScheme = IdentityConstants.ExternalScheme;
    });
}

// Phân quyền: policy provider động cho "perm:*" + handler kiểm tra claim
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Dịch vụ auth (interface-first, DI)
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IPermissionResolver, PermissionResolver>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IUsageRecorder, UsageRecorder>();
builder.Services.AddScoped<IAuthService, AuthService>();
// Gửi email (đặt lại mật khẩu) qua SMTP
builder.Services.Configure<AIValidation.Api.Models.Auth.EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IUserAdminService, UserAdminService>();
builder.Services.AddScoped<IRoleAdminService, RoleAdminService>();
// ==================== HẾT PHẦN XÁC THỰC + RBAC ====================

// Register Repository Pattern
builder.Services.AddScoped<IKnowledgeRepository, KnowledgeRepository>();

// Lưu file gốc đã nạp (văn bản tri thức, danh mục HIS) để xem/tải lại
builder.Services.AddSingleton<IFileStorage, FileStorageService>();

// Register HttpClient for AI Providers via IHttpClientFactory
// Each provider is registered with its own typed HttpClient
// The factory (LLMProvider) will select the appropriate provider based on configuration
// Timeout đặt vô hạn ở tầng HttpClient: thời gian chờ thật do CTS trong provider
// quyết định theo LLMOptions.TimeoutSeconds (nếu không, trần mặc định 100s của
// HttpClient sẽ nổ trước — model local chạy CPU cần hơn 100s là lỗi ngay).
builder.Services.AddHttpClient<OpenRouterProvider>(c => c.Timeout = Timeout.InfiniteTimeSpan);
builder.Services.AddHttpClient<OllamaProvider>(c => c.Timeout = Timeout.InfiniteTimeSpan);

// Register Configuration Options from appsettings.json
builder.Services.Configure<LLMOptions>(builder.Configuration.GetSection("LLM"));

// Cấu hình LLM đổi được lúc runtime (online OpenRouter / offline Ollama) từ web admin.
// Override IOptions<LLMOptions> bằng bản hiệu lực từ ILlmSettings: mọi consumer
// (providers, AssistantService, reranker, validation) là scoped/transient nên tự nhận
// cấu hình mới nhất mỗi request — không cần restart, không sửa consumer nào.
builder.Services.AddSingleton<ILlmSettings, LlmSettingsService>();
builder.Services.AddTransient<IOptions<LLMOptions>>(sp =>
    Options.Create(sp.GetRequiredService<ILlmSettings>().Current));

// Cấu hình extension (hình hài robot + ngưỡng hệ sinh hoạt) đổi được từ web-admin,
// extension nạp qua GET /api/extension-config khi trang HIS tải xong (task-003).
builder.Services.AddSingleton<IExtensionConfigStore, ExtensionConfigService>();
builder.Services.Configure<PromptOptions>(builder.Configuration.GetSection("Prompt"));
builder.Services.Configure<KnowledgeOptions>(builder.Configuration.GetSection("Knowledge"));
builder.Services.Configure<ValidationOptions>(builder.Configuration.GetSection("Validation"));

// Register Knowledge Sources
builder.Services.AddScoped<IKnowledgeSource>(provider =>
{
    var options = provider.GetRequiredService<IOptions<KnowledgeOptions>>();
    var knowledgeFolder = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory,
        options.Value.Folder);
    return new FileKnowledgeSource(knowledgeFolder);
});

// Register Validation Rules (Demographics)
builder.Services.AddScoped<DateOfBirthValidationRule>();
builder.Services.AddScoped<FullNameValidationRule>();
builder.Services.AddScoped<GenderValidationRule>();
builder.Services.AddScoped<PatientIdentityRequirementRule>();
builder.Services.AddScoped<NationalIdFormatValidationRule>();

// Register Validation Rules (Contact Information)
builder.Services.AddScoped<RequiredContactInformationRule>();
builder.Services.AddScoped<PhoneNumberFormatValidationRule>();
builder.Services.AddScoped<EmailFormatValidationRule>();

// Register ICD Services and Rules (Task-026 & Task-027)
builder.Services.AddScoped<IcdJsonParser>();
builder.Services.AddScoped<IIcdImportService, IcdImportService>();
builder.Services.AddScoped<IIcdProvider, IcdProvider>();

// Register ICD Sync Service (Task-030): đồng bộ danh mục ICD từ nguồn công bố
// (tracuu-icd10.web.app) theo version — tra cứu lúc validate vẫn dùng file local
builder.Services.AddHttpClient<IIcdSyncService, IcdSyncService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(120);
});
// Lịch tự động đồng bộ ICD: cấu hình từ web admin (bật/tắt + giờ chạy hằng ngày,
// lưu bền Storage/icd-sync-settings.json), background service kiểm tra mỗi phút
builder.Services.AddSingleton<IIcdSyncSchedule, IcdSyncScheduleService>();
builder.Services.AddHostedService<IcdSyncBackgroundService>();

// Register ICD Validation Rules
builder.Services.AddScoped<IcdExistsRule>();
builder.Services.AddScoped<IcdActiveRule>();
builder.Services.AddScoped<IcdGenderCompatibilityRule>();
builder.Services.AddScoped<IcdDeathOnlyRule>();
builder.Services.AddScoped<IcdPrimaryDiagnosisRule>();
builder.Services.AddScoped<IcdAgeCompatibilityRule>();

// Register Validation Pipeline Services
builder.Services.AddScoped<IPromptLoader, PromptLoader>();
builder.Services.AddScoped<IPlaceholderEngine, PlaceholderEngine>();
builder.Services.AddScoped<IPromptTemplateLoader, PromptTemplateLoader>();

builder.Services.AddScoped<IRuleEngine, RuleEngine>(provider =>
{
    // Collect all registered IRule implementations
    var rules = new List<IRule>
    {
        provider.GetRequiredService<DateOfBirthValidationRule>(),
        provider.GetRequiredService<FullNameValidationRule>(),
        provider.GetRequiredService<GenderValidationRule>(),
        provider.GetRequiredService<PatientIdentityRequirementRule>(),
        provider.GetRequiredService<NationalIdFormatValidationRule>(),
        provider.GetRequiredService<RequiredContactInformationRule>(),
        provider.GetRequiredService<PhoneNumberFormatValidationRule>(),
        provider.GetRequiredService<EmailFormatValidationRule>(),

        // ICD Validation Rules - Ordered by Priority
        // Priority 1: ICD must exist first (if not exist, stop checking)
        provider.GetRequiredService<IcdExistsRule>(),
        // Priority 2: Critical errors (cancelled, gender mismatch, death-only)
        provider.GetRequiredService<IcdActiveRule>(),
        provider.GetRequiredService<IcdGenderCompatibilityRule>(),
        provider.GetRequiredService<IcdDeathOnlyRule>(),
        // Priority 3: Other errors (not primary diagnosis, age mismatch)
        // Lưu ý: kiểm tra giới tính chỉ do IcdGenderCompatibilityRule đảm nhiệm.
        // IcdGenderRule cũ trùng chức năng, gây báo 2 lần cùng một lỗi — đã bỏ.
        provider.GetRequiredService<IcdPrimaryDiagnosisRule>(),
        provider.GetRequiredService<IcdAgeCompatibilityRule>()
    };

    var logger = provider.GetRequiredService<ILogger<RuleEngine>>();
    return new RuleEngine(rules, logger);
});
builder.Services.AddScoped<IValidationService, ValidationService>();
builder.Services.AddScoped<IKnowledgeProvider, KnowledgeProvider>();
builder.Services.AddScoped<IPromptBuilder, PromptBuilder>();

// Register LLM Provider Framework
// LLMProvider is a factory that selects the appropriate IAIProvider implementation
// based on LLMOptions.Provider configuration setting.
// Supports multiple providers: "openrouter" (default), "ollama", etc.
// ValidationService receives ILLMProvider (factory) and doesn't know which provider is running.
builder.Services.AddScoped<ILLMProvider>(provider =>
{
    var openRouterProvider = provider.GetRequiredService<OpenRouterProvider>();
    var ollamaProvider = provider.GetRequiredService<OllamaProvider>();
    var logger = provider.GetRequiredService<ILogger<LLMProvider>>();
    var options = provider.GetRequiredService<IOptions<LLMOptions>>();

    // Register both providers in a collection for the factory to choose from
    var providers = new List<IAIProvider> { openRouterProvider, ollamaProvider };

    return new LLMProvider(providers, options, logger);
});

// Register Response Processing Framework
builder.Services.AddScoped<IJsonExtractor, JsonExtractor>();
builder.Services.AddScoped<IJsonDeserializer, JsonDeserializer>();
builder.Services.AddScoped<IResponseProcessor, ResponseProcessor>();

// ============================================================================
// Chống spam request (Rate limiting) — .NET RateLimiter
// - Giới hạn CHUNG theo IP cho toàn API (100 req/phút/IP) để chặn quét/DoS nhẹ.
// - Chính sách SIẾT riêng cho các endpoint nhạy cảm: đăng nhập, quên mật khẩu,
//   hỏi đáp AI (tốn LLM), nạp đặc tả (tốn CPU parse Excel).
// - Vượt ngưỡng: trả HTTP 429 + header Retry-After (giây) + thông báo tiếng Việt.
// Lấy IP thật ưu tiên X-Forwarded-For vì sau ingress/LB thì RemoteIpAddress là
// IP nội bộ của proxy (mọi client sẽ chung 1 IP nếu chỉ dựa RemoteIpAddress).
// ============================================================================
// Ngưỡng có thể chỉnh từ web admin lúc runtime (không cần restart).
builder.Services.AddSingleton<IRateLimitSettings, RateLimitSettingsService>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Giới hạn chung: N request / phút / IP, áp cho MỌI request. Ngưỡng đọc động
    // từ IRateLimitSettings; Generation gắn vào khóa để admin đổi là áp ngay.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var settings = context.RequestServices.GetRequiredService<IRateLimitSettings>();
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{GetClientIp(context)}|g{settings.Generation}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = settings.State.GlobalPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
    });

    // Các chính sách siết cho endpoint nhạy cảm (gắn bằng [EnableRateLimiting]).
    AddIpFixedWindowPolicy(options, "rl-login", s => s.LoginPerMinute);
    AddIpFixedWindowPolicy(options, "rl-forgot-password", s => s.ForgotPasswordPerMinute);
    AddIpFixedWindowPolicy(options, "rl-ask", s => s.AskPerMinute);
    AddIpFixedWindowPolicy(options, "rl-import", s => s.ImportPerMinute);

    options.OnRejected = async (context, cancellationToken) =>
    {
        var retryAfterSeconds = 60;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            retryAfterSeconds = (int)Math.Ceiling(retryAfter.TotalSeconds);
        }

        context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            message = $"Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau {retryAfterSeconds} giây.",
        }, cancellationToken);
    };
});

// Register XML130 Validation (QĐ 130/QĐ-BYT)
builder.Services.AddSingleton<IXml130SpecProvider, Xml130SpecProvider>();
builder.Services.AddScoped<IXml130FieldSpecImportService, Xml130FieldSpecImportService>();
builder.Services.AddScoped<IXml130Parser, Xml130Parser>();
builder.Services.AddScoped<IFieldSpecValidator, FieldSpecValidator>();
builder.Services.AddScoped<IXml130Rule, BhytCardRule>();
builder.Services.AddScoped<IXml130Rule, TimeSequenceRule>();
builder.Services.AddScoped<IXml130Rule, FinancialRule>();
builder.Services.AddScoped<IXml130Rule, DiagnosisRule>();
builder.Services.AddScoped<IXml130Rule, LinkConsistencyRule>();
builder.Services.AddScoped<IXml130Rule, KcbLogicRule>();
builder.Services.AddScoped<IXml130Rule, DrugCatalogRule>();
builder.Services.AddScoped<IXml130Rule, ServiceCatalogRule>();
builder.Services.AddScoped<IXml130Rule, TransferCatalogRule>();
builder.Services.AddScoped<IXml130Rule, StaffCatalogRule>();
builder.Services.AddScoped<IXml130Rule, DuplicateLineRule>();
builder.Services.AddScoped<IXml130ValidationService, Xml130ValidationService>();

// Rule kiểm tra CHÉO giữa nhiều hồ sơ / nhiều file XML130 (trùng giường, trùng giờ bác sĩ...)
builder.Services.AddScoped<IXml130CrossFileRule, BedOverlapCrossRule>();
builder.Services.AddScoped<IXml130CrossFileRule, DoctorTimeOverlapCrossRule>();
builder.Services.AddScoped<IXml130CrossFileRule, PatientEpisodeOverlapCrossRule>();
builder.Services.AddScoped<IXml130CrossFileRule, DrugRefillOverlapCrossRule>();
builder.Services.AddScoped<IXml130CrossFileRule, PatientSimultaneousServiceCrossRule>();
builder.Services.AddScoped<IXml130BatchValidationService, Xml130BatchValidationService>();

// Register Catalog - danh mục HIS (thuốc, DVKT, CĐHA, XN, giường, tham chiếu)
builder.Services.AddSingleton<ICatalogProfileProvider, CatalogProfileProvider>();
builder.Services.AddSingleton<IExcelCatalogReader, ExcelCatalogReader>();
// Cây đơn vị (cha ↔ con ↔ cháu) — cache trong bộ nhớ để không truy vấn lại
// cho từng hồ sơ khi kiểm tra cả lô XML 130.
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IFacilityTreeProvider, FacilityTreeProvider>();
builder.Services.AddScoped<ICatalogLookupProvider, CatalogLookupProvider>();
builder.Services.AddScoped<ICatalogImportService, CatalogImportService>();

// Register RAG - AI học văn bản y tế (công văn, thông tư, quyết định)
builder.Services.AddSingleton<IDocumentTextExtractor, DocumentTextExtractor>();

// Tìm kiếm NGỮ NGHĨA (vector embedding qua Ollama local). Ollama không chạy thì
// hệ thống tự bỏ qua tầng này. Chỉ mục ưu tiên PGVECTOR (tìm bằng SQL + HNSW,
// hợp kho 100 nghìn+ đoạn); PostgreSQL chưa cài pgvector → tự rơi về bộ nhớ.
builder.Services.AddHttpClient<IEmbeddingService, OllamaEmbeddingService>(c =>
{
    c.Timeout = TimeSpan.FromSeconds(120);
});
builder.Services.AddSingleton<EmbeddingIndex>();
builder.Services.AddSingleton<PgVectorEmbeddingIndex>();
builder.Services.AddSingleton<IEmbeddingIndex>(sp => sp.GetRequiredService<PgVectorEmbeddingIndex>());

// Worker chỉ mục ngữ nghĩa chạy NỀN: tự embed các đoạn còn thiếu khi khởi động,
// khi nạp văn bản mới (ingest poke) và khi bấm nút trên màn Kho tri thức —
// client không phải giữ tab mở gọi lặp như trước.
builder.Services.AddSingleton<EmbeddingBackfillService>();
builder.Services.AddSingleton<IEmbeddingBackfill>(sp => sp.GetRequiredService<EmbeddingBackfillService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<EmbeddingBackfillService>());

// Tải văn bản pháp luật (bản text) từ vbpl.vn để nạp kho tri thức theo lựa chọn.
// Cấu hình "giống trình duyệt": tự giải nén gzip, giữ cookie phiên (trang ASP.NET
// WebForms hay redirect để set cookie), theo redirect — thiếu là site trả lỗi/trang trống.
builder.Services.AddHttpClient<ILegalDocumentFetchService, LegalDocumentFetchService>(c =>
    {
        c.Timeout = TimeSpan.FromSeconds(60);
        c.DefaultRequestHeaders.Accept.ParseAdd("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        c.DefaultRequestHeaders.AcceptLanguage.ParseAdd("vi-VN,vi;q=0.9,en;q=0.8");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        AutomaticDecompression = System.Net.DecompressionMethods.All,
        AllowAutoRedirect = true,
        UseCookies = true,
        CookieContainer = new System.Net.CookieContainer()
    });
builder.Services.AddScoped<IDocumentIngestService, DocumentIngestService>();
builder.Services.AddScoped<IDocumentReranker, DocumentReranker>();
builder.Services.AddScoped<IDocumentSearchService, DocumentSearchService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();

var app = builder.Build();

// Áp migration và seed dữ liệu xác thực/RBAC lúc khởi động (trong scope riêng).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    try
    {
        await db.Database.MigrateAsync();
        await AuthSeeder.SeedAsync(app.Services);
    }
    catch (Exception ex)
    {
        // Không chặn app khởi động nếu DB chưa sẵn sàng (vd chạy offline).
        startupLogger.LogError(ex, "Không thể migrate/seed cơ sở dữ liệu lúc khởi động.");
    }
}

// Configure the HTTP request pipeline.

// Register Global Exception Middleware
// Must run BEFORE MapControllers to catch exceptions from controllers
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("AI Validation API")
               .WithTheme(ScalarTheme.BluePlanet)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

// Policy mặc định = WebAdmin (danh sách origin cấu hình sẵn). Các controller extension
// gọi tự ghi đè bằng [EnableCors("Extension")].
app.UseCors();

// Chống spam request — phải đứng sau CORS, trước Authentication/MapControllers.
app.UseRateLimiter();

app.UseHttpsRedirection();

// UseAuthentication PHẢI đứng trước UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// ----------------------------------------------------------------------------
// Helper rate limiting
// ----------------------------------------------------------------------------

// Lấy IP client để phân vùng rate limit. Ưu tiên X-Forwarded-For (IP đầu tiên)
// vì sau ingress/LB thì RemoteIpAddress là IP proxy nội bộ. Fallback RemoteIpAddress.
static string GetClientIp(HttpContext context)
{
    var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(forwardedFor))
    {
        return forwardedFor.Split(',')[0].Trim();
    }
    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

// Đăng ký một chính sách rate limit dạng cửa sổ cố định 1 phút, phân vùng theo IP.
// Ngưỡng đọc động từ IRateLimitSettings; Generation gắn vào khóa để đổi là áp ngay.
static void AddIpFixedWindowPolicy(RateLimiterOptions options, string policyName, Func<RateLimitState, int> selectLimit)
{
    options.AddPolicy(policyName, context =>
    {
        var settings = context.RequestServices.GetRequiredService<IRateLimitSettings>();
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{GetClientIp(context)}|{policyName}|g{settings.Generation}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = selectLimit(settings.State),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
    });
}
