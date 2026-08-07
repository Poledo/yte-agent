using System.Text.RegularExpressions;
using AIValidation.Api.Models.Enums;
using AIValidation.Api.Models.Xml130;
using AIValidation.Api.Providers.ICD;
using AIValidation.Api.Providers.ICD.Helpers;
using AIValidation.Api.Providers.Xml130.Interfaces;

namespace AIValidation.Api.Providers.Xml130.Rules;

/// <summary>
/// Kiểm tra chẩn đoán (ICD-10):
/// - MA_BENH_CHINH bắt buộc, đúng định dạng ICD-10.
/// - MA_BENH_KT không trùng mã chính, đúng định dạng.
/// - MA_BENH của dòng chi tiết phải thuộc tập chẩn đoán của hồ sơ.
/// - Đối chiếu danh mục ICD trong DB (tồn tại, còn hiệu lực, phù hợp giới tính/tuổi) nếu danh mục đã nạp.
/// </summary>
public partial class DiagnosisRule : IXml130Rule
{
    public string RuleId => "DIAGNOSIS";
    public string RuleName => "Kiểm tra chẩn đoán ICD";

    private readonly IIcdProvider _icdProvider;
    private readonly ILogger<DiagnosisRule> _logger;

    [GeneratedRegex(@"^[A-TV-Z][0-9]{2}(\.[0-9]{1,2})?$")]
    private static partial Regex IcdRegex();

    public DiagnosisRule(IIcdProvider icdProvider, ILogger<DiagnosisRule> logger)
    {
        _icdProvider = icdProvider ?? throw new ArgumentNullException(nameof(icdProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<Xml130Issue>> ValidateAsync(Xml130Hoso hoso, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(hoso);
        var issues = new List<Xml130Issue>();

        var maBenhChinh = hoso.GetField("XML1", "MA_BENH_CHINH");
        var maBenhKtRaw = hoso.GetField("XML1", "MA_BENH_KT");
        var maBenhKt = (maBenhKtRaw ?? "")
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        // Mã bệnh chính bắt buộc
        if (maBenhChinh == null)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D001",
                Severity = ValidationSeverity.Error,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_CHINH",
                Message = "Thiếu mã bệnh chính (MA_BENH_CHINH) — hồ sơ không đủ điều kiện thanh toán BHYT.",
                XuatToanRisk = true
            });
        }
        else if (!IcdRegex().IsMatch(maBenhChinh))
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D002",
                Severity = ValidationSeverity.Error,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_CHINH",
                Value = maBenhChinh,
                Message = $"Mã bệnh chính \"{maBenhChinh}\" sai định dạng ICD-10 (vd: E11, I10, A00.1).",
                XuatToanRisk = true
            });
        }

        // Mã bệnh kèm theo
        foreach (var kt in maBenhKt)
        {
            if (!IcdRegex().IsMatch(kt))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-D003",
                    Severity = ValidationSeverity.Error,
                    Group = "Diagnosis",
                    Table = "XML1",
                    Field = "MA_BENH_KT",
                    Value = kt,
                    Message = $"Mã bệnh kèm theo \"{kt}\" sai định dạng ICD-10.",
                    XuatToanRisk = true
                });
            }
            if (maBenhChinh != null && kt.Equals(maBenhChinh, StringComparison.OrdinalIgnoreCase))
            {
                issues.Add(new Xml130Issue
                {
                    RuleId = "XML1-D004",
                    Severity = ValidationSeverity.Warning,
                    Group = "Diagnosis",
                    Table = "XML1",
                    Field = "MA_BENH_KT",
                    Value = kt,
                    Message = $"Mã bệnh kèm theo \"{kt}\" trùng với mã bệnh chính — giám định coi là kê trùng chẩn đoán.",
                    XuatToanRisk = false
                });
            }
        }

        if (maBenhKt.Count != maBenhKt.Distinct(StringComparer.OrdinalIgnoreCase).Count())
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D005",
                Severity = ValidationSeverity.Warning,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_KT",
                Value = maBenhKtRaw,
                Message = "Danh sách mã bệnh kèm theo có mã lặp lại.",
                XuatToanRisk = false
            });
        }

        // MA_BENH dòng chi tiết ⊆ chẩn đoán hồ sơ
        var dxSet = new HashSet<string>(maBenhKt, StringComparer.OrdinalIgnoreCase);
        if (maBenhChinh != null)
        {
            dxSet.Add(maBenhChinh);
        }

        if (dxSet.Count > 0)
        {
            foreach (var tableId in new[] { "XML2", "XML3" })
            {
                var group = tableId == "XML2" ? "Drug" : "Service";
                foreach (var row in hoso.GetRows(tableId))
                {
                    var maBenhRow = row.Get("MA_BENH");
                    if (maBenhRow == null)
                    {
                        continue;
                    }

                    var outsiders = maBenhRow
                        .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Where(m => !dxSet.Contains(m))
                        .ToList();

                    if (outsiders.Count > 0)
                    {
                        issues.Add(new Xml130Issue
                        {
                            RuleId = $"{tableId}-D001",
                            Severity = ValidationSeverity.Warning,
                            Group = group,
                            Table = tableId,
                            Field = "MA_BENH",
                            RowIndex = row.RowIndex,
                            Value = maBenhRow,
                            Message = $"[{tableId} dòng {row.RowIndex}] Mã bệnh chỉ định ({string.Join(", ", outsiders)}) không nằm trong chẩn đoán của hồ sơ ({string.Join(", ", dxSet)}) — dịch vụ/thuốc không phù hợp chẩn đoán dễ bị xuất toán.",
                            XuatToanRisk = true
                        });
                    }
                }
            }
        }

        // Đối chiếu danh mục ICD trong DB (nếu đã nạp danh mục)
        await CheckIcdCatalogAsync(hoso, maBenhChinh, maBenhKt, issues, cancellationToken);

        return issues;
    }

    private async Task CheckIcdCatalogAsync(
        Xml130Hoso hoso,
        string? maBenhChinh,
        List<string> maBenhKt,
        List<Xml130Issue> issues,
        CancellationToken cancellationToken)
    {
        try
        {
            await _icdProvider.InitializeAsync(cancellationToken);
            if (_icdProvider.Count == 0)
            {
                return; // danh mục chưa nạp — bỏ qua, không chặn kiểm tra khác
            }

            var gioiTinh = hoso.GetField("XML1", "GIOI_TINH");
            // IIcdProvider quy ước 0=Nam, 1=Nữ; XML130 quy ước 1=Nam, 2=Nữ
            var gender = gioiTinh switch { "1" => 0, "2" => 1, _ => -1 };

            var ngaySinh = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_SINH"));
            var ngayVao = FieldSpecValidator.ParseDate(hoso.GetField("XML1", "NGAY_VAO"));
            var age = ngaySinh.HasValue && ngayVao.HasValue
                ? (int)((ngayVao.Value - ngaySinh.Value).TotalDays / 365.25)
                : -1;

            var allCodes = new List<(string Code, string Field)>();
            if (maBenhChinh != null)
            {
                allCodes.Add((maBenhChinh, "MA_BENH_CHINH"));
            }
            allCodes.AddRange(maBenhKt.Select(kt => (kt, "MA_BENH_KT")));

            foreach (var (code, field) in allCodes)
            {
                if (!_icdProvider.Exists(code))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML1-D006",
                        Severity = ValidationSeverity.Error,
                        Group = "Diagnosis",
                        Table = "XML1",
                        Field = field,
                        Value = code,
                        Message = $"Mã bệnh \"{code}\" không có trong danh mục ICD-10 do Bộ Y tế ban hành.",
                        XuatToanRisk = true
                    });
                    continue;
                }

                if (!_icdProvider.IsActive(code))
                {
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML1-D007",
                        Severity = ValidationSeverity.Error,
                        Group = "Diagnosis",
                        Table = "XML1",
                        Field = field,
                        Value = code,
                        Message = $"Mã bệnh \"{code}\" đã bị hủy/hết hiệu lực trong danh mục ICD-10.",
                        XuatToanRisk = true
                    });
                }

                if (gender >= 0 && !_icdProvider.IsGenderCompatible(code, gender))
                {
                    var gioiTinhLabel = gender == 0 ? "nam" : "nữ";
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML1-D008",
                        Severity = ValidationSeverity.Error,
                        Group = "Diagnosis",
                        Table = "XML1",
                        Field = field,
                        Value = code,
                        Message = $"Mã bệnh \"{code}\" không phù hợp với giới tính bệnh nhân ({gioiTinhLabel}) — lỗi kinh điển bị xuất toán (vd bệnh sản phụ khoa trên bệnh nhân nam).",
                        XuatToanRisk = true
                    });
                }

                if (age >= 0 && !_icdProvider.IsAgeCompatible(code, age))
                {
                    var (min, max) = _icdProvider.GetAgeRestriction(code);
                    issues.Add(new Xml130Issue
                    {
                        RuleId = "XML1-D009",
                        Severity = ValidationSeverity.Warning,
                        Group = "Diagnosis",
                        Table = "XML1",
                        Field = field,
                        Value = code,
                        Message = $"Mã bệnh \"{code}\" không phù hợp độ tuổi bệnh nhân ({age} tuổi; giới hạn {min}–{max}).",
                        XuatToanRisk = true
                    });
                }

                if (field == "MA_BENH_CHINH")
                {
                    CheckPrimaryDiagnosisFlags(code, issues);
                }
            }
        }
        catch (Exception ex)
        {
            // Không để lỗi danh mục ICD chặn toàn bộ kiểm tra hồ sơ
            _logger.LogWarning(ex, "Không đối chiếu được danh mục ICD — bỏ qua bước kiểm tra danh mục");
        }
    }

    /// <summary>
    /// Phân loại mã bệnh chính theo danh mục TT06 (khớp trang tra cứu ICD của BHXH):
    /// - D010 (Error): mã cấm làm bệnh chính hoặc mã dấu †.
    /// - D011 (Warning): mã nhóm — cần chọn mã 4/5 ký tự cụ thể hơn, gợi ý các mã con dùng được.
    /// - D012 (Warning): không khuyến khích dùng làm bệnh chính.
    /// </summary>
    private void CheckPrimaryDiagnosisFlags(string code, List<Xml130Issue> issues)
    {
        var flags = _icdProvider.GetByCode(code)?.DecodedFlags;
        if (flags == null)
        {
            return;
        }

        if (flags.IsNotMain || flags.HasDaggerSymbol)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D010",
                Severity = ValidationSeverity.Error,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_CHINH",
                Value = code,
                Message = flags.HasDaggerSymbol
                    ? $"Mã bệnh \"{code}\" có dấu găm (†) — chỉ dùng làm bệnh kèm theo, không được làm chẩn đoán chính; giám định sẽ từ chối."
                    : $"Mã bệnh \"{code}\" bị danh mục ICD-10 cấm dùng làm chẩn đoán chính — giám định sẽ từ chối.",
                Suggestion = flags.HasDaggerSymbol
                    ? "Dùng mã dấu sao (*) tương ứng làm bệnh chính, mã † đưa vào bệnh kèm theo."
                    : "Chọn mã bệnh chính khác phù hợp với hồ sơ.",
                XuatToanRisk = true
            });
            return;
        }

        if (flags.NeedsSpecificCode)
        {
            var usableChildren = _icdProvider.GetChildCodes(code)
                .Where(c => c.DecodedFlags != null
                    && IcdBitmaskHelper.CanBePrimaryDiagnosis(c.DecodedFlags)
                    && !c.DecodedFlags.NeedsSpecificCode)
                .ToList();

            var listed = string.Join("; ", usableChildren.Take(5).Select(c => $"{c.Code} – {c.Name}"));
            var more = usableChildren.Count > 5 ? $" (và {usableChildren.Count - 5} mã khác)" : "";

            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D011",
                Severity = ValidationSeverity.Warning,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_CHINH",
                Value = code,
                Message = $"Mã bệnh chính \"{code}\" là mã nhóm — cần chọn mã cụ thể hơn. Không nên dùng mã nhóm nếu đã có mã 4/5 ký tự phù hợp với hồ sơ.",
                Suggestion = usableChildren.Count > 0
                    ? $"Gợi ý mã cụ thể hơn có thể dùng làm bệnh chính: {listed}{more}."
                    : "Tra cứu mã 4/5 ký tự trong nhóm này phù hợp với hồ sơ.",
                XuatToanRisk = true
            });
            return;
        }

        if (flags.IsNotRecommendedMain)
        {
            issues.Add(new Xml130Issue
            {
                RuleId = "XML1-D012",
                Severity = ValidationSeverity.Warning,
                Group = "Diagnosis",
                Table = "XML1",
                Field = "MA_BENH_CHINH",
                Value = code,
                Message = $"Mã bệnh chính \"{code}\" thuộc nhóm không khuyến khích dùng làm chẩn đoán chính theo danh mục TT06.",
                Suggestion = "Cân nhắc chọn mã phản ánh đúng bệnh chính của hồ sơ.",
                XuatToanRisk = false
            });
        }
    }
}
