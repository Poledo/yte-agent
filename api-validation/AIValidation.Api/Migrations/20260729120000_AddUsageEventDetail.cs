using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Thêm 2 cột vào usage_events phục vụ màn "Lịch sử hoạt động":
    /// - Preview: tóm tắt ngắn hiển thị trên danh sách;
    /// - DetailJson: nội dung phản hồi đầy đủ để xem lại (hỏi đáp: câu hỏi/câu trả lời/nguồn;
    ///   kiểm tra XML: danh sách vấn đề — chỉ MA_LK, không chứa định danh bệnh nhân).
    /// Migration viết tay — cấu trúc khớp entity UsageEvent.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260729120000_AddUsageEventDetail")]
    public partial class AddUsageEventDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Preview",
                schema: "public",
                table: "usage_events",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetailJson",
                schema: "public",
                table: "usage_events",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Preview", schema: "public", table: "usage_events");
            migrationBuilder.DropColumn(name: "DetailJson", schema: "public", table: "usage_events");
        }
    }
}
