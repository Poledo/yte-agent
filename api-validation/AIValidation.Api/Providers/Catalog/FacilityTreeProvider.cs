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

    /// <summary>
    /// Id của cơ sở và toàn bộ CẤP TRÊN của nó: [chính nó, cha, ông...].
    ///
    /// Trả lời câu hỏi "văn bản/cấu hình của ai áp dụng cho cơ sở này" — ngược chiều
    /// với <see cref="GetDescendantIdsAsync"/> ("tôi quản lý dữ liệu của ai").
    ///
    /// Khác <see cref="GetAncestorChainAsync"/> ở chỗ KHÔNG loại cơ sở đã ngừng hoạt
    /// động: một Sở Y tế bị tắt cờ hoạt động sau khi sáp nhập vẫn còn nguyên kho văn
    /// bản mà tuyến dưới đang dựa vào; cắt chuỗi tại đó là làm trợ lý mất căn cứ trả
    /// lời mà không có dấu hiệu gì.
    /// </summary>
    Task<IReadOnlyList<long>> GetAncestorChainIdsAsync(
        long facilityId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Id của cơ sở và TOÀN BỘ nhánh cấp dưới (con, cháu, chắt...), kể cả cơ sở đã
    /// ngừng hoạt động. Đây là phạm vi dữ liệu mà quản trị viên của cơ sở đó được thấy.
    ///
    /// Cố ý KHÔNG bỏ cơ sở <c>IsActive=false</c>: ngừng hoạt động là trạng thái nghiệp
    /// vụ, không phải xóa. Bỏ chúng đi thì dữ liệu lịch sử của một trạm y tế vừa giải
    /// thể sẽ biến mất khỏi màn hình của chính người phải quản nó.
    /// </summary>
    Task<IReadOnlySet<long>> GetDescendantIdsAsync(
        long facilityId, CancellationToken cancellationToken = default);

    /// <summary>Mã cơ sở tương ứng <see cref="GetDescendantIdsAsync"/> — dùng cho bảng lọc theo mã.</summary>
    Task<IReadOnlySet<string>> GetDescendantCodesAsync(
        long facilityId, CancellationToken cancellationToken = default);

    /// <summary>Tra mã + tên cơ sở theo Id để đắp vào DTO; null nếu không có trong cây.</summary>
    Task<FacilityRef?> FindByIdAsync(long facilityId, CancellationToken cancellationToken = default);

    /// <summary>Tra Id + tên cơ sở theo mã; null nếu không có trong cây.</summary>
    Task<FacilityRef?> FindByCodeAsync(string facilityCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tra mã + tên cho một lô Id trong một lần chạm cache — dùng khi đắp cột "Cơ sở"
    /// vào cả trang danh sách, tránh N lần gọi <see cref="FindByIdAsync"/>.
    /// </summary>
    Task<IReadOnlyDictionary<long, FacilityRef>> MapByIdsAsync(
        IEnumerable<long> facilityIds, CancellationToken cancellationToken = default);

    /// <summary>Như <see cref="MapByIdsAsync"/> nhưng tra theo mã cơ sở (bảng danh mục HIS dùng mã).</summary>
    Task<IReadOnlyDictionary<string, FacilityRef>> MapByCodesAsync(
        IEnumerable<string> facilityCodes, CancellationToken cancellationToken = default);

    /// <summary>Xóa cache cây đơn vị — gọi sau khi thêm/sửa/xóa đơn vị.</summary>
    void Invalidate();
}

/// <summary>Nhận dạng ngắn gọn của một cơ sở để hiển thị: "Tên (mã)".</summary>
public sealed record FacilityRef(long Id, string Code, string Name);

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

        if (!nodes.TryGetValue(code, out var node) || !node.IsActive)
        {
            // Đơn vị chưa khai báo trong cây → không biết cha là ai, chỉ dùng danh mục của chính nó
            return new[] { code };
        }

        var chain = new List<string> { code };
        var visited = new HashSet<long> { node.Id };

        // Chỉ lần lên cha khi chính đơn vị đang xét cho phép mượn danh mục cấp trên
        while (node.InheritCatalogFromParent && node.ParentId.HasValue && chain.Count < MaxDepth)
        {
            if (!nodes.TryGetValue(node.ParentId.Value, out var parent) || !parent.IsActive || !visited.Add(parent.Id))
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

        if (!nodes.TryGetValue(code, out var node) || !node.IsActive)
        {
            // Chưa khai báo trong cây → không biết cha là ai, coi như đơn vị độc lập
            return new[] { code };
        }

        var chain = new List<string> { node.Code };
        var visited = new HashSet<long> { node.Id };

        // Đi hết lên gốc — KHÔNG xét InheritCatalogFromParent (xem chú thích ở interface)
        while (node.ParentId.HasValue && chain.Count < MaxDepth)
        {
            if (!nodes.TryGetValue(node.ParentId.Value, out var parent) || !parent.IsActive || !visited.Add(parent.Id))
            {
                break;
            }
            chain.Add(parent.Code);
            node = parent;
        }

        return chain;
    }

    public async Task<IReadOnlyList<long>> GetAncestorChainIdsAsync(
        long facilityId, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        var chain = new List<long> { facilityId };

        if (!nodes.TryGetValue(facilityId, out var node))
        {
            // Cơ sở không có trong cây (dữ liệu cũ, hoặc cache chưa kịp làm mới):
            // coi như đơn vị độc lập — vẫn thấy văn bản của chính mình.
            return chain;
        }

        var visited = new HashSet<long> { node.Id };
        while (node.ParentId.HasValue && chain.Count < MaxDepth)
        {
            if (!nodes.TryGetValue(node.ParentId.Value, out var parent) || !visited.Add(parent.Id))
            {
                break;
            }
            chain.Add(parent.Id);
            node = parent;
        }

        return chain;
    }

    public async Task<IReadOnlySet<long>> GetDescendantIdsAsync(
        long facilityId, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        return nodes.DescendantIds(facilityId);
    }

    public async Task<IReadOnlySet<string>> GetDescendantCodesAsync(
        long facilityId, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var id in nodes.DescendantIds(facilityId))
        {
            if (nodes.TryGetValue(id, out var node))
            {
                codes.Add(node.Code);
            }
        }

        return codes;
    }

    public async Task<FacilityRef?> FindByIdAsync(long facilityId, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        return nodes.TryGetValue(facilityId, out var node) ? node.ToRef() : null;
    }

    public async Task<FacilityRef?> FindByCodeAsync(string facilityCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(facilityCode))
        {
            return null;
        }

        var nodes = await GetNodesAsync(cancellationToken);
        return nodes.TryGetValue(facilityCode.Trim(), out var node) ? node.ToRef() : null;
    }

    public async Task<IReadOnlyDictionary<long, FacilityRef>> MapByIdsAsync(
        IEnumerable<long> facilityIds, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        var map = new Dictionary<long, FacilityRef>();

        foreach (var id in facilityIds.Distinct())
        {
            if (nodes.TryGetValue(id, out var node))
            {
                map[id] = node.ToRef();
            }
        }

        return map;
    }

    public async Task<IReadOnlyDictionary<string, FacilityRef>> MapByCodesAsync(
        IEnumerable<string> facilityCodes, CancellationToken cancellationToken = default)
    {
        var nodes = await GetNodesAsync(cancellationToken);
        var map = new Dictionary<string, FacilityRef>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in facilityCodes.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c.Trim()).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (nodes.TryGetValue(code, out var node))
            {
                map[code] = node.ToRef();
            }
        }

        return map;
    }

    public void Invalidate() => _cache.Remove(CacheKey);

    /// <summary>
    /// Toàn bộ cây đơn vị nạp một lần vào cache (số đơn vị của một tỉnh chỉ vài trăm
    /// dòng) — tránh truy vấn đệ quy cho từng hồ sơ khi kiểm tra cả lô XML 130.
    ///
    /// Nạp CẢ đơn vị đã ngừng hoạt động: phạm vi quyền và cột "Cơ sở" vẫn cần chúng.
    /// Hai hàm dựng chuỗi cha tự loại đơn vị ngừng hoạt động ra để giữ nguyên hành vi
    /// đối chiếu danh mục như trước.
    /// </summary>
    private async Task<FacilityNodeMap> GetNodesAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue<FacilityNodeMap>(CacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        var rows = await _db.Facilities
            .Select(f => new FacilityNode(f.Id, f.Code, f.Name, f.ParentId, f.InheritCatalogFromParent, f.IsActive))
            .ToListAsync(cancellationToken);

        var map = new FacilityNodeMap(rows);
        _cache.Set(CacheKey, map, TimeSpan.FromMinutes(10));
        _logger.LogDebug("Nạp cache cây đơn vị: {Count} đơn vị", rows.Count);
        return map;
    }

    /// <summary>Một nút trong cây đơn vị (chỉ các trường cần để lần lên cha / xuống con).</summary>
    private sealed record FacilityNode(
        long Id, string Code, string Name, long? ParentId, bool InheritCatalogFromParent, bool IsActive)
    {
        public FacilityRef ToRef() => new(Id, Code, Name);
    }

    /// <summary>Cây đơn vị tra được theo cả mã cơ sở lẫn Id (để lần theo ParentId).</summary>
    private sealed class FacilityNodeMap
    {
        private readonly Dictionary<string, FacilityNode> _byCode;
        private readonly Dictionary<long, FacilityNode> _byId;
        private readonly Dictionary<long, List<long>> _childIds;

        public FacilityNodeMap(IEnumerable<FacilityNode> nodes)
        {
            var list = nodes.ToList();
            // Mã cơ sở có ràng buộc duy nhất ở DB nhưng vẫn gộp phòng dữ liệu cũ lệch
            _byCode = list
                .GroupBy(n => n.Code, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            _byId = list.ToDictionary(n => n.Id);
            _childIds = list
                .Where(n => n.ParentId.HasValue)
                .GroupBy(n => n.ParentId!.Value)
                .ToDictionary(g => g.Key, g => g.Select(n => n.Id).ToList());
        }

        public bool TryGetValue(string code, out FacilityNode node) => _byCode.TryGetValue(code, out node!);

        public bool TryGetValue(long id, out FacilityNode node) => _byId.TryGetValue(id, out node!);

        /// <summary>
        /// Duyệt rộng xuống dưới, luôn kể cả chính nó. <c>HashSet</c> vừa gom kết quả vừa
        /// chặn vòng lặp cha↔con do dữ liệu lỗi — không có nó thì một cạnh vòng làm treo
        /// mọi request của người dùng thuộc nhánh đó.
        /// </summary>
        public IReadOnlySet<long> DescendantIds(long rootId)
        {
            var result = new HashSet<long> { rootId };
            var queue = new Queue<long>();
            queue.Enqueue(rootId);

            while (queue.Count > 0)
            {
                if (!_childIds.TryGetValue(queue.Dequeue(), out var children))
                {
                    continue;
                }

                foreach (var childId in children)
                {
                    if (result.Add(childId))
                    {
                        queue.Enqueue(childId);
                    }
                }
            }

            return result;
        }
    }
}
