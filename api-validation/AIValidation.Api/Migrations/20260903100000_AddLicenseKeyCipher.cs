using System;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Thêm cột KeyCipher lên facility_licenses: bản mã hóa AES-256-GCM của khóa
    /// bản quyền gốc, để quản trị xem lại khóa khi cơ sở báo mất (thay vì cấp lại
    /// khóa rồi nhập lại cho cả tuyến máy trạm).
    ///
    /// Cột NULLABLE, mọi dòng có sẵn nhận null — null nghĩa là "khóa cấp trước khi
    /// có cột này" hoặc "chưa cấu hình khóa mã hóa lúc cấp": những hợp đồng đó không
    /// xem lại được, phải cấp lại khóa như hành vi cũ.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// property FacilityLicense.KeyCipher trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260903100000_AddLicenseKeyCipher")]
    public partial class AddLicenseKeyCipher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KeyCipher",
                schema: "public",
                table: "facility_licenses",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KeyCipher",
                schema: "public",
                table: "facility_licenses");
        }
    }
}
