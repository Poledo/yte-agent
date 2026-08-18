using System;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Trục cơ sở KCB trong dữ liệu: tài khoản, kho tri thức và nhật ký gắn được vào
    /// một cơ sở; thêm bảng cấu hình hiển thị robot riêng theo cơ sở.
    ///
    /// Cột FacilityId đều NULLABLE và mọi dòng có sẵn nhận null — null nghĩa là "cấp
    /// hệ thống / dùng chung", đúng với hiện trạng trước khi phân tách. Không dòng nào
    /// bị ẩn đi sau khi migration chạy.
    ///
    /// Khóa ngoại chọn SetNull chứ không Cascade: xóa một cơ sở không được kéo theo
    /// tài khoản, văn bản hay nhật ký của nó.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260816100000_AddTenantColumns")]
    public partial class AddTenantColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ===== app_users =====
            migrationBuilder.AddColumn<long>(
                name: "FacilityId",
                schema: "public",
                table: "app_users",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSuperAdmin",
                schema: "public",
                table: "app_users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_app_users_FacilityId",
                schema: "public",
                table: "app_users",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_app_users_facilities_FacilityId",
                schema: "public",
                table: "app_users",
                column: "FacilityId",
                principalSchema: "public",
                principalTable: "facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ===== medical_documents =====
            migrationBuilder.AddColumn<long>(
                name: "FacilityId",
                schema: "public",
                table: "medical_documents",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_medical_documents_FacilityId",
                schema: "public",
                table: "medical_documents",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_medical_documents_facilities_FacilityId",
                schema: "public",
                table: "medical_documents",
                column: "FacilityId",
                principalSchema: "public",
                principalTable: "facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ===== audit_logs =====
            migrationBuilder.AddColumn<long>(
                name: "FacilityId",
                schema: "public",
                table: "audit_logs",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_FacilityId",
                schema: "public",
                table: "audit_logs",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_facilities_FacilityId",
                schema: "public",
                table: "audit_logs",
                column: "FacilityId",
                principalSchema: "public",
                principalTable: "facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // ===== facility_extension_configs =====
            migrationBuilder.CreateTable(
                name: "facility_extension_configs",
                schema: "public",
                columns: table => new
                {
                    FacilityId = table.Column<long>(type: "bigint", nullable: false),
                    ConfigJson = table.Column<string>(type: "jsonb", nullable: false),
                    UpdatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false,
                        defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedBy = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facility_extension_configs", x => x.FacilityId);
                    table.ForeignKey(
                        name: "FK_facility_extension_configs_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalSchema: "public",
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "facility_extension_configs",
                schema: "public");

            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_facilities_FacilityId",
                schema: "public",
                table: "audit_logs");

            migrationBuilder.DropIndex(
                name: "IX_audit_logs_FacilityId",
                schema: "public",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                schema: "public",
                table: "audit_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_medical_documents_facilities_FacilityId",
                schema: "public",
                table: "medical_documents");

            migrationBuilder.DropIndex(
                name: "IX_medical_documents_FacilityId",
                schema: "public",
                table: "medical_documents");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                schema: "public",
                table: "medical_documents");

            migrationBuilder.DropForeignKey(
                name: "FK_app_users_facilities_FacilityId",
                schema: "public",
                table: "app_users");

            migrationBuilder.DropIndex(
                name: "IX_app_users_FacilityId",
                schema: "public",
                table: "app_users");

            migrationBuilder.DropColumn(
                name: "IsSuperAdmin",
                schema: "public",
                table: "app_users");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                schema: "public",
                table: "app_users");
        }
    }
}
