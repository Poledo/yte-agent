using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AIValidation.Api.Providers.Catalog;

/// <summary>
/// Dựng chuỗi đơn vị dùng để tra danh mục HIS cho một cơ sở KCB.
///
/// Đơn vị tổ chức theo cây (Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã).
/// Tuyến dưới thường không tự nạp danh mục mà dùng chung danh mục tuyến trên,
/// nên khi kiểm tra hồ sơ ta xét lần lượt: CHÍNH đơn vị đó trước, không có thì
/// lên cha, rồi ông. Dừng ngay tại đơn vị nào tắt cờ "được dùng danh mục cấp trên".
/// </summary>
public interface IFacilityTreeProvider
{
    /// <summary>
    /// Chuỗi mã đơn vị theo THỨ TỰ ƯU TIÊN tra danh mục: [chính nó, cha, ông...].
    /// Mã chưa khai báo trong cây đơn vị → trả về đúng một phần tử là chính nó
    /// (giữ nguyên hành vi cũ: chỉ dùng danh mục của riêng mình).
    /// </summary>
    Task<IReadOnlyList<string>> GetCatalogChainAsync(
        string facilityCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Chuỗi mã đơn vị đi từ chính nó lên tới gốc: [chính nó, cha, ông...].
    ///
    /// KHÁC <see cref="GetCatalogChainAsync"/> ở chỗ ĐI HẾT lên gốc, bỏ qua cờ
    /// <see cref="Data.Entities.Facility.InheritCatalogFromParent"/>. Cờ đó nói về kế thừa
    /// DANH MỤC (nghiệp vụ đối chiếu), còn hàm này phục vụ câu hỏi PHẠM VI QUYỀN
    /// THƯƠNG MẠI ("giấy phép của tuyến trên có phủ đơn vị này không"). Trộn hai
    /// khái niệm lại thì một thao tác chỉnh danh mục sẽ vô tình cắt hoặc mở dịch vụ.
    /// </summary>
    Task<IReadOnlyList<string>> GetAncestorChainAsync(
        string facilityCode, CancellationToken cancellationToken = default);

    /// <summary>Xóa cache cây đơn vị — gọi sau khi thêm/sửa/xóa đơn vị.</summary>
    void Invalidate();
}

/// <inheritdoc />
public class FacilityTreeProvider : IFacilityTreeProvider
{
    private const string CacheKey = "facility-tree";

    /// <summary>Chặn vòng lặp cha↔con do dữ liệu lỗi, đồng thời giới hạn độ sâu hợp lý.</summary>
    private const int MaxDepth = 10;

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FacilityTreeProvider> _logger;

    public FacilityTreeProvider(AppDbContext db, IMemoryCache cache, ILogger<FacilityTreeProvider> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<string>> GetCatalogChainAsync(
        string facilityCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(facilityCode))
        {
            return Array.Empty<string>();
        }

        var code = facilityCode.Trim();
        var nodes = await GetNodesAsync(cancellationToken);

        if (!nodes.TryGetValue(code, out var node))
        {
            // Đơn vị chưa khai báo trong cây → không biết cha là ai, chỉ dùng danh mục của chính nó
            return new[] { code };
        }

        var chain = new List<string> { code };
        var visited = new HashSet<long> { node.Id };

        // Chỉ lần lên cha khi chính đơn vị đang xét cho phép mượn danh mục cấp trên
        while (node.InheritCatalogFromParent && node.ParentId.HasValue && chain.Count < MaxDepth)
        {
            if (!nodes.TryGetValue(node.ParentId.Value, out var parent) || !visited.Add(parent.Id))
            {
                break;
            }
            chain.Add(parent.Code);
            node = parent;
        }

        return chain;
    }

    public async Task<IReadOnlyList<string>> GetAncestorChainAsync(
        string facilityCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(facilityCode))
        {
            return Array.Empty<string>();
        }

        var code = facilityCode.Trim();
        var nodes = await GetNodesAsync(cancellationToken);

        if (!nodes.TryGetValue(code, out var node))
        {
            // Chưa khai báo trong cây → không biết cha là ai, coi như đơn vị độc lập
            return new[] { code };
        }

        var chain = new List<string> { node.Code };
        var visited = new HashSet<long> { node.Id };

        // Đi hết lên gốc — KHÔNG xét InheritCatalogFromParent (xem chú thích ở interface)
        while (node.ParentId.HasValue && chain.Count < MaxDepth)
        {
            if (!nodes.TryGetValue(node.ParentId.Value, out var parent) || !visited.Add(parent.Id))
            {
                break;
            }
            chain.Add(parent.Code);
            node = parent;
        }

        return chain;
    }

    public void Invalidate() => _cache.Remove(CacheKey);

    /// <summary>
    /// Toàn bộ cây đơn vị nạp một lần vào cache (số đơn vị của một tỉnh chỉ vài trăm
    /// dòng) — tránh truy vấn đệ quy cho từng hồ sơ khi kiểm tra cả lô XML 130.
    /// </summary>
    private async Task<FacilityNodeMap> GetNodesAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue<FacilityNodeMap>(CacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        var rows = await _db.Facilities
            .Where(f => f.IsActive)
            .Select(f => new FacilityNode(f.Id, f.Code, f.ParentId, f.InheritCatalogFromParent))
            .ToListAsync(cancellationToken);

        var map = new FacilityNodeMap(rows);
        _cache.Set(CacheKey, map, TimeSpan.FromMinutes(10));
        _logger.LogDebug("Nạp cache cây đơn vị: {Count} đơn vị", rows.Count);
        return map;
    }

    /// <summary>Một nút trong cây đơn vị (chỉ các trường cần để lần lên cha).</summary>
    private record FacilityNode(long Id, string Code, long? ParentId, bool InheritCatalogFromParent);

    /// <summary>Cây đơn vị tra được theo cả mã cơ sở lẫn Id (để lần theo ParentId).</summary>
    private sealed class FacilityNodeMap
    {
        private readonly Dictionary<string, FacilityNode> _byCode;
        private readonly Dictionary<long, FacilityNode> _byId;

        public FacilityNodeMap(IEnumerable<FacilityNode> nodes)
        {
            var list = nodes.ToList();
            // Mã cơ sở có ràng buộc duy nhất ở DB nhưng vẫn gộp phòng dữ liệu cũ lệch
            _byCode = list
                .GroupBy(n => n.Code, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            _byId = list.ToDictionary(n => n.Id);
        }

        public bool TryGetValue(string code, out FacilityNode node) => _byCode.TryGetValue(code, out node!);

        public bool TryGetValue(long id, out FacilityNode node) => _byId.TryGetValue(id, out node!);
    }
}
