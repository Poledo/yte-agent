using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "catalog_sources",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CatalogType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    RowCount = table.Column<int>(type: "integer", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalog_sources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "catalog_items",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<long>(type: "bigint", nullable: false),
                    CatalogType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    HisCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Name = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    Unit = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PriceBhyt = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    PriceHospital = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    IsSuspended = table.Column<bool>(type: "boolean", nullable: false),
                    IsOutsideBhyt = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Metadata = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalog_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_catalog_items_catalog_sources_SourceId",
                        column: x => x.SourceId,
                        principalSchema: "public",
                        principalTable: "catalog_sources",
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
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Type 1 diabetes mellitus" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 6L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "high" });

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
                name: "IX_catalog_items_CatalogType_FacilityCode_Code",
                schema: "public",
                table: "catalog_items",
                columns: new[] { "CatalogType", "FacilityCode", "Code" });

            migrationBuilder.CreateIndex(
                name: "IX_catalog_items_SourceId",
                schema: "public",
                table: "catalog_items",
                column: "SourceId");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_sources_CatalogType_FacilityCode",
                schema: "public",
                table: "catalog_sources",
                columns: new[] { "CatalogType", "FacilityCode" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "catalog_items",
                schema: "public");

            migrationBuilder.DropTable(
                name: "catalog_sources",
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
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Type 1 diabetes mellitus" });

            migrationBuilder.UpdateData(
                schema: "public",
                table: "knowledge_items",
                keyColumn: "Id",
                keyValue: 6L,
                column: "Metadata",
                value: new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "high" });

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
