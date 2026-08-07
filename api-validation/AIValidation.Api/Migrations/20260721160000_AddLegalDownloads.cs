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
    /// Bảng legal_downloads: văn bản pháp luật đã tải về từ vbpl.vn (chức năng
    /// "Tải văn bản") — lưu thông tin + toàn văn text; nạp kho tri thức là bước riêng.
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// entity LegalDownload trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260721160000_AddLegalDownloads")]
    public partial class AddLegalDownloads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "legal_downloads",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ItemId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    DocNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IssuedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SourceUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    DownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    KnowledgeDocumentId = table.Column<long>(type: "bigint", nullable: true),
                    IngestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_legal_downloads", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_legal_downloads_ItemId",
                schema: "public",
                table: "legal_downloads",
                column: "ItemId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "legal_downloads",
                schema: "public");
        }
    }
}
