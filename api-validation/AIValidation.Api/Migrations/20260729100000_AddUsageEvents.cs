using System;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Bảng usage_events: mỗi lượt hỏi đáp AI / kiểm tra XML 130 ghi một dòng
    /// số liệu tổng hợp (không chứa nội dung hỏi hay dữ liệu hồ sơ) — phục vụ
    /// biểu đồ thống kê theo thời gian trên dashboard web admin.
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// entity UsageEvent trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260729100000_AddUsageEvents")]
    public partial class AddUsageEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "usage_events",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    FacilityCode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    StaffCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    HosoCount = table.Column<int>(type: "integer", nullable: false),
                    ErrorCount = table.Column<int>(type: "integer", nullable: false),
                    WarningCount = table.Column<int>(type: "integer", nullable: false),
                    XuatToanRisk = table.Column<bool>(type: "boolean", nullable: false),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usage_events", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_usage_events_CreatedAt_EventType",
                schema: "public",
                table: "usage_events",
                columns: new[] { "CreatedAt", "EventType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "usage_events",
                schema: "public");
        }
    }
}
