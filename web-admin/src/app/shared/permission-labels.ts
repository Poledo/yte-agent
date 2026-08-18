/**
 * Nhãn tiếng Việt cho nhóm quyền.
 *
 * Nhóm (Category) là TÊN CONTROLLER sinh ra quyền - bộ quét endpoint đặt, không phải
 * người đặt. Bảng dưới đây chỉ để hiển thị: thiếu một tên thì màn hình vẫn chạy và hiện
 * nguyên tên controller, nên thêm controller mới không bắt buộc phải sửa file này.
 */
const CATEGORY_LABELS: Record<string, string> = {
  Assistant: 'Trợ lý & kho tri thức',
  Audit: 'Nhật ký kiểm toán',
  Auth: 'Đăng nhập & tài khoản',
  Billing: 'Tính tiền',
  Catalog: 'Danh mục HIS',
  ExtensionConfig: 'Cấu hình robot (máy trạm xin)',
  ExtensionConfigAdmin: 'Cấu hình robot',
  ExternalAuth: 'Đăng nhập qua bên thứ ba',
  Facility: 'Cây đơn vị',
  Health: 'Kiểm tra tình trạng máy chủ',
  Icd: 'Danh mục ICD',
  Legal: 'Tải văn bản pháp quy',
  License: 'Hợp đồng cơ sở',
  LlmConfig: 'Cấu hình AI',
  Permissions: 'Quyền',
  RateLimitConfig: 'Hạn mức gọi',
  Roles: 'Vai trò',
  Stats: 'Thống kê',
  Users: 'Người dùng',
  Validation: 'Kiểm tra hồ sơ',
  Xml130: 'Hồ sơ XML 130',
};

const CATEGORY_ICONS: Record<string, string> = {
  Assistant: 'menu_book',
  Audit: 'history',
  Auth: 'login',
  Billing: 'receipt_long',
  Catalog: 'inventory_2',
  ExtensionConfig: 'view_in_ar',
  ExtensionConfigAdmin: 'view_in_ar',
  ExternalAuth: 'link',
  Facility: 'account_tree',
  Health: 'monitor_heart',
  Icd: 'medical_information',
  Legal: 'cloud_download',
  License: 'key',
  LlmConfig: 'smart_toy',
  Permissions: 'key_vertical',
  RateLimitConfig: 'speed',
  Roles: 'admin_panel_settings',
  Stats: 'insights',
  Users: 'group',
  Validation: 'fact_check',
  Xml130: 'description',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? 'folder';
}
