using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AIValidation.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "knowledge_items",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Metadata = table.Column<Dictionary<string, object>>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_items", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "public",
                table: "knowledge_items",
                columns: new[] { "Id", "Category", "Code", "Content", "CreatedAt", "IsActive", "Metadata", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { 1L, "ICD", "O80", "Chỉ áp dụng cho bệnh nhân nữ. Tình trạng đẻ thường, không có biến chứng, cho một thai.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["description"] = "Normal vaginal delivery for pregnancy" }, "Đẻ thường một thai", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 2L, "ICD", "N40", "Chỉ áp dụng cho bệnh nhân nam. Phì đại tuyến tiền liệt (Benign Prostatic Hyperplasia - BPH) là tình trạng tuyến tiền liệt phì đại do tuổi tác.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = "Male", ["minAge"] = 50, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Benign prostatic hyperplasia" }, "Phì đại tuyến tiền liệt", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 3L, "ICD", "A00", "Bệnh truyền nhiễm do vi khuẩn Vibrio cholerae gây ra. Gây tiêu chảy cấp, mất nước và điện giải.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Infectious disease caused by Vibrio cholerae" }, "Tả (Cholera)", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 4L, "ICD", "I10", "Tăng huyết áp mạn tính không rõ nguyên nhân. Yếu tố nguy hiểm: tuổi, gia đình, cân nặng, chế độ ăn.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = null, ["minAge"] = 30, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Essential hypertension" }, "Tăng huyết áp nguyên phát", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 5L, "ICD", "E10", "Do thiếu insulin hoàn toàn do tủy tế bào tá tụy bị tê liệt. Thường phát hiện ở trẻ em và thanh niên.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = null, ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = false, ["description"] = "Type 1 diabetes mellitus" }, "Bệnh tiểu đường loại 1", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 6L, "Procedure", "DVKT001", "Thủ tục nạo hút thai trong 3 tháng đầu. Bao gồm genital lâm dụng trước khi thực hiện. Phải có sự đồng ý của bệnh nhân.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "high" }, "Nạo hút thai", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 7L, "Procedure", "DVKT002", "Thủ tục lấy mẫu dịch ối để chẩn đoán dị tật thai nhi. Được thực hiện từ tuần thứ 15 của thai kỳ.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = 18, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "medium", ["gestation_week_min"] = 15 }, "Chọc dịch ối", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 8L, "Procedure", "DVKT003", "Kỹ thuật hình ảnh không xâm lấn để theo dõi thai kỳ và sức khỏe của thai nhi.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["gender"] = "Female", ["minAge"] = null, ["maxAge"] = null, ["pregnancyOnly"] = true, ["riskLevel"] = "low" }, "Siêu âm sản khoa", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 9L, "Drug", "ASPIRIN", "Chống đông máu. Liều phòng ngừa: 100-325mg/ngày. Chống chỉ định: thai kỳ, chảy máu.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["safetyCategory"] = "D", ["pregnancyOnly"] = false, ["minAge"] = 18, ["maxAge"] = null, ["contraindications"] = new object[] { "pregnancy", "bleeding_disorder" } }, "Aspirin 100mg", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 10L, "Drug", "METFORMIN", "Điều trị bệnh tiểu đường loại 2. Liều: 500-1000mg 2-3 lần/ngày. Tác dụng phụ: rối loạn tiêu hóa.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["safetyCategory"] = "B", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "kidney_disease", "liver_disease" } }, "Metformin 500mg", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 11L, "Drug", "AMOXICILLIN", "Kháng sinh beta-lactam. Điều trị nhiễm trùng vi khuẩn. Liều: 500mg 3 lần/ngày. Có thể sử dụng trong thai kỳ.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["safetyCategory"] = "A", ["pregnancyOnly"] = false, ["minAge"] = null, ["maxAge"] = null, ["contraindications"] = new object[] { "penicillin_allergy" } }, "Amoxicillin 500mg", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 12L, "Rule", "RULE_O80_COVERAGE", "ICD O80 được bảo hiểm y tế chi trả 100% chi phí. Yêu cầu: giấy khám sức khỏe trước sinh, hồ sơ hoàn chỉnh.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["coverage_percent"] = 100, ["applicableTo"] = "O80", ["requiresApproval"] = false }, "Bảo hiểm cho ICD O80", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 13L, "Rule", "RULE_DRUG_AGE", "Một số thuốc không được sử dụng cho trẻ em dưới 18 tuổi. Cần kiểm tra hướng dẫn sử dụng từng loại thuốc.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["minAge"] = 18, ["applicableTo"] = "all_drugs", ["riskLevel"] = "high" }, "Hạn chế tuổi với thuốc", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) },
                    { 14L, "Rule", "RULE_PREGNANCY_SAFETY", "Nhiều thuốc và thủ tục bị chống chỉ định trong thai kỳ. Phải kiểm tra safety category FDA trước khi điều trị.", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc), true, new Dictionary<string, object> { ["pregnancyOnly"] = true, ["riskLevel"] = "high", ["requiresApproval"] = true }, "An toàn trong thai kỳ", new DateTime(2025, 1, 13, 10, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeItems_Category",
                schema: "public",
                table: "knowledge_items",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_KnowledgeItems_Code",
                schema: "public",
                table: "knowledge_items",
                column: "Code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "knowledge_items",
                schema: "public");
        }
    }
}
