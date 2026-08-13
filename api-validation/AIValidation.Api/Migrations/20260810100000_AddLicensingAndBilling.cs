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
    /// Cấp phép và tính tiền theo cơ sở KCB.
    ///
    /// - facility_licenses: hợp đồng gắn vào một nút cây đơn vị. Khóa bản quyền lưu
    ///   dạng băm SHA-256, khóa gốc chỉ hiện một lần lúc cấp.
    /// - billing_records: sổ tính tiền, có ràng buộc DUY NHẤT để khử trùng — cùng một
    ///   hồ sơ kiểm lại nhiều lần trong tháng chỉ tính tiền một lần.
    /// - billing_invoices: bản chốt sổ từng kỳ, chép cứng tên đơn vị/gói/giá để hóa đơn
    ///   cũ không đổi theo bảng giá mới.
    ///
    /// Kèm chỉ mục (FacilityCode, CreatedAt) cho usage_events — bảng kê theo đơn vị
    /// lọc theo mã cơ sở trước, chỉ mục cũ (CreatedAt, EventType) không đỡ được.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef) — cấu trúc khớp
    /// entity FacilityLicense / BillingRecord / BillingInvoice trong AppDbContext.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260810100000_AddLicensingAndBilling")]
    public partial class AddLicensingAndBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "facility_licenses",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FacilityId = table.Column<long>(type: "bigint", nullable: false),
                    FacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    KeyHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    KeyPrefix = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Plan = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MonthlyQuota = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    BasePrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false, defaultValue: 0m),
                    OverageUnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false, defaultValue: 0m),
                    CoversSubtree = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    ValidFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facility_licenses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_facility_licenses_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalSchema: "public",
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Mọi request gọi API đều tra giấy phép bằng băm khóa — truy vấn nóng nhất
            migrationBuilder.CreateIndex(
                name: "IX_facility_licenses_KeyHash",
                schema: "public",
                table: "facility_licenses",
                column: "KeyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facility_licenses_FacilityCode",
                schema: "public",
                table: "facility_licenses",
                column: "FacilityCode");

            migrationBuilder.CreateIndex(
                name: "IX_facility_licenses_FacilityId",
                schema: "public",
                table: "facility_licenses",
                column: "FacilityId");

            migrationBuilder.CreateTable(
                name: "billing_records",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LicenseId = table.Column<long>(type: "bigint", nullable: false),
                    BilledFacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UsedByFacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PeriodMonth = table.Column<int>(type: "integer", nullable: false),
                    EventType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    RecordKey = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BillableUnits = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    StaffCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_billing_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_billing_records_facility_licenses_LicenseId",
                        column: x => x.LicenseId,
                        principalSchema: "public",
                        principalTable: "facility_licenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Khử trùng đặt ở DB chứ không kiểm bằng code: nhiều request chạy song song,
            // kiểm rồi mới ghi vẫn lọt. Ghi trùng thì bắt lỗi unique và bỏ qua.
            migrationBuilder.CreateIndex(
                name: "UX_billing_records_dedup",
                schema: "public",
                table: "billing_records",
                columns: new[] { "LicenseId", "PeriodMonth", "EventType", "RecordKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_billing_records_BilledFacilityCode_PeriodMonth",
                schema: "public",
                table: "billing_records",
                columns: new[] { "BilledFacilityCode", "PeriodMonth" });

            migrationBuilder.CreateTable(
                name: "billing_invoices",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LicenseId = table.Column<long>(type: "bigint", nullable: false),
                    PeriodMonth = table.Column<int>(type: "integer", nullable: false),
                    FacilityCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FacilityName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Plan = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IncludedQuota = table.Column<int>(type: "integer", nullable: false),
                    UsedUnits = table.Column<int>(type: "integer", nullable: false),
                    OverageUnits = table.Column<int>(type: "integer", nullable: false),
                    AskCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    BasePrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    OverageUnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ClosedBy = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_billing_invoices", x => x.Id);
                    // Restrict chứ không Cascade: hóa đơn đã phát hành là chứng từ,
                    // xóa giấy phép không được phép cuốn theo.
                    table.ForeignKey(
                        name: "FK_billing_invoices_facility_licenses_LicenseId",
                        column: x => x.LicenseId,
                        principalSchema: "public",
                        principalTable: "facility_licenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Một kỳ của một giấy phép chỉ chốt được đúng một lần
            migrationBuilder.CreateIndex(
                name: "IX_billing_invoices_LicenseId_PeriodMonth",
                schema: "public",
                table: "billing_invoices",
                columns: new[] { "LicenseId", "PeriodMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usage_events_FacilityCode_CreatedAt",
                schema: "public",
                table: "usage_events",
                columns: new[] { "FacilityCode", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_usage_events_FacilityCode_CreatedAt",
                schema: "public",
                table: "usage_events");

            migrationBuilder.DropTable(name: "billing_invoices", schema: "public");
            migrationBuilder.DropTable(name: "billing_records", schema: "public");
            migrationBuilder.DropTable(name: "facility_licenses", schema: "public");
        }
    }
}
