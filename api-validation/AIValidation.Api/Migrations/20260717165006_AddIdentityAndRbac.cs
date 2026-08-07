using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentityAndRbac : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_roles",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "app_users",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Detail = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Group = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "app_role_claims",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_role_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_app_role_claims_app_roles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "public",
                        principalTable: "app_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "app_user_claims",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_user_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_app_user_claims_app_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "app_user_logins",
                schema: "public",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_user_logins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_app_user_logins_app_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "app_user_roles",
                schema: "public",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_user_roles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_app_user_roles_app_roles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "public",
                        principalTable: "app_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_app_user_roles_app_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "app_user_tokens",
                schema: "public",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_user_tokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_app_user_tokens_app_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByIp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_tokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_refresh_tokens_app_users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "app_users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                schema: "public",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => new { x.RoleId, x.PermissionId });
                    table.ForeignKey(
                        name: "FK_role_permissions_app_roles_RoleId",
                        column: x => x.RoleId,
                        principalSchema: "public",
                        principalTable: "app_roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalSchema: "public",
                        principalTable: "permissions",
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
                name: "IX_app_role_claims_RoleId",
                schema: "public",
                table: "app_role_claims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                schema: "public",
                table: "app_roles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_app_user_claims_UserId",
                schema: "public",
                table: "app_user_claims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_app_user_logins_UserId",
                schema: "public",
                table: "app_user_logins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_app_user_roles_RoleId",
                schema: "public",
                table: "app_user_roles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                schema: "public",
                table: "app_users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                schema: "public",
                table: "app_users",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_Action",
                schema: "public",
                table: "audit_logs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_CreatedAt",
                schema: "public",
                table: "audit_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                schema: "public",
                table: "audit_logs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_Code",
                schema: "public",
                table: "permissions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                schema: "public",
                table: "refresh_tokens",
                column: "TokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_UserId",
                schema: "public",
                table: "refresh_tokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_PermissionId",
                schema: "public",
                table: "role_permissions",
                column: "PermissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_role_claims",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_user_claims",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_user_logins",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_user_roles",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_user_tokens",
                schema: "public");

            migrationBuilder.DropTable(
                name: "audit_logs",
                schema: "public");

            migrationBuilder.DropTable(
                name: "refresh_tokens",
                schema: "public");

            migrationBuilder.DropTable(
                name: "role_permissions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_users",
                schema: "public");

            migrationBuilder.DropTable(
                name: "app_roles",
                schema: "public");

            migrationBuilder.DropTable(
                name: "permissions",
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
