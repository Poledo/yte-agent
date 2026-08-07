using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Thêm cột Embedding (bytea) cho document_chunks — vector ngữ nghĩa của từng đoạn,
    /// tính cosine trong app nên KHÔNG cần cài extension pgvector.
    /// Migration viết tay (môi trường không chạy được dotnet-ef).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260722120000_AddChunkEmbeddings")]
    public partial class AddChunkEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "Embedding", schema: "public", table: "document_chunks",
                type: "bytea", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Embedding", schema: "public", table: "document_chunks");
        }
    }
}
