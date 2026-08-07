using System;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Thêm ngày hiệu lực / hết hiệu lực cho văn bản kho tri thức (medical_documents)
    /// và văn bản đã tải từ vbpl.vn (legal_downloads). Văn bản hết hiệu lực bị loại
    /// khỏi truy hồi RAG. Migration viết tay (môi trường không chạy được dotnet-ef).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260722090000_AddEffectiveDates")]
    public partial class AddEffectiveDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveDate", schema: "public", table: "medical_documents",
                type: "timestamp with time zone", nullable: true);
            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiryDate", schema: "public", table: "medical_documents",
                type: "timestamp with time zone", nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveDate", schema: "public", table: "legal_downloads",
                type: "timestamp with time zone", nullable: true);
            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiryDate", schema: "public", table: "legal_downloads",
                type: "timestamp with time zone", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EffectiveDate", schema: "public", table: "medical_documents");
            migrationBuilder.DropColumn(name: "ExpiryDate", schema: "public", table: "medical_documents");
            migrationBuilder.DropColumn(name: "EffectiveDate", schema: "public", table: "legal_downloads");
            migrationBuilder.DropColumn(name: "ExpiryDate", schema: "public", table: "legal_downloads");
        }
    }
}
