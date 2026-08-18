/** Định nghĩa một mục menu sidebar. */
export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  /**
   * Nhóm quyền của màn hình (vd `'Catalog.'`). Có BẤT KỲ quyền nào thuộc nhóm là hiện
   * mục menu; rỗng = luôn hiện.
   *
   * Gác theo tiền tố chứ không theo mã: mã quyền giờ mịn tới từng endpoint, liệt kê
   * đủ mã của một màn hình vào đây thì thêm một API mới là menu lại sai.
   */
  permissionPrefix: string[];
}

/** Danh sách menu, lọc theo quyền tại runtime. */
export const MENU: MenuItem[] = [
  { label: 'Tổng quan', icon: 'dashboard', route: '/dashboard', permissionPrefix: [] },
  { label: 'Lịch sử hoạt động', icon: 'manage_search', route: '/activity', permissionPrefix: [] },
  {
    label: 'Người dùng',
    icon: 'group',
    route: '/users',
    permissionPrefix: ['Users.'],
  },
  {
    label: 'Vai trò',
    icon: 'admin_panel_settings',
    route: '/roles',
    permissionPrefix: ['Roles.'],
  },
  {
    label: 'Quyền',
    icon: 'key_vertical',
    route: '/permissions',
    permissionPrefix: ['Permissions.'],
  },
  {
    label: 'Kho tri thức',
    icon: 'menu_book',
    route: '/documents',
    permissionPrefix: ['Assistant.'],
  },
  {
    label: 'Danh mục HIS',
    icon: 'inventory_2',
    route: '/catalog',
    permissionPrefix: ['Catalog.'],
  },
  {
    label: 'Cây đơn vị',
    icon: 'account_tree',
    route: '/facilities',
    permissionPrefix: ['Facility.'],
  },
  {
    label: 'Hợp đồng cơ sở',
    icon: 'key',
    route: '/licenses',
    permissionPrefix: ['License.'],
  },
  {
    label: 'Tính tiền',
    icon: 'receipt_long',
    route: '/billing',
    permissionPrefix: ['Billing.'],
  },
  {
    label: 'Tải văn bản',
    icon: 'cloud_download',
    route: '/legal',
    permissionPrefix: ['Legal.'],
  },
  {
    label: 'Nhật ký kiểm toán',
    icon: 'history',
    route: '/audit',
    permissionPrefix: ['Audit.'],
  },
  {
    label: 'Cấu hình AI',
    icon: 'smart_toy',
    route: '/ai-config',
    permissionPrefix: ['LlmConfig.'],
  },
  {
    label: 'Cấu hình robot',
    icon: 'view_in_ar',
    route: '/robot-config',
    permissionPrefix: ['ExtensionConfigAdmin.'],
  },
  {
    label: 'Cấu hình hệ thống',
    icon: 'settings',
    route: '/system-config',
    permissionPrefix: ['RateLimitConfig.', 'Icd.', 'Xml130.'],
  },
];
// Mục "Giới thiệu dự án" không nằm trong danh sách này: nó ở chân sidebar
// (main-layout.html) vì trỏ ra trang toàn màn hình bên ngoài khung quản trị.
