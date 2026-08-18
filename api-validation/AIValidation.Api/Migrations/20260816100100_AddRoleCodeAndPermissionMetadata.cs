using System;
using AIValidation.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIValidation.Api.Migrations
{
    /// <summary>
    /// Chuẩn bị cho tầng phân quyền động: vai trò có mã bất biến, bảng quyền mang đủ
    /// metadata của endpoint (verb, route, controller, action) để bộ quét đối chiếu.
    ///
    /// Cột Group ĐỔI TÊN thành Category bằng RenameColumn chứ không Drop rồi Add:
    /// drop cột NOT NULL rồi add lại sẽ điền giá trị mặc định cho mọi dòng, mà quan
    /// trọng hơn là mọi thao tác kiểu đó dễ kéo theo việc xóa/ tạo lại bảng quyền —
    /// kéo theo cả role_permissions, tức là toàn bộ cấu hình phân quyền biến mất và
    /// sau khi deploy không ai ngoài SuperAdmin vào được nữa.
    ///
    /// Quyền đang có trong CSDL được đánh IsSystem = true, IsActive = true; bộ quét
    /// lần khởi động đầu tiên sẽ tắt (chứ không xóa) những mã cũ không khớp endpoint
    /// nào, còn seeder dịch chúng sang mã mới trước khi điều đó xảy ra.
    ///
    /// Migration viết tay (môi trường không chạy được dotnet-ef).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260816100100_AddRoleCodeAndPermissionMetadata")]
    public partial class AddRoleCodeAndPermissionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ===== app_roles.Code =====
            migrationBuilder.AddColumn<string>(
                name: "Code",
                schema: "public",
                table: "app_roles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: string.Empty);

            // Vai trò đã có được đặt mã theo tên hiện tại (NormalizedName là chữ HOA sẵn).
            // Làm ở SQL vì seeder chạy sau và cần mã này để tìm lại đúng vai trò cũ;
            // để rỗng thì index duy nhất bên dưới sẽ vỡ khi có từ hai vai trò trở lên.
            migrationBuilder.Sql(
                """
                UPDATE public.app_roles
                SET "Code" = UPPER(REGEXP_REPLACE(COALESCE(NULLIF("NormalizedName", ''), "Name"), '[^A-Za-z0-9]', '_', 'g'))
                WHERE "Code" = '';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_app_roles_Code",
                schema: "public",
                table: "app_roles",
                column: "Code",
                unique: true);

            // ===== permissions: đổi tên Group -> Category, thêm metadata endpoint =====
            migrationBuilder.RenameColumn(
                name: "Group",
                schema: "public",
                table: "permissions",
                newName: "Category");

            migrationBuilder.AddColumn<string>(
                name: "HttpMethod",
                schema: "public",
                table: "permissions",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "Route",
                schema: "public",
                table: "permissions",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "ControllerName",
                schema: "public",
                table: "permissions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "ActionName",
                schema: "public",
                table: "permissions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                schema: "public",
                table: "permissions",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "permissions",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedDate",
                schema: "public",
                table: "permissions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_ControllerName_ActionName",
                schema: "public",
                table: "permissions",
                columns: new[] { "ControllerName", "ActionName" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_permissions_ControllerName_ActionName",
                schema: "public",
                table: "permissions");

            migrationBuilder.DropColumn(name: "UpdatedDate", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "IsActive", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "IsSystem", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "ActionName", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "ControllerName", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "Route", schema: "public", table: "permissions");
            migrationBuilder.DropColumn(name: "HttpMethod", schema: "public", table: "permissions");

            migrationBuilder.RenameColumn(
                name: "Category",
                schema: "public",
                table: "permissions",
                newName: "Group");

            migrationBuilder.DropIndex(
                name: "IX_app_roles_Code",
                schema: "public",
                table: "app_roles");

            migrationBuilder.DropColumn(
                name: "Code",
                schema: "public",
                table: "app_roles");
        }
    }
}
