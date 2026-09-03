using AIValidation.Api.Authorization.Dynamic;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace AIValidation.Api.Controllers;

/// <summary>
/// Phân phối bản cài extension Chrome tự host (self-hosted), KHÔNG qua Chrome Web Store.
///
/// Hai file nằm trong volume Storage (PVC api-storage), do CI đẩy lên sau mỗi lần tag
/// bản phát hành (xem .github/workflows/extension-release.yml):
/// <list type="bullet">
///   <item><c>Storage/extension-release/update.xml</c> — manifest cập nhật: version mới nhất
///   + URL tải .crx. Chrome đọc file này định kỳ (~5 giờ/lần) để tự cập nhật.</item>
///   <item><c>Storage/extension-release/zerocheck-ai.crx</c> — gói cài đặt đã ký.</item>
/// </list>
///
/// Chưa phát hành lần nào (chưa có file) thì trả 404 kèm thông báo rõ ràng thay vì
/// để nginx/kestrel trả trang lỗi trắng — extension và người kiểm tra đều đọc được.
/// </summary>
// Extension chạy trong trình duyệt với origin chrome-extension://<id> đổi theo từng
// máy cài, nên dùng policy "Extension" (mở origin) giống ExtensionConfigController.
[EnableCors("Extension")]
// Chrome tự tải update.xml/.crx không kèm phiên đăng nhập hay khóa bản quyền nào —
// đây là endpoint phân phối công khai, chỉ phục vụ 2 file tĩnh cố định.
[IgnorePermission("Chrome tự tải bản cập nhật không có phiên đăng nhập; chỉ phục vụ 2 file tĩnh cố định")]
[ApiController]
public sealed class ExtensionReleaseController : ControllerBase
{
    // Cùng gốc Storage với FileStorageService (ContentRootPath/Storage) để CI đẩy file
    // vào volume là đọc được ngay, không phụ thuộc thư mục chạy.
    private readonly string _releaseDir;
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public ExtensionReleaseController(IWebHostEnvironment env)
    {
        _releaseDir = Path.Combine(env.ContentRootPath, "Storage", "extension-release");
    }

    /// <summary>Manifest cập nhật cho cơ chế tự cập nhật của Chrome (update_url).</summary>
    [HttpGet("api/extension-release/update.xml")]
    public IActionResult UpdateManifest() => Serve("update.xml", "application/xml");

    /// <summary>Gói .crx đã ký — Chrome tải về khi thấy version trong update.xml mới hơn.</summary>
    [HttpGet("api/extension-release/zerocheck-ai.crx")]
    public IActionResult Package() => Serve("zerocheck-ai.crx", "application/x-chrome-extension");

    private IActionResult Serve(string fileName, string fallbackContentType)
    {
        // Chỉ đọc đúng 2 tên cố định trong thư mục release — không nhận tên từ query,
        // nên không có đường path traversal nào ở đây.
        var path = Path.Combine(_releaseDir, fileName);
        if (!System.IO.File.Exists(path))
        {
            return NotFound(new
            {
                message = "Chưa có bản phát hành extension nào trên máy chủ. "
                    + "Push tag extension-vX.Y.Z để CI đóng gói và đẩy bản cài lên.",
            });
        }

        if (!ContentTypes.TryGetContentType(path, out var contentType))
        {
            contentType = fallbackContentType;
        }

        // Cả 2 file đều KHÔNG cache: file .crx bị thay thế tại chỗ ở CÙNG URL mỗi lần
        // phát hành, nên max-age sẽ khiến trình duyệt dùng lại bản cũ tới 1 giờ —
        // đúng lỗi CRX_REQUIRED_PROOF_MISSING khi người dùng tải ngay sau bản vá.
        // no-cache vẫn cho phép xác thực lại bằng ETag nên nhiều máy trạm tải
        // không kéo lại từ đầu khi file chưa đổi.
        Response.Headers.CacheControl = "no-cache";

        return PhysicalFile(path, contentType, enableRangeProcessing: true);
    }
}
