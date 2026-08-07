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
    /// Bảng facilities: cây đơn vị (cơ sở KCB) cha ↔ con ↔ cháu. Dùng để xác định
    /// hồ sơ của một đơn vị được đối chiếu bằng danh mục HIS của chính nó, hay được
    /// mượn danh mục của đơn vị cấp trên khi chính nó chưa nạp.
    ///
    /// Kèm cột catalog_sources.ContentHash: extension nạp danh mục thẳng từ HIS mỗi
    /// lần bấm nút, phần lớn file không đổi — so hash để bỏ qua file trùng thay vì
    /// nạp lại hàng chục nghìn dòng.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// entity Facility / CatalogSource trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260806100000_AddFacilitiesAndCatalogHash")]
    public partial class AddFacilitiesAndCatalogHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentHash",
                schema: "public",
                table: "catalog_sources",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "facilities",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ParentId = table.Column<long>(type: "bigint", nullable: true),
                    InheritCatalogFromParent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facilities", x => x.Id);
                    // Cha bị xóa thì con thành đơn vị gốc chứ không biến mất theo
                    table.ForeignKey(
                        name: "FK_facilities_facilities_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "public",
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            // Mã cơ sở KCB là khóa nối với danh mục HIS và thẻ MACSKCB của file XML 130
            migrationBuilder.CreateIndex(
                name: "IX_facilities_Code",
                schema: "public",
                table: "facilities",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facilities_ParentId",
                schema: "public",
                table: "facilities",
                column: "ParentId");

            // Tự tạo sẵn đơn vị cho các mã cơ sở đã có danh mục trong hệ thống,
            // để danh sách không trống khi mở màn hình cây đơn vị lần đầu.
            // Tên tạm bằng chính mã — người dùng sửa lại trên web admin.
            migrationBuilder.Sql(@"
                INSERT INTO public.facilities (""Code"", ""Name"")
                SELECT DISTINCT s.""FacilityCode"", 'Cơ sở ' || s.""FacilityCode""
                FROM public.catalog_sources s
                WHERE s.""FacilityCode"" IS NOT NULL AND s.""FacilityCode"" <> ''
                ON CONFLICT (""Code"") DO NOTHING;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "facilities",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "ContentHash",
                schema: "public",
                table: "catalog_sources");
        }
    }
}
