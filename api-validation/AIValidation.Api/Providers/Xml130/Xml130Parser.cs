using System.Text;
using System.Xml.Linq;
using AIValidation.Api.Models.Xml130;

namespace AIValidation.Api.Providers.Xml130;

/// <summary>
/// Parser cho file XML 130 (cấu trúc GIAMDINHHS theo QĐ 130/QĐ-BYT).
///
/// Thuật toán generic: trong mỗi NOIDUNGFILE, mọi element có toàn bộ con là leaf
/// (không còn element con cấp dưới) được coi là một dòng dữ liệu (record).
/// Nhờ đó parser xử lý được cả bảng 1 dòng (TONG_HOP, GIAYCHUYENTUYEN...)
/// lẫn bảng nhiều dòng (CHI_TIET_THUOC, CHI_TIET_DVKT...) mà không cần
/// model cứng cho từng bảng.
///
/// Hỗ trợ 2 dạng file thực tế:
/// - Dạng thường: NOIDUNGFILE chứa trực tiếp các thẻ dữ liệu.
/// - Dạng "mã hóa" (thực chất là mã hóa base64 theo QĐ 130): NOIDUNGFILE chứa
///   chuỗi base64 của đoạn XML bên trong — parser tự phát hiện và giải mã.
/// File có chữ ký số (CHUKYDONVI/Signature) vẫn đọc bình thường; phần chữ ký
/// không thuộc phạm vi kiểm tra dữ liệu nên được bỏ qua.
/// </summary>
public interface IXml130Parser
{
    /// <summary>Parse nội dung XML 130 thành model. Ném FormatException nếu XML sai cấu trúc.</summary>
    Xml130File Parse(string xmlContent);
}

/// <inheritdoc />
public class Xml130Parser : IXml130Parser
{
    private readonly ILogger<Xml130Parser> _logger;

    public Xml130Parser(ILogger<Xml130Parser> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Xml130File Parse(string xmlContent)
    {
        if (string.IsNullOrWhiteSpace(xmlContent))
        {
            throw new FormatException("Nội dung file XML rỗng.");
        }

        XDocument doc;
        try
        {
            doc = XDocument.Parse(xmlContent);
        }
        catch (System.Xml.XmlException ex)
        {
            throw new FormatException($"File không phải XML hợp lệ: {ex.Message}", ex);
        }

        var root = doc.Root;
        if (root == null || !root.Name.LocalName.Equals("GIAMDINHHS", StringComparison.OrdinalIgnoreCase))
        {
            throw new FormatException("File XML không đúng cấu trúc QĐ 130: thiếu thẻ gốc GIAMDINHHS.");
        }

        var file = new Xml130File
        {
            MaCskcb = root.Descendants().FirstOrDefault(e => e.Name.LocalName == "MACSKCB")?.Value.Trim(),
            NgayLap = root.Descendants().FirstOrDefault(e => e.Name.LocalName == "NGAYLAP")?.Value.Trim()
        };

        foreach (var hosoElement in root.Descendants().Where(e => e.Name.LocalName == "HOSO"))
        {
            var hoso = new Xml130Hoso();

            foreach (var fileHoso in hosoElement.Elements().Where(e => e.Name.LocalName == "FILEHOSO"))
            {
                var loaiHoso = fileHoso.Elements()
                    .FirstOrDefault(e => e.Name.LocalName == "LOAIHOSO")?.Value.Trim().ToUpperInvariant();
                var noiDung = fileHoso.Elements()
                    .FirstOrDefault(e => e.Name.LocalName == "NOIDUNGFILE");

                if (string.IsNullOrEmpty(loaiHoso) || noiDung == null)
                {
                    _logger.LogWarning("FILEHOSO thiếu LOAIHOSO hoặc NOIDUNGFILE — bỏ qua");
                    continue;
                }

                var content = ResolveContent(noiDung, loaiHoso);
                if (content == null)
                {
                    continue;
                }

                var rows = ExtractRows(content, loaiHoso);
                if (rows.Count > 0)
                {
                    if (!hoso.Tables.TryGetValue(loaiHoso, out var existing))
                    {
                        hoso.Tables[loaiHoso] = rows;
                    }
                    else
                    {
                        existing.AddRange(rows);
                    }
                }
            }

            // Gán mã cơ sở KCB cho hồ sơ: ưu tiên mã khai trong chính hồ sơ (XML1),
            // thiếu thì lấy mã khai một lần ở đầu file (THONGTINDONVI/MACSKCB).
            // Không có bước này thì hồ sơ từ các HIS không xuất MA_CSKCB trong XML1
            // sẽ không đối chiếu được với danh mục nào.
            hoso.FacilityCode = hoso.GetField("XML1", "MA_CSKCB") ?? file.MaCskcb;

            file.HoSos.Add(hoso);
        }

        _logger.LogInformation(
            "Parse XML130 thành công: CSKCB={MaCskcb}, {HosoCount} hồ sơ",
            file.MaCskcb, file.HoSos.Count);

        return file;
    }

    /// <summary>
    /// Trả về element chứa dữ liệu của một bảng:
    /// - NOIDUNGFILE có thẻ con → dùng luôn.
    /// - NOIDUNGFILE chỉ có text → là dạng mã hóa base64, giải mã rồi bọc lại
    ///   thành container tương đương để dùng chung thuật toán tìm record.
    /// Trả null (kèm log) nếu nội dung rỗng hoặc không giải mã được.
    /// </summary>
    private XElement? ResolveContent(XElement noiDungFile, string tableId)
    {
        if (noiDungFile.HasElements)
        {
            return noiDungFile;
        }

        var text = noiDungFile.Value.Trim();
        if (string.IsNullOrEmpty(text))
        {
            _logger.LogWarning("NOIDUNGFILE của bảng {TableId} rỗng — bỏ qua", tableId);
            return null;
        }

        var decoded = TryDecodeBase64Xml(text);
        if (decoded == null)
        {
            throw new FormatException(
                $"Nội dung bảng {tableId} không phải XML cũng không phải chuỗi base64 hợp lệ theo QĐ 130. "
                + "Nếu file được ký/mã hóa bằng công cụ khác, hãy xuất lại bản XML gốc từ phần mềm HIS rồi kiểm tra lại.");
        }

        _logger.LogInformation("Bảng {TableId}: đã giải mã base64 nội dung ({Length} ký tự)", tableId, text.Length);

        // Bọc lại giống cấu trúc NOIDUNGFILE thường để ExtractRows quét đồng nhất
        var wrapper = new XElement("NOIDUNGFILE");
        wrapper.Add(decoded);
        return wrapper;
    }

    /// <summary>
    /// Giải mã chuỗi base64 thành XElement. Trả null nếu không phải base64
    /// hoặc nội dung sau giải mã không phải XML hợp lệ.
    /// </summary>
    private static XElement? TryDecodeBase64Xml(string text)
    {
        // Bỏ xuống dòng/khoảng trắng do định dạng file
        var compact = string.Concat(text.Where(c => !char.IsWhiteSpace(c)));

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(compact);
        }
        catch (FormatException)
        {
            return null;
        }

        try
        {
            var xml = Encoding.UTF8.GetString(bytes);
            return XElement.Parse(xml);
        }
        catch (Exception ex) when (ex is System.Xml.XmlException or DecoderFallbackException)
        {
            return null;
        }
    }

    /// <summary>
    /// Tìm các record trong NOIDUNGFILE: element mà mọi con trực tiếp đều là leaf.
    /// </summary>
    private static List<Xml130Row> ExtractRows(XElement noiDungFile, string tableId)
    {
        var rows = new List<Xml130Row>();
        var index = 0;

        foreach (var element in noiDungFile.Descendants())
        {
            var children = element.Elements().ToList();
            if (children.Count == 0)
            {
                continue;
            }
            // Record = mọi con trực tiếp đều không có element con cấp dưới
            if (children.All(c => !c.HasElements))
            {
                var row = new Xml130Row { TableId = tableId, RowIndex = ++index };
                foreach (var child in children)
                {
                    row.Fields[child.Name.LocalName] = child.Value.Trim();
                }
                rows.Add(row);
            }
        }

        return rows;
    }
}
