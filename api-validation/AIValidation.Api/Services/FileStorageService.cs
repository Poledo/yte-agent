using Microsoft.AspNetCore.StaticFiles;

namespace AIValidation.Api.Services;

/// <summary>
/// Lưu trữ file gốc người dùng đã nạp (văn bản tri thức, danh mục HIS) để có thể
/// xem/tải lại. File nằm ngoài DB, theo cấu trúc thư mục:
/// Storage/{category}/{id}/{tên file gốc}.
/// </summary>
public interface IFileStorage
{
    /// <summary>Lưu file gốc. Ghi đè nếu đã tồn tại.</summary>
    Task SaveAsync(string category, long id, string fileName, Stream content, CancellationToken ct = default);

    /// <summary>
    /// Tìm file gốc đã lưu. Trả về đường dẫn vật lý + content-type,
    /// hoặc null nếu chưa lưu (vd dữ liệu nạp trước khi có tính năng này).
    /// </summary>
    (string PhysicalPath, string ContentType, string FileName)? Find(string category, long id);
}

/// <inheritdoc />
public sealed class FileStorageService : IFileStorage
{
    private readonly string _root;
    private readonly ILogger<FileStorageService> _logger;
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public FileStorageService(IWebHostEnvironment env, ILogger<FileStorageService> logger)
    {
        _root = Path.Combine(env.ContentRootPath, "Storage");
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task SaveAsync(string category, long id, string fileName, Stream content, CancellationToken ct = default)
    {
        var dir = Path.Combine(_root, category, id.ToString());
        Directory.CreateDirectory(dir);

        // Chỉ giữ tên file, chặn ký tự đường dẫn để tránh path traversal
        var safeName = Path.GetFileName(fileName);
        var path = Path.Combine(dir, safeName);

        await using var target = File.Create(path);
        await content.CopyToAsync(target, ct);

        _logger.LogInformation("Đã lưu file gốc {Category}/{Id}/{File}", category, id, safeName);
    }

    /// <inheritdoc />
    public (string PhysicalPath, string ContentType, string FileName)? Find(string category, long id)
    {
        var dir = Path.Combine(_root, category, id.ToString());
        if (!Directory.Exists(dir))
        {
            return null;
        }

        var file = Directory.EnumerateFiles(dir).FirstOrDefault();
        if (file == null)
        {
            return null;
        }

        if (!ContentTypes.TryGetContentType(file, out var contentType))
        {
            contentType = "application/octet-stream";
        }
        return (file, contentType, Path.GetFileName(file));
    }
}
