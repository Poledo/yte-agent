/** Định nghĩa một mục menu sidebar. */
export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  /** Cần ít nhất một trong các quyền này; rỗng = luôn hiện. */
  permissions: string[];
}

/** Danh sách menu, lọc theo quyền tại runtime. */
export const MENU: MenuItem[] = [
  { label: 'Tổng quan', icon: 'dashboard', route: '/dashboard', permissions: [] },
  { label: 'Lịch sử hoạt động', icon: 'manage_search', route: '/activity', permissions: [] },
  {
    label: 'Người dùng',
    icon: 'group',
    route: '/users',
    permissions: ['User.Manage'],
  },
  {
    label: 'Vai trò & quyền',
    icon: 'admin_panel_settings',
    route: '/roles',
    permissions: ['Role.Manage'],
  },
  {
    label: 'Kho tri thức',
    icon: 'menu_book',
    route: '/documents',
    permissions: ['Document.View', 'Document.Manage', 'Knowledge.View', 'Knowledge.Manage'],
  },
  {
    label: 'Danh mục HIS',
    icon: 'inventory_2',
    route: '/catalog',
    permissions: ['Catalog.View', 'Catalog.Manage'],
  },
  {
    label: 'Cây đơn vị',
    icon: 'account_tree',
    route: '/facilities',
    permissions: ['Catalog.View', 'Catalog.Manage'],
  },
  {
    label: 'Hợp đồng cơ sở',
    icon: 'key',
    route: '/licenses',
    permissions: ['License.View', 'License.Manage'],
  },
  {
    label: 'Tính tiền',
    icon: 'receipt_long',
    route: '/billing',
    permissions: ['Billing.View'],
  },
  {
    label: 'Tải văn bản',
    icon: 'cloud_download',
    route: '/legal',
    permissions: ['Document.View', 'Document.Manage', 'Knowledge.View', 'Knowledge.Manage'],
  },
  {
    label: 'Nhật ký kiểm toán',
    icon: 'history',
    route: '/audit',
    permissions: ['Audit.View'],
  },
  {
    label: 'Cấu hình AI',
    icon: 'smart_toy',
    route: '/ai-config',
    permissions: ['System.Admin'],
  },
  {
    label: 'Cấu hình robot',
    icon: 'view_in_ar',
    route: '/robot-config',
    permissions: ['System.Admin'],
  },
  {
    label: 'Cấu hình hệ thống',
    icon: 'settings',
    route: '/system-config',
    permissions: ['System.Admin'],
  },
];
