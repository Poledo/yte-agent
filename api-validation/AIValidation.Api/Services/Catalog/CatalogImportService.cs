using System.Globalization;
using System.Security.Cryptography;
using AIValidation.Api.Data;
using AIValidation.Api.Data.Entities;
using AIValidation.Api.Providers.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AIValidation.Api.Services.Catalog;

/// <summary>Kết quả một lần nạp danh mục.</summary>
public record CatalogImportResult
{
    public required string CatalogType { get; init; }
    public required string DisplayName { get; init; }
    public string? FacilityCode { get; init; }
    public long SourceId { get; init; }
    public int RowCount { get; init; }
    public int MappedCodeCount { get; init; }
    public bool ReplacedPrevious { get; init; }

    /// <summary>
    /// True khi file y hệt bản đang hiệu lực (cùng SHA-256) nên hệ thống bỏ qua,
    /// không nạp lại. Chỉ xảy ra khi bên gọi yêu cầu bỏ qua file không đổi —
    /// dùng cho luồng extension nạp thẳng toàn bộ danh mục từ HIS.
    /// </summary>
    public bool Skipped { get; init; }

    /// <summary>SHA-256 (hex) nội dung file đã nạp.</summary>
    public string? ContentHash { get; init; }

    public required string Message { get; init; }
}

/// <summary>
/// Nạp file danh mục HIS vào kho tri thức.
///
/// Chế độ nạp:
/// - Replace (mặc định): danh mục cùng loại + cùng cơ sở KCB đã có sẽ bị gỡ, thay bằng bản mới.
///   Đây là hành vi đúng khi cơ sở xuất lại danh mục sau khi cập nhật giá/bổ sung thuốc.
/// - Append: giữ nguyên bản cũ, thêm nguồn mới (dùng khi nạp danh mục nhiều cơ sở khác nhau
///   mà file không có cột mã cơ sở).
/// </summary>
public interface ICatalogImportService
{
    /// <summary>
    /// Nạp file danh mục.
    /// facilityOverride: mã cơ sở KCB áp cho danh mục không có cột mã cơ sở
    /// (vd danh mục nhân viên, đơn vị chuyển tuyến — file HIS xuất ra không kèm DVTT).
    /// Không truyền thì danh mục được coi là dùng chung, và các rule cần theo cơ sở sẽ bỏ qua.
    /// skipIfUnchanged: file trùng y hệt bản đang hiệu lực (cùng SHA-256) thì bỏ qua,
    /// không nạp lại — dùng cho luồng extension nạp cả bộ danh mục từ HIS mỗi lần bấm nút.
    /// </summary>
    Task<CatalogImportResult> ImportAsync(
        Stream fileStream,
        string fileName,
        bool replaceExisting = true,
        string? facilityOverride = null,
        bool skipIfUnchanged = false,
        CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class CatalogImportService : ICatalogImportService
{
    private readonly AppDbContext _db;
    private readonly IExcelCatalogReader _reader;
    private readonly ICatalogProfileProvider _profileProvider;
    private readonly IFacilityTreeProvider _facilityTree;
    private readonly ILogger<CatalogImportService> _logger;

    public CatalogImportService(
        AppDbContext db,
        IExcelCatalogReader reader,
        ICatalogProfileProvider profileProvider,
        IFacilityTreeProvider facilityTree,
        ILogger<CatalogImportService> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _reader = reader ?? throw new ArgumentNullException(nameof(reader));
        _profileProvider = profileProvider ?? throw new ArgumentNullException(nameof(profileProvider));
        _facilityTree = facilityTree ?? throw new ArgumentNullException(nameof(facilityTree));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<CatalogImportResult> ImportAsync(
        Stream fileStream,
        string fileName,
        bool replaceExisting = true,
        string? facilityOverride = null,
        bool skipIfUnchanged = false,
        CancellationToken cancellationToken = default)
    {
        // ExcelDataReader cần stream seek được
        var buffer = new MemoryStream();
        await fileStream.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        var contentHash = Convert.ToHexString(SHA256.HashData(buffer.ToArray())).ToLowerInvariant();

        // Đọc thử với header dòng đầu để lấy danh sách cột phục vụ nhận diện profile
        var probe = _reader.Read(buffer, fileName);
        var profile = await _profileProvider.DetectAsync(fileName, probe.Columns, cancellationToken);

        if (profile == null)
        {
            var known = (await _profileProvider.GetProfilesAsync(cancellationToken))
                .SelectMany(p => p.FileNamePatterns)
                .Take(10);
            throw new NotSupportedException(
                $"Không nhận diện được loại danh mục của file \"{fileName}\". "
                + $"Hệ thống nhận các danh mục có tên chứa: {string.Join(", ", known)}... "
                + "Nếu đây là file BÁO CÁO hoặc CASE XUẤT TOÁN (không phải danh mục đối chiếu) "
                + "thì nạp vào màn hình KHO KIẾN THỨC để trợ lý AI tra cứu. "
                + "Còn nếu là loại danh mục mới, bổ sung profile vào Knowledge/Catalog/catalog_profiles.json.");
        }

        // Đọc lại đúng dòng tiêu đề theo profile
        var sheet = profile.HeaderRowIndex == 0 ? probe : ReadWithHeader(buffer, fileName, profile.HeaderRowIndex);

        var missing = profile.RequiredColumns
            .Where(c => !sheet.Columns.Contains(c, StringComparer.OrdinalIgnoreCase))
            .ToList();
        if (missing.Count > 0)
        {
            throw new FormatException(
                $"File \"{fileName}\" nhận diện là \"{profile.DisplayName}\" nhưng thiếu cột bắt buộc: {string.Join(", ", missing)}. "
                + "Kiểm tra lại file xuất từ HIS hoặc cập nhật profile trong catalog_profiles.json.");
        }

        // Cột mã cơ sở trong file được ưu tiên; không có thì dùng mã do người nạp chỉ định
        var facilityCode = ResolveFacilityCode(sheet, profile, fileName) ?? facilityOverride?.Trim();
        if (string.IsNullOrEmpty(facilityCode))
        {
            facilityCode = null;
        }

        // File y hệt bản đang hiệu lực → không nạp lại. Extension nạp cả bộ danh mục
        // mỗi lần bấm nút mà phần lớn file không đổi, nạp lại là vô ích và tốn thời gian.
        if (skipIfUnchanged)
        {
            var unchanged = await _db.CatalogSources
                .Where(s => s.IsActive
                    && s.CatalogType == profile.CatalogType
                    && s.FacilityCode == facilityCode
                    && s.ContentHash == contentHash)
                .Select(s => new { s.Id, s.RowCount })
                .FirstOrDefaultAsync(cancellationToken);

            if (unchanged != null)
            {
                _logger.LogInformation(
                    "Bỏ qua danh mục {Type} của cơ sở {Facility} — file không đổi so với bản đang dùng",
                    profile.CatalogType, facilityCode ?? "(dùng chung)");
                return new CatalogImportResult
                {
                    CatalogType = profile.CatalogType,
                    DisplayName = profile.DisplayName,
                    FacilityCode = facilityCode,
                    SourceId = unchanged.Id,
                    RowCount = unchanged.RowCount,
                    MappedCodeCount = 0,
                    ReplacedPrevious = false,
                    Skipped = true,
                    ContentHash = contentHash,
                    Message = $"\"{profile.DisplayName}\" không thay đổi so với bản đang dùng — giữ nguyên."
                };
            }
        }

        // Gỡ (mềm) danh mục cũ cùng loại + cùng cơ sở (nạp lại khi danh mục thay đổi).
        // Giữ lại dữ liệu cũ để có thể khôi phục nếu nạp nhầm bản mới.
        var replaced = false;
        if (replaceExisting)
        {
            var oldSources = await _db.CatalogSources
                .Where(s => s.IsActive
                    && s.CatalogType == profile.CatalogType
                    && s.FacilityCode == facilityCode)
                .ToListAsync(cancellationToken);

            if (oldSources.Count > 0)
            {
                foreach (var old in oldSources)
                {
                    old.IsActive = false;
                }
                replaced = true;
                _logger.LogInformation(
                    "Ngừng hiệu lực {Count} danh mục {Type} cũ của cơ sở {Facility}",
                    oldSources.Count, profile.CatalogType, facilityCode ?? "(dùng chung)");
            }
        }

        var source = new CatalogSource
        {
            FileName = fileName,
            CatalogType = profile.CatalogType,
            DisplayName = profile.DisplayName,
            FacilityCode = facilityCode,
            ContentHash = contentHash,
            ImportedAt = DateTime.UtcNow,
            RowCount = sheet.Rows.Count
        };

        var mappedCodeCount = 0;
        foreach (var row in sheet.Rows)
        {
            var item = BuildItem(row, profile, facilityCode);
            if (item == null)
            {
                continue; // dòng không có tên → bỏ qua
            }
            if (!string.IsNullOrEmpty(item.Code))
            {
                mappedCodeCount++;
            }
            source.Items.Add(item);
        }

        source.RowCount = source.Items.Count;
        _db.CatalogSources.Add(source);
        await EnsureFacilityAsync(facilityCode, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Đã nạp danh mục {Type} ({Rows} dòng, {Mapped} dòng có mã DMDC) từ {File}, cơ sở {Facility}",
            profile.CatalogType, source.RowCount, mappedCodeCount, fileName, facilityCode ?? "(dùng chung)");

        var facilityText = facilityCode != null ? $" của cơ sở {facilityCode}" : "";
        var replacedText = replaced ? " (đã thay thế bản nạp trước đó)" : "";
        var codeText = profile.UsedForXml130
            ? $", trong đó {mappedCodeCount} dòng có mã liên thông dùng để đối chiếu hồ sơ XML 130"
            : "";

        return new CatalogImportResult
        {
            CatalogType = profile.CatalogType,
            DisplayName = profile.DisplayName,
            FacilityCode = facilityCode,
            SourceId = source.Id,
            RowCount = source.RowCount,
            MappedCodeCount = mappedCodeCount,
            ReplacedPrevious = replaced,
            ContentHash = contentHash,
            Message = $"Đã nạp \"{profile.DisplayName}\"{facilityText}: {source.RowCount} dòng{codeText}{replacedText}."
        };
    }

    /// <summary>
    /// Đảm bảo mã cơ sở vừa nạp có mặt trong cây đơn vị. Danh mục nạp từ extension
    /// mang theo mã cơ sở đọc từ chính trang HIS, thường là cơ sở chưa khai báo —
    /// tạo sẵn làm đơn vị gốc để người quản trị chỉ việc kéo vào đúng nhánh cha,
    /// thay vì phải tự nhớ mã mà gõ lại.
    /// </summary>
    private async Task EnsureFacilityAsync(string? facilityCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(facilityCode))
        {
            return;
        }

        var exists = await _db.Facilities.AnyAsync(f => f.Code == facilityCode, cancellationToken);
        if (exists)
        {
            return;
        }

        _db.Facilities.Add(new Facility
        {
            Code = facilityCode,
            Name = $"Cơ sở {facilityCode}",
            Note = "Tự tạo khi nạp danh mục — cập nhật lại tên và đơn vị cấp trên."
        });
        _facilityTree.Invalidate();
        _logger.LogInformation("Tự tạo đơn vị {Facility} trong cây đơn vị khi nạp danh mục", facilityCode);
    }

    private ExcelSheet ReadWithHeader(MemoryStream buffer, string fileName, int headerRowIndex)
    {
        buffer.Position = 0;
        return _reader.Read(buffer, fileName, headerRowIndex);
    }

    /// <summary>
    /// Lấy mã cơ sở KCB từ cột mã đơn vị của file. Quét TOÀN BỘ dòng chứ không chỉ
    /// dòng đầu: file xuất gộp nhiều cơ sở mà chỉ đọc dòng đầu thì mọi dòng bị đóng
    /// dấu nhầm sang một cơ sở, và đối chiếu XML 130 sẽ sai hàng loạt — thà báo lỗi
    /// bắt tách file còn hơn nạp vào rồi kiểm tra sai.
    /// </summary>
    private static string? ResolveFacilityCode(ExcelSheet sheet, CatalogProfile profile, string fileName)
    {
        if (string.IsNullOrEmpty(profile.FacilityColumn) || sheet.Rows.Count == 0)
        {
            return null;
        }

        var codes = sheet.Rows
            .Select(r => r.GetValueOrDefault(profile.FacilityColumn, "").Trim())
            .Where(v => !string.IsNullOrEmpty(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(5)
            .ToList();

        if (codes.Count == 0)
        {
            return null;
        }
        if (codes.Count > 1)
        {
            throw new FormatException(
                $"File \"{fileName}\" chứa danh mục của nhiều cơ sở KCB khác nhau "
                + $"(cột {profile.FacilityColumn}: {string.Join(", ", codes)}). "
                + "Danh mục phải đi theo từng đơn vị nên hãy xuất lại từ HIS theo từng cơ sở rồi nạp riêng.");
        }

        return codes[0];
    }

    private static CatalogItem? BuildItem(
        Dictionary<string, string> row,
        CatalogProfile profile,
        string? facilityCode)
    {
        var name = GetValue(row, profile.NameColumn);
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        var metadata = new Dictionary<string, string>();
        foreach (var col in profile.MetadataColumns)
        {
            var value = GetValue(row, col);
            if (!string.IsNullOrEmpty(value))
            {
                metadata[col] = value;
            }
        }

        return new CatalogItem
        {
            CatalogType = profile.CatalogType,
            FacilityCode = facilityCode,
            Code = NormalizeCode(GetValue(row, profile.CodeColumn), facilityCode),
            HisCode = GetValue(row, profile.HisCodeColumn),
            Name = name.Length > 1024 ? name[..1024] : name,
            Unit = Truncate(GetValue(row, profile.UnitColumn), 100),
            PriceBhyt = ParseDecimal(GetValue(row, profile.PriceBhytColumn)),
            PriceHospital = ParseDecimal(GetValue(row, profile.PriceHospitalColumn)),
            IsSuspended = ParseFlag(GetValue(row, profile.SuspendedColumn)),
            IsOutsideBhyt = ParseFlag(GetValue(row, profile.OutsideBhytColumn)),
            // Cột hoạt động: 1 = còn dùng. Không khai cột này thì mặc định còn hiệu lực.
            IsActive = profile.ActiveColumn == null || ParseFlag(GetValue(row, profile.ActiveColumn)),
            Metadata = metadata.Count > 0 ? metadata : null
        };
    }

    private static string? GetValue(Dictionary<string, string> row, string? column)
    {
        if (string.IsNullOrEmpty(column))
        {
            return null;
        }
        var value = row.GetValueOrDefault(column, "").Trim();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    /// <summary>
    /// Chuẩn hóa mã DMDC. Coi là "chưa map mã" khi:
    /// - rỗng hoặc "0" (quy ước của HIS cho dòng chưa map);
    /// - trùng mã cơ sở KCB — dữ liệu nguồn có dòng bị nhập nhầm mã cơ sở vào cột mã
    ///   dịch vụ, nếu giữ lại sẽ khớp nhầm khi đối chiếu hồ sơ.
    /// </summary>
    private static string? NormalizeCode(string? code, string? facilityCode)
    {
        if (string.IsNullOrWhiteSpace(code) || code == "0")
        {
            return null;
        }
        if (facilityCode != null && code == facilityCode)
        {
            return null;
        }
        return code.Length > 100 ? code[..100] : code;
    }

    private static string? Truncate(string? value, int max)
        => value != null && value.Length > max ? value[..max] : value;

    private static decimal? ParseDecimal(string? value)
        => decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : null;

    /// <summary>Cờ trong danh mục HIS: "1"/"true" = bật, còn lại = tắt.</summary>
    private static bool ParseFlag(string? value)
        => value is "1" or "1.0" || string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
}
