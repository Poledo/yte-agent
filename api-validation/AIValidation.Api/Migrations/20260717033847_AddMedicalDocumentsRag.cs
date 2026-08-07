using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using NpgsqlTypes;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicalDocumentsRag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "medical_documents",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DocType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DocNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IssuedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IssuedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SourceFileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_medical_documents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "document_chunks",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DocumentId = table.Column<long>(type: "bigint", nullable: false),
                    ChunkIndex = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    SearchVector = table.Column<NpgsqlTsVector>(type: "tsvector", nullable: true)
                        .Annotation("Npgsql:TsVectorConfig", "simple")
                        .Annotation("Npgsql:TsVectorProperties", new[] { "Content" })
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_chunks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_chunks_medical_documents_DocumentId",
                        column: x => x.DocumentId,
                        principalSchema: "public",
                        principalTable: "medical_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["description"] = "Normal vaginal delivery for pregnancy" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Male", ["minAge"] = 50, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Benign prostatic hyperplasia" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 3L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Infectious disease caused by Vibrio cholerae" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 4L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = 30, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Essential hypertension" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 5L,
                columns: new[] { "Content", "Metadata", "Name" },
                values: new object[] { "Đái tháo đường típ 1 do tế bào beta tụy bị phá hủy dẫn đến thiếu insulin tuyệt đối. Thường khởi phát ở trẻ em và người trẻ; điều trị bắt buộc bằng insulin.", new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Type 1 diabetes mellitus" }, "Bệnh đái tháo đường típ 1" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 6L,
                columns: new[] { "Content", "Metadata" },
                values: new object[] { "Thủ thuật nạo hút thai trong 3 tháng đầu thai kỳ. Phải khám phụ khoa và siêu âm xác định tuổi thai trước khi thực hiện; bắt buộc có sự đồng ý bằng văn bản của người bệnh.", new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "high" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 7L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "medium", ["gestation_week_min"] = 15 });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 8L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "low" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 9L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "D", ["pregnancyOnly"] = false, ["minAge"] = 18, ["maxAge"] = null, ["contraindications"] = new object[] { "pregnancy", "bleeding_disorder" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 10L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "B", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "kidney_disease", "liver_disease" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 11L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "A", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "penicillin_allergy" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 12L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["coverage_percent"] = 100, ["applicableTo"] = "O80", ["requiresApproval"] = false });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 13L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["minAge"] = 18, ["applicableTo"] = "all_drugs", ["riskLevel"] = "high" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 14L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["pregnancyOnly"] = true, ["riskLevel"] = "high", ["requiresApproval"] = true });

            migrationBuilder.CreateIndex(
                name: "IX_document_chunks_DocumentId",
                schema: "public",
                table: "document_chunks",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_document_chunks_SearchVector",
                schema: "public",
                table: "document_chunks",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "IX_medical_documents_DocType",
                schema: "public",
                table: "medical_documents",
                column: "DocType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_chunks",
                schema: "public");

            migrationBuilder.DropTable(
                name: "medical_documents",
                schema: "public");

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["description"] = "Normal vaginal delivery for pregnancy" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Male", ["minAge"] = 50, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Benign prostatic hyperplasia" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 3L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Infectious disease caused by Vibrio cholerae" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 4L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = 30, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Essential hypertension" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 5L,
                columns: new[] { "Content", "Metadata", "Name" },
                values: new object[] { "Do thiếu insulin hoàn toàn do tủy tế bào tá tụy bị tê liệt. Thường phát hiện ở trẻ em và thanh niên.", new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Type 1 diabetes mellitus" }, "Bệnh tiểu đường loại 1" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 6L,
                columns: new[] { "Content", "Metadata" },
                values: new object[] { "Thủ tục nạo hút thai trong 3 tháng đầu. Bao gồm genital lâm dụng trước khi thực hiện. Phải có sự đồng ý của bệnh nhân.", new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "high" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 7L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "medium", ["gestation_week_min"] = 15 });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 8L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "low" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 9L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "D", ["pregnancyOnly"] = false, ["minAge"] = 18, ["maxAge"] = null, ["contraindications"] = new object[] { "pregnancy", "bleeding_disorder" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 10L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "B", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "kidney_disease", "liver_disease" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 11L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["safetyCategory"] = "A", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "penicillin_allergy" } });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 12L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["coverage_percent"] = 100, ["applicableTo"] = "O80", ["requiresApproval"] = false });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 13L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["minAge"] = 18, ["applicableTo"] = "all_drugs", ["riskLevel"] = "high" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 14L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["pregnancyOnly"] = true, ["riskLevel"] = "high", ["requiresApproval"] = true });
        }
    }
}
