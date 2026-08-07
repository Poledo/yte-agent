using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Tests.Xml130;

/// <summary>
/// Builder dựng hồ sơ XML 130 tối giản cho unit test rule engine:
/// chỉ điền đúng các trường mà rule đang xét, tránh fixture XML dài dòng.
/// </summary>
public sealed class HosoBuilder
{
    private readonly Xml130Hoso _hoso = new();

    /// <summary>Đặt các trường XML1 (thông tin chung — mỗi hồ sơ một dòng).</summary>
    public HosoBuilder WithXml1(params (string Field, string Value)[] fields)
    {
        SetRow("XML1", 1, fields);
        return this;
    }

    /// <summary>Thêm một dòng chi tiết vào bảng bất kỳ (XML2 thuốc, XML3 DVKT...).</summary>
    public HosoBuilder AddRow(string tableId, params (string Field, string Value)[] fields)
    {
        var rows = GetOrAddTable(tableId);
        SetRow(tableId, rows.Count + 1, fields);
        return this;
    }

    public Xml130Hoso Build() => _hoso;

    /// <summary>Gói hồ sơ thành đầu vào cho rule kiểm tra chéo giữa nhiều hồ sơ.</summary>
    public Xml130BatchHoso BuildBatch(string fileName) => new() { FileName = fileName, Hoso = _hoso };

    private void SetRow(string tableId, int rowIndex, (string Field, string Value)[] fields)
    {
        var row = new Xml130Row { TableId = tableId, RowIndex = rowIndex };
        foreach (var (field, value) in fields)
        {
            row.Fields[field] = value;
        }
        GetOrAddTable(tableId).Add(row);
    }

    private List<Xml130Row> GetOrAddTable(string tableId)
    {
        if (!_hoso.Tables.TryGetValue(tableId, out var rows))
        {
            _hoso.Tables[tableId] = rows = new List<Xml130Row>();
        }
        return rows;
    }
}
