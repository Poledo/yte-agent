using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using SkiaSharp;
using Tesseract;
using UglyToad.PdfPig;

namespace AIValidation.Api.Services.Rag;

/// <summary>
/// Trích xuất text từ file văn bản upload cho kho tri thức RAG.
///
/// Hỗ trợ:
/// - .txt / .md / .xml / .html / .csv : đọc trực tiếp
/// - .docx : DocumentFormat.OpenXml — ghép text các paragraph
/// - .doc  : NPOI (Word 97-2003); tự nhận diện file .doc "giả dạng" (docx đổi tên, RTF)
/// - .pdf  : PdfPig — có lớp text thì trích thẳng, scan ảnh thì OCR (Tesseract)
/// - .xlsx : DocumentFormat.OpenXml — mỗi sheet thành bảng text (dòng = tab-separated)
/// - .xls  : ExcelDataReader (Excel 97-2003) — mỗi sheet thành bảng text
/// </summary>
/// <summary>Kết quả trích text kèm PHƯƠNG THỨC đã dùng (hiển thị cho người dùng biết file được đọc kiểu gì).</summary>
public record ExtractionResult(string Text, string Method);

public interface IDocumentTextExtractor
{
    /// <summary>Danh sách phần mở rộng hỗ trợ (để validate và báo lỗi thân thiện).</summary>
    IReadOnlySet<string> SupportedExtensions { get; }

    /// <summary>
    /// Trích text từ stream file. Ném NotSupportedException với thông báo tiếng Việt
    /// nếu định dạng không hỗ trợ hoặc file không có text.
    /// </summary>
    Task<string> ExtractAsync(string fileName, Stream stream, CancellationToken cancellationToken = default);

    /// <summary>Như ExtractAsync nhưng trả kèm phương thức đọc (lớp chữ PDF / OCR chuẩn / OCR nâng cao...).</summary>
    Task<ExtractionResult> ExtractDetailedAsync(string fileName, Stream stream, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public class DocumentTextExtractor : IDocumentTextExtractor
{
    private static readonly HashSet<string> PlainTextExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".md", ".xml", ".html", ".csv"
    };

    static DocumentTextExtractor()
    {
        // ExcelDataReader cần code page Windows-1252 để đọc .xls đời cũ
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
    }

    public IReadOnlySet<string> SupportedExtensions { get; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        ".txt", ".md", ".xml", ".html", ".csv", ".doc", ".docx", ".pdf", ".xls", ".xlsx"
    };

    public async Task<string> ExtractAsync(string fileName, Stream stream, CancellationToken cancellationToken = default)
        => (await ExtractDetailedAsync(fileName, stream, cancellationToken)).Text;

    public async Task<ExtractionResult> ExtractDetailedAsync(string fileName, Stream stream, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        if (ext is ".ppt" or ".pptx")
        {
            throw new NotSupportedException(
                "File trình chiếu PowerPoint chưa hỗ trợ. Xuất nội dung sang PDF hoặc Word rồi upload lại.");
        }

        if (PlainTextExtensions.Contains(ext))
        {
            using var reader = new StreamReader(stream);
            var plain = await reader.ReadToEndAsync(cancellationToken);
            return new ExtractionResult(plain, "Đọc file text trực tiếp");
        }

        // Các parser bên dưới cần stream seek được — copy vào MemoryStream
        var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        return ext switch
        {
            ".docx" => new ExtractionResult(ExtractDocx(buffer), "Đọc file Word (.docx)"),
            ".doc" => ExtractDoc(buffer),
            ".pdf" => ExtractPdfDetailed(buffer),
            ".xlsx" => new ExtractionResult(ExtractXlsx(buffer), "Đọc bảng Excel (.xlsx)"),
            ".xls" => new ExtractionResult(ExtractXls(buffer), "Đọc bảng Excel 97-2003 (.xls)"),
            _ => throw new NotSupportedException(
                $"Định dạng {ext} chưa hỗ trợ. Các định dạng nhận được: {string.Join(", ", SupportedExtensions.OrderBy(e => e))}.")
        };
    }

    // ---------------------------------------------------------------
    // Word 97-2003 (.doc) — NPOI. File .doc từ các cơ quan hay "giả dạng":
    // thực chất là docx đổi tên (bắt đầu "PK") hoặc RTF ("{\rtf") — nhận diện
    // theo byte đầu để xử lý đúng thay vì báo lỗi.
    // ---------------------------------------------------------------

    private static ExtractionResult ExtractDoc(MemoryStream stream)
    {
        var head = new byte[4];
        var read = stream.Read(head, 0, 4);
        stream.Position = 0;

        // "PK.." → thực chất là docx (zip) đổi tên
        if (read >= 2 && head[0] == 0x50 && head[1] == 0x4B)
        {
            return new ExtractionResult(ExtractDocx(stream), "File .doc thực chất là .docx đổi tên — đọc theo định dạng Word mới");
        }

        // "{\rt" → thực chất là RTF
        if (read >= 4 && head[0] == (byte)'{' && head[1] == (byte)'\\' && head[2] == (byte)'r' && head[3] == (byte)'t')
        {
            return new ExtractionResult(ExtractRtf(stream), "File .doc thực chất là RTF — đã giải mã RTF");
        }

        // Word 97-2003 thật sự: đọc trực tiếp theo đặc tả MS-CFB + MS-DOC
        var text97 = DocBinaryTextExtractor.Extract(stream.ToArray());
        return new ExtractionResult(
            EnsureHasText(text97, "File .doc không trích xuất được text."),
            "Đọc file Word 97-2003 (.doc)");
    }

    /// <summary>
    /// RTF → text mức cơ bản: giải mã \uNNNN (Unicode — cách file tiếng Việt hay dùng)
    /// và \'hh, bỏ control word/nhóm đặc biệt. Đủ dùng cho tra cứu full-text.
    /// </summary>
    private static string ExtractRtf(MemoryStream stream)
    {
        using var reader = new StreamReader(stream, System.Text.Encoding.ASCII, leaveOpen: true);
        var rtf = reader.ReadToEnd();

        // Bỏ các nhóm không phải nội dung (font table, style, ảnh...)
        rtf = System.Text.RegularExpressions.Regex.Replace(
            rtf, @"\{\\(?:fonttbl|colortbl|stylesheet|info|pict|\*)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", " ");
        // \uNNNN? → ký tự Unicode (kèm ký tự thay thế phía sau cần bỏ)
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"\\u(-?\d+)\s?\??", m =>
        {
            var code = int.Parse(m.Groups[1].Value);
            if (code < 0) code += 65536;
            return char.ConvertFromUtf32(code);
        });
        // \'hh → ký tự theo code page 1252 (gần đúng)
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"\\'([0-9a-fA-F]{2})", m =>
            ((char)Convert.ToInt32(m.Groups[1].Value, 16)).ToString());
        // Xuống dòng
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"\\(?:par|line)\b", "\n");
        // Bỏ control word còn lại + ngoặc nhóm
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"\\[a-zA-Z]+-?\d*\s?", " ");
        rtf = rtf.Replace("{", " ").Replace("}", " ");
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"[ \t]+", " ");
        rtf = System.Text.RegularExpressions.Regex.Replace(rtf, @"(\s*\n\s*){2,}", "\n\n");

        return EnsureHasText(rtf.Trim(), "File RTF không trích xuất được text.");
    }

    // ---------------------------------------------------------------
    // Excel 97-2003 (.xls) — ExcelDataReader (cùng thư viện với import danh mục)
    // ---------------------------------------------------------------

    private static string ExtractXls(MemoryStream stream)
    {
        using var reader = ExcelDataReader.ExcelReaderFactory.CreateReader(stream);
        var sb = new StringBuilder();

        do
        {
            sb.AppendLine($"### Sheet: {reader.Name}");
            List<string>? headers = null;
            while (reader.Read())
            {
                var cells = new List<string?>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    cells.Add(reader.GetValue(i)?.ToString()?.Trim());
                }
                AppendSheetRow(sb, cells, ref headers);
            }
            sb.AppendLine();
        } while (reader.NextResult());

        return EnsureHasText(sb.ToString(), "File .xls không có dữ liệu.");
    }

    private static string ExtractDocx(MemoryStream stream)
    {
        using var doc = WordprocessingDocument.Open(stream, isEditable: false);
        var body = doc.MainDocumentPart?.Document.Body;
        if (body == null)
        {
            throw new NotSupportedException("File .docx không có nội dung văn bản.");
        }

        var sb = new StringBuilder();
        foreach (var paragraph in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Paragraph>())
        {
            var text = paragraph.InnerText;
            if (!string.IsNullOrWhiteSpace(text))
            {
                sb.AppendLine(text.Trim());
            }
        }

        return EnsureHasText(sb.ToString(), "File .docx không trích xuất được text.");
    }

    /// <summary>
    /// PDF theo 3 tầng, tầng nào đọc được thì dừng và GHI RÕ phương thức:
    /// 1. Đọc lớp chữ có sẵn (PDF sinh từ máy tính) — nhanh, chính xác nhất;
    /// 2. Không có lớp chữ → OCR tiêu chuẩn (200 DPI);
    /// 3. OCR tiêu chuẩn đọc được quá ít → OCR NÂNG CAO (300 DPI, chậm hơn nhưng nét hơn).
    /// </summary>
    private static ExtractionResult ExtractPdfDetailed(MemoryStream stream)
    {
        // Tầng 1: lớp chữ có sẵn
        var sb = new StringBuilder();
        using (var pdf = PdfDocument.Open(stream))
        {
            foreach (var page in pdf.GetPages())
            {
                var text = page.Text;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    sb.AppendLine(text.Trim());
                    sb.AppendLine();
                }
            }
        }
        var extracted = sb.ToString();
        if (!string.IsNullOrWhiteSpace(extracted))
        {
            return new ExtractionResult(extracted.Trim(), "Đọc lớp chữ có sẵn trong PDF");
        }

        // Tầng 2: OCR tiêu chuẩn
        var standard = TryOcrPdf(stream, OcrRenderDpi);
        if (standard is { Length: >= 200 })
        {
            return new ExtractionResult(standard, $"PDF scan không có lớp chữ — đã OCR tiếng Việt (tiêu chuẩn, {OcrRenderDpi} DPI)");
        }

        // Tầng 3: OCR nâng cao — render nét hơn, chậm hơn
        var enhanced = TryOcrPdf(stream, EnhancedOcrRenderDpi);
        if (enhanced is { Length: >= 200 })
        {
            return new ExtractionResult(enhanced,
                $"PDF scan — OCR tiêu chuẩn không đọc được, đã dùng OCR NÂNG CAO ({EnhancedOcrRenderDpi} DPI)");
        }

        throw new NotSupportedException(OcrAvailable
            ? "File PDF là bản scan; đã thử cả OCR tiêu chuẩn lẫn OCR nâng cao nhưng không nhận ra được chữ "
              + "(ảnh quá mờ/nghiêng). Hãy scan lại rõ hơn hoặc dùng bản PDF gốc có chữ."
            : "File PDF là bản scan và hệ thống chưa tự tải được dữ liệu OCR tiếng Việt (cần mạng ra github.com). "
              + "Kiểm tra mạng của máy chủ rồi upload lại, hoặc tải tay file vie.traineddata "
              + "(github.com/tesseract-ocr/tessdata_best) vào thư mục Ocr/tessdata của API rồi khởi động lại.");
    }

    // ---------------------------------------------------------------
    // OCR PDF scan — Tesseract (nguồn mở) + PDFtoImage (render trang bằng pdfium).
    // Chạy hoàn toàn offline; chỉ cần thả file vie.traineddata vào Ocr/tessdata.
    // ---------------------------------------------------------------

    /// <summary>Thư mục chứa dữ liệu nhận dạng của Tesseract (vie.traineddata).</summary>
    private static readonly string OcrDataPath =
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Ocr", "tessdata");

    /// <summary>OCR sẵn sàng khi đã có dữ liệu tiếng Việt.</summary>
    private static bool OcrAvailable => File.Exists(Path.Combine(OcrDataPath, "vie.traineddata"));

    /// <summary>URL dữ liệu OCR tiếng Việt bản CHÍNH XÁC (tessdata_best, ~15MB).</summary>
    private const string VieTrainedDataUrl = "https://github.com/tesseract-ocr/tessdata_best/raw/main/vie.traineddata";

    private static readonly object OcrDownloadLock = new();
    private static bool _ocrDownloadAttempted;

    /// <summary>
    /// Đảm bảo có dữ liệu OCR: chưa có thì TỰ TẢI một lần từ GitHub (bản best).
    /// Tải thất bại (máy chủ không có mạng) thì không thử lại cho tới khi app khởi
    /// động lại — tránh mỗi lần upload lại chờ timeout mạng.
    /// </summary>
    private static bool EnsureOcrData()
    {
        if (OcrAvailable)
        {
            return true;
        }
        lock (OcrDownloadLock)
        {
            if (OcrAvailable)
            {
                return true;
            }
            if (_ocrDownloadAttempted)
            {
                return false;
            }
            _ocrDownloadAttempted = true;
            try
            {
                Directory.CreateDirectory(OcrDataPath);
                using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };
                var bytes = http.GetByteArrayAsync(VieTrainedDataUrl).GetAwaiter().GetResult();
                // Ghi ra file tạm rồi đổi tên — tránh file dở dang nếu đứt giữa chừng
                var target = Path.Combine(OcrDataPath, "vie.traineddata");
                var temp = target + ".downloading";
                File.WriteAllBytes(temp, bytes);
                File.Move(temp, target, overwrite: true);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    /// <summary>Chặn số trang OCR để một văn bản quá dày không chiếm máy chủ hàng chục phút.</summary>
    private const int MaxOcrPages = 300;

    /// <summary>DPI render trang trước khi OCR — 200 đủ nét cho văn bản hành chính, không quá nặng.</summary>
    private const int OcrRenderDpi = 200;

    /// <summary>DPI cho lượt OCR NÂNG CAO — nét hơn (đọc được scan mờ) nhưng chậm hơn ~2 lần.</summary>
    private const int EnhancedOcrRenderDpi = 300;

    /// <summary>OCR toàn bộ trang của PDF scan ở DPI chỉ định; null nếu không có dữ liệu OCR hoặc không nhận ra chữ.</summary>
    private static string? TryOcrPdf(MemoryStream stream, int renderDpi)
    {
        if (!EnsureOcrData())
        {
            return null;
        }

        stream.Position = 0;
        var pageCount = PDFtoImage.Conversion.GetPageCount(stream, leaveOpen: true);
        var sb = new StringBuilder();

        using var engine = new TesseractEngine(OcrDataPath, "vie", EngineMode.Default);
        for (var i = 0; i < Math.Min(pageCount, MaxOcrPages); i++)
        {
            stream.Position = 0;
            using var bitmap = PDFtoImage.Conversion.ToImage(
                stream,
                leaveOpen: true,
                page: i,
                options: new PDFtoImage.RenderOptions(Dpi: renderDpi));
            using var png = bitmap.Encode(SKEncodedImageFormat.Png, 100);
            using var pix = Pix.LoadFromMemory(png.ToArray());
            using var page = engine.Process(pix);

            var pageText = page.GetText();
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                sb.AppendLine(pageText.Trim());
                sb.AppendLine();
            }
        }

        var text = sb.ToString().Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    /// <summary>
    /// Mỗi sheet xuất thành khối text. Dòng dữ liệu được GHÉP VỚI HEADER cột thành
    /// dạng tự mô tả ("Mã: BT2; Mức hưởng: 100; ...") — để khi chia chunk, bất kỳ
    /// đoạn nào cũng tự hiểu được (AI không phải đoán cột nào nghĩa gì), và từ khóa
    /// trong header xuất hiện ở mọi dòng giúp truy hồi chính xác.
    /// </summary>
    private static string ExtractXlsx(MemoryStream stream)
    {
        using var doc = SpreadsheetDocument.Open(stream, isEditable: false);
        var workbookPart = doc.WorkbookPart;
        if (workbookPart == null)
        {
            throw new NotSupportedException("File .xlsx không đọc được workbook.");
        }

        var sharedStrings = workbookPart.SharedStringTablePart?.SharedStringTable
            ?.Elements<SharedStringItem>().Select(i => i.InnerText).ToList();

        var sb = new StringBuilder();
        foreach (var sheet in workbookPart.Workbook.Descendants<Sheet>())
        {
            if (sheet.Id?.Value == null)
            {
                continue;
            }

            sb.AppendLine($"### Sheet: {sheet.Name}");
            var worksheetPart = (WorksheetPart)workbookPart.GetPartById(sheet.Id.Value!);

            List<string>? headers = null;
            foreach (var row in worksheetPart.Worksheet.Descendants<Row>())
            {
                var cells = row.Elements<Cell>()
                    .Select(c => ReadCellValue(c, sharedStrings))
                    .ToList();
                AppendSheetRow(sb, cells, ref headers);
            }

            sb.AppendLine();
        }

        return EnsureHasText(sb.ToString(), "File .xlsx không có dữ liệu.");
    }

    /// <summary>
    /// Ghi một dòng bảng: dòng tiêu đề lẻ (1 ô) giữ nguyên; dòng đầu tiên có từ 2 ô
    /// trở lên làm HEADER; các dòng sau ghép "Header: giá trị" từng ô.
    /// </summary>
    private static void AppendSheetRow(StringBuilder sb, List<string?> cells, ref List<string>? headers)
    {
        var nonEmpty = cells.Count(v => !string.IsNullOrWhiteSpace(v));
        if (nonEmpty == 0)
        {
            return;
        }

        // Dòng chỉ có 1 ô (tiêu đề bảng, ghi chú) — giữ nguyên văn
        if (nonEmpty == 1 && headers == null)
        {
            sb.AppendLine(cells.First(v => !string.IsNullOrWhiteSpace(v))!.Trim());
            return;
        }

        if (headers == null)
        {
            headers = cells.Select((v, i) => string.IsNullOrWhiteSpace(v) ? $"Cột {i + 1}" : v!.Trim()).ToList();
            sb.AppendLine("Các cột: " + string.Join(" | ", headers));
            return;
        }

        var parts = new List<string>();
        for (var i = 0; i < cells.Count; i++)
        {
            var value = cells[i]?.Trim();
            if (string.IsNullOrEmpty(value))
            {
                continue;
            }
            var header = i < headers.Count ? headers[i] : $"Cột {i + 1}";
            parts.Add($"{header}: {value}");
        }
        sb.AppendLine(string.Join("; ", parts));
    }

    private static string ReadCellValue(Cell cell, List<string>? sharedStrings)
    {
        var value = cell.CellValue?.InnerText ?? "";
        if (cell.DataType?.Value == CellValues.SharedString
            && sharedStrings != null
            && int.TryParse(value, out var index)
            && index >= 0 && index < sharedStrings.Count)
        {
            return sharedStrings[index];
        }
        return value;
    }

    private static string EnsureHasText(string text, string emptyMessage)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new NotSupportedException(emptyMessage);
        }
        return text.Trim();
    }
}
