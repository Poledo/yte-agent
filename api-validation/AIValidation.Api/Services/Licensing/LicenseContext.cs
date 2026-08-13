using AIValidation.Api.Data.Entities.Licensing;

namespace AIValidation.Api.Services.Licensing;

/// <summary>Kết quả đối chiếu mã cơ sở trong hồ sơ với phạm vi giấy phép.</summary>
/// <param name="Allowed">Cho đi tiếp hay không.</param>
/// <param name="Message">Thông báo tiếng Việt khi bị chặn.</param>
public sealed record FacilityScopeResult(bool Allowed, string Message = "")
{
    /// <summary>Hợp lệ.</summary>
    public static readonly FacilityScopeResult Ok = new(true);
}

/// <summary>
/// Giấy phép đã phân giải cho request hiện tại. Được cổng <see cref="RequireLicenseAttribute"/>
/// điền vào, các controller đọc ra để ghi sổ tính tiền và đối chiếu phạm vi.
/// </summary>
public interface ILicenseContext
{
    /// <summary>Giấy phép của request (null khi chạy chế độ Off/Warn mà client không gửi khóa).</summary>
    FacilityLicense? License { get; }

    /// <summary>Có giấy phép hợp lệ hay không.</summary>
    bool HasLicense { get; }

    /// <summary>Mã nhân viên client khai qua header X-Staff-Code.</summary>
    string? StaffCode { get; }

    /// <summary>
    /// Mã cơ sở KCB CHỊU TIỀN — luôn lấy từ giấy phép, không bao giờ lấy từ nội dung
    /// file XML. Null khi request không có giấy phép.
    /// </summary>
    string? BilledFacilityCode { get; }

    /// <summary>Cổng cấp phép ghi kết quả phân giải vào đây.</summary>
    void Set(FacilityLicense? license, string? staffCode);

    /// <summary>
    /// Mã cơ sở trong hồ sơ có nằm trong phạm vi giấy phép không.
    ///
    /// Gọi SAU khi đã bóc được MACSKCB từ file — cổng cấp phép chạy trước lúc đọc
    /// file nên không kiểm hộ được. Chế độ Off/Warn luôn cho qua (Warn có ghi log).
    /// </summary>
    Task<FacilityScopeResult> CheckFacilityAsync(
        string? facilityCode, CancellationToken cancellationToken = default);
}

/// <inheritdoc />
public sealed class LicenseContext : ILicenseContext
{
    private readonly ILicenseResolver _resolver;
    private readonly LicensingOptions _options;
    private readonly ILogger<LicenseContext> _logger;

    public LicenseContext(
        ILicenseResolver resolver,
        Microsoft.Extensions.Options.IOptions<LicensingOptions> options,
        ILogger<LicenseContext> logger)
    {
        _resolver = resolver ?? throw new ArgumentNullException(nameof(resolver));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public FacilityLicense? License { get; private set; }

    public bool HasLicense => License is not null;

    public string? StaffCode { get; private set; }

    public string? BilledFacilityCode => License?.FacilityCode;

    public void Set(FacilityLicense? license, string? staffCode)
    {
        License = license;
        StaffCode = string.IsNullOrWhiteSpace(staffCode) ? null : staffCode.Trim();
    }

    public async Task<FacilityScopeResult> CheckFacilityAsync(
        string? facilityCode, CancellationToken cancellationToken = default)
    {
        if (License is null || string.IsNullOrWhiteSpace(facilityCode))
        {
            return FacilityScopeResult.Ok;
        }

        if (await _resolver.CoversFacilityAsync(License, facilityCode, cancellationToken))
        {
            return FacilityScopeResult.Ok;
        }

        // Đây là dấu hiệu đáng ngờ thật sự: khóa của đơn vị này nhưng hồ sơ khai đơn vị
        // khác. Ghi log ở mức warning kể cả khi không chặn, để còn lần ra.
        _logger.LogWarning(
            "Hồ sơ khai mã cơ sở {Declared} nhưng khóa bản quyền thuộc {Licensed} (giấy phép {LicenseId})",
            facilityCode, License.FacilityCode, License.Id);

        if (_options.Mode != LicensingMode.Enforce)
        {
            return FacilityScopeResult.Ok;
        }

        return new FacilityScopeResult(
            false,
            $"Hồ sơ khai mã cơ sở KCB \"{facilityCode}\" không thuộc phạm vi khóa bản quyền "
            + $"của đơn vị \"{License.FacilityCode}\". Kiểm tra lại mã cơ sở trong hồ sơ, "
            + "hoặc liên hệ đơn vị cung cấp dịch vụ để mở rộng phạm vi hợp đồng.");
    }
}
