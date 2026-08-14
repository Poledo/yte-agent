using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Cột facilities.Tuyen: phân tuyến cơ sở KCB (trung ương → tỉnh đa khoa →
    /// chuyên khoa → xã). Lưu TÊN enum chứ không lưu số cho dễ đọc khi đối soát
    /// bằng SQL.
    ///
    /// Đơn vị đã có trong CSDL nhận 'KhongXacDinh' - phân tuyến là việc người quản
    /// trị làm sau, không đoán hộ theo độ sâu của cây vì cây tổ chức và tuyến
    /// chuyên môn không phải lúc nào cũng trùng nhau.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef) - cấu trúc khớp
    /// entity Facility trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260814100000_AddFacilityTuyen")]
    public partial class AddFacilityTuyen : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Tuyen",
                schema: "public",
                table: "facilities",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "KhongXacDinh");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Tuyen",
                schema: "public",
                table: "facilities");
        }
    }
}
