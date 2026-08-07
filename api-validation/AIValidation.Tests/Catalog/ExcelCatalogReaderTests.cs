using AIValidation.Api.Providers.Catalog;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Xunit;

namespace AIValidation.Tests.Catalog;

/// <summary>
/// Test trình đọc file danh mục Excel.
///
/// Bối cảnh: HIS xuất danh mục theo TRANG — hết mỗi trang lại chèn một dòng trống
/// rồi in lại y nguyên dòng tiêu đề. File "E_duoc_loai_vt" thật của cơ sở 58028 có
/// dòng tiêu đề lặp ở dòng 30/52. Trước khi sửa, dòng đó được đọc thành một mục
/// danh mục rác, và cột DVTT nhận thêm giá trị "DVTT" khiến hệ thống tưởng file
/// gộp nhiều cơ sở KCB rồi chặn không cho nạp.
/// </summary>
public class ExcelCatalogReaderTests
{
    [Fact]
    public void BoQuaDongTieuDeInLaiGiuaFile()
    {
        using var file = BuildXlsx(
            ["Mã loại vật tư", "Tên loại vật tư", "DVTT", "Tạm ngưng"],
            ["TH_YHCT", "Chế phẩm y học cổ truyền", "58028", "0"],
            ["", "", "", ""],
            ["Mã loại vật tư", "Tên loại vật tư", "DVTT", "Tạm ngưng"],
            ["VT_TH", "Vật tư tiêu hao", "58028", "0"]);

        var sheet = new ExcelCatalogReader().Read(file, "E_duoc_loai_vt.xlsx");

        Assert.Equal(2, sheet.Rows.Count);
        Assert.All(sheet.Rows, r => Assert.Equal("58028", r["DVTT"]));
    }

    [Fact]
    public void GiuDongDuLieuTrungTenMotCotDuyNhat()
    {
        // Chỉ 1 ô trùng tên cột thì đó là dữ liệu thật, không phải tiêu đề in lại.
        using var file = BuildXlsx(
            ["Mã", "Tên", "DVTT"],
            ["DVTT", "Vật tư đặc biệt", "58028"]);

        var sheet = new ExcelCatalogReader().Read(file, "E_vat_tu.xlsx");

        Assert.Single(sheet.Rows);
        Assert.Equal("DVTT", sheet.Rows[0]["Mã"]);
    }

    /// <summary>Dựng file .xlsx tối giản trong bộ nhớ: dòng đầu là tiêu đề cột.</summary>
    private static MemoryStream BuildXlsx(params string[][] rows)
    {
        var stream = new MemoryStream();
        using (var doc = SpreadsheetDocument.Create(stream, SpreadsheetDocumentType.Workbook))
        {
            var workbookPart = doc.AddWorkbookPart();
            workbookPart.Workbook = new Workbook();
            var worksheetPart = workbookPart.AddNewPart<WorksheetPart>();

            var sheetData = new SheetData();
            for (var r = 0; r < rows.Length; r++)
            {
                var row = new Row { RowIndex = (uint)(r + 1) };
                for (var c = 0; c < rows[r].Length; c++)
                {
                    row.Append(new Cell
                    {
                        CellReference = $"{(char)('A' + c)}{r + 1}",
                        DataType = CellValues.InlineString,
                        InlineString = new InlineString(new Text(rows[r][c])),
                    });
                }
                sheetData.Append(row);
            }
            worksheetPart.Worksheet = new Worksheet(sheetData);

            workbookPart.Workbook.Append(new Sheets(new Sheet
            {
                Id = workbookPart.GetIdOfPart(worksheetPart),
                SheetId = 1,
                Name = "Danh mục",
            }));
        }

        stream.Position = 0;
        return stream;
    }
}
