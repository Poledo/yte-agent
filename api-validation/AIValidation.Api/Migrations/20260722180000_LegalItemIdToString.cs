using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Đổi legal_downloads.ItemId từ bigint sang varchar(100): vbpl.vn bản mới định danh
    /// văn bản bằng GUID ("4fda4da0-80ec-...") thay vì số — số cũ ("181847") giữ nguyên
    /// giá trị dạng chuỗi. Dùng SQL thô vì bigint → text cần USING (không cast ngầm được).
    /// Migration viết tay (môi trường không chạy được dotnet-ef).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260722180000_LegalItemIdToString")]
    public partial class LegalItemIdToString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """ALTER TABLE public.legal_downloads ALTER COLUMN "ItemId" TYPE character varying(100) USING "ItemId"::text;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """ALTER TABLE public.legal_downloads ALTER COLUMN "ItemId" TYPE bigint USING "ItemId"::bigint;""");
        }
    }
}
