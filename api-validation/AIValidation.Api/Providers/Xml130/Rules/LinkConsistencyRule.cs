using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra tính nhất quán liên bảng:
/// - MA_LK của mọi bảng con phải khớp MA_LK của XML1.
/// - MA_CSKCB các bảng khớp nhau.
/// - Thông tin hành chính (HO_TEN, MA_THE_BHYT) của giấy tờ kèm theo khớp XML1.
/// </summary>
public class LinkConsistencyRule : IXml130Rule
{
    public string RuleId => "LINK";
    public string RuleName => "Kiểm tra liên kết giữa các bảng";

    public Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var maLk = hoso.MaLk;
        var maCskcb = hoso.GetField("XML1", "MA_CSKCB");
        var hoTen = hoso.GetField("XML1", "HO_TEN");
        var maThe = hoso.GetField("XML1", "MA_THE_BHYT");

        foreach (var (tableId, rows) in hoso.Tables)
        {
            if (tableId.Equals("XML1", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var multiRow = rows.Count > 1;
            foreach (var row in rows)
            {
                cancellationToken.ThrowIfCancellationRequested();
                int? rowIndex = multiRow ? row.RowIndex : null;

                // MA_LK khớp XML1
                var rowMaLk = row.Get("MA_LK");
                if (maLk != null && rowMaLk != null && !rowMaLk.Equals(maLk, StringComparison.Ordinal))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-L001",
                        Severity = ValidationSeverity.Error,
                        Group = "Link",
                        Table = tableId,
                        Field = "MA_LK",
                        RowIndex = rowIndex,
                        Value = rowMaLk,
                        Message = $"[{tableId}] MA_LK \"{rowMaLk}\" không khớp MA_LK hồ sơ \"{maLk}\" — bảng chi tiết không liên kết được, toàn bộ chi phí bảng này bị từ chối.",
                        XuatToanRisk = true
                    });
                }

                // MA_CSKCB khớp
                var rowCskcb = row.Get("MA_CSKCB");
                if (maCskcb != null && rowCskcb != null && !rowCskcb.Equals(maCskcb, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-L002",
                        Severity = ValidationSeverity.Warning,
                        Group = "Link",
                        Table = tableId,
                        Field = "MA_CSKCB",
                        RowIndex = rowIndex,
                        Value = rowCskcb,
                        Message = $"[{tableId}] Mã cơ sở KCB \"{rowCskcb}\" khác với XML1 (\"{maCskcb}\").",
                        XuatToanRisk = false
                    });
                }

                // Thông tin hành chính giấy tờ kèm theo (XML7, XML13, XML14...)
                var rowHoTen = row.Get("HO_TEN");
                if (hoTen != null && rowHoTen != null
                    && !string.Equals(rowHoTen.Trim(), hoTen.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-L003",
                        Severity = ValidationSeverity.Error,
                        Group = "Link",
                        Table = tableId,
                        Field = "HO_TEN",
                        RowIndex = rowIndex,
                        Value = rowHoTen,
                        Message = $"[{tableId}] Họ tên \"{rowHoTen}\" không khớp với XML1 (\"{hoTen}\") — giấy tờ kèm theo không hợp lệ.",
                        XuatToanRisk = true
                    });
                }

                var rowMaThe = row.Get("MA_THE_BHYT");
                if (maThe != null && rowMaThe != null && !rowMaThe.Equals(maThe, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = $"{tableId}-L004",
                        Severity = ValidationSeverity.Error,
                        Group = "Link",
                        Table = tableId,
                        Field = "MA_THE_BHYT",
                        RowIndex = rowIndex,
                        Value = rowMaThe,
                        Message = $"[{tableId}] Mã thẻ BHYT \"{rowMaThe}\" không khớp với XML1 (\"{maThe}\").",
                        XuatToanRisk = true
                    });
                }
            }
        }

        // Hồ sơ phải có XML1
        if (hoso.GetRows("XML1").Count == 0)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "HOSO-L001",
                Severity = ValidationSeverity.Error,
                Group = "Link",
                Table = "XML1",
                Field = "TONG_HOP",
                Message = "Hồ sơ thiếu bảng tổng hợp XML1 (TONG_HOP) — không thể gửi giám định.",
                XuatToanRisk = true
            });
        }

        return Task.FromResult(issues);
    }
}
