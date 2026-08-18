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
    /// Nhật ký các lần bị tầng phân quyền từ chối — công cụ để dò xem vai trò nào còn
    /// thiếu quyền gì sau khi đổi sang bộ mã quyền mới.
    ///
    /// Chỉ ghi lần TỪ CHỐI: ghi cả lần cho qua thì mỗi request là một dòng INSERT,
    /// bảng phình nhanh hơn cả bảng nghiệp vụ mà không ai đọc.
    ///
    /// Cột Result lưu TÊN enum (varchar) để đọc thẳng bằng SQL lúc đối soát.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260816100200_AddPermissionAuditLog")]
    public partial class AddPermissionAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "permission_audit_logs",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    PermissionCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HttpMethod = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Result = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false,
                        defaultValueSql: "CURRENT_TIMESTAMP"),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permission_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_permission_audit_logs_CreatedAt",
                schema: "public",
                table: "permission_audit_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_permission_audit_logs_PermissionCode_CreatedAt",
                schema: "public",
                table: "permission_audit_logs",
                columns: new[] { "PermissionCode", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "permission_audit_logs",
                schema: "public");
        }
    }
}
