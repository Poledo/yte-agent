using Microsoft.AspNetCore.Mvc;

namespace AIValidation.Api.Services.Tenancy;

/// <summary>
/// Câu trả lời chuẩn khi một thao tác chạm vào cơ sở KCB ngoài phạm vi của người gọi.
///
/// Cố ý trả 403 kèm lý do chứ KHÔNG trả 404 giả vờ "không tìm thấy": người quản trị cơ
/// sở gõ nhầm mã đơn vị sẽ mất hàng giờ tưởng dữ liệu bị mất. Ở đây rò rỉ thông tin
/// không đáng kể — họ chỉ biết mã đó tồn tại ở đâu đó, thứ vốn đã in trên giấy tờ BHXH.
///
/// Cũng cố ý KHÔNG âm thầm ghi vào cơ sở của chính họ: ghi sai chỗ mà không báo là cách
/// nhanh nhất để hỏng dữ liệu mà không ai biết.
/// </summary>
public static class TenantForbid
{
    /// <summary>403 cho thao tác ngoài phạm vi cơ sở.</summary>
    public static ObjectResult OutOfScope(string? facility = null, string? what = null)
    {
        var subject = string.IsNullOrWhiteSpace(what) ? "Dữ liệu này" : what;
        var suffix = string.IsNullOrWhiteSpace(facility)
            ? "dùng chung toàn hệ thống, chỉ quản trị hệ thống được thao tác."
            : $"thuộc cơ sở {facility}, ngoài phạm vi quản lý của bạn.";

        return new ObjectResult(new
        {
            message = $"{subject} {suffix}",
            reason = "OutOfFacilityScope",
            facility,
        })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}
