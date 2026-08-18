import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { permissionGuard } from './core/permission.guard';

export const routes: Routes = [
  // Đường dẫn gốc "/" → vào thẳng trang quản trị. Chưa đăng nhập thì authGuard của
  // khu quản trị đẩy sang /login, đăng nhập xong quay lại /dashboard.
  // Phải đặt TRƯỚC các route path '' khác, nếu không auth-layout sẽ nuốt "/" và hiện khung trống.
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // Trang giới thiệu công khai (nhúng bản trình chiếu tĩnh public/gioi-thieu.html).
  // Không còn là trang gốc: chỉ vào từ menu "Giới thiệu dự án" hoặc gõ thẳng địa chỉ.
  // Đường dẫn KHÔNG được là 'gioi-thieu': dev server (Vite) tự thêm '.html' cho URL
  // không đuôi nên sẽ trả thẳng file tĩnh, mất hẳn lớp menu phủ bên trên.
  {
    path: 'gioi-thieu-du-an',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },

  // Trang xác thực (auth-layout)
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
      },
    ],
  },

  // Khu vực quản trị (main-layout, cần đăng nhập)
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'activity',
        loadComponent: () => import('./features/activity/activity').then((m) => m.Activity),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Users.' },
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/roles/roles').then((m) => m.Roles),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Roles.' },
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('./features/permissions/permissions').then((m) => m.Permissions),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Permissions.' },
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/documents/documents').then((m) => m.Documents),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Assistant.' },
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Catalog.' },
      },
      {
        path: 'facilities',
        loadComponent: () => import('./features/facilities/facilities').then((m) => m.Facilities),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Facility.' },
      },
      {
        path: 'licenses',
        loadComponent: () => import('./features/licenses/licenses').then((m) => m.Licenses),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'License.' },
      },
      {
        path: 'billing',
        loadComponent: () => import('./features/billing/billing').then((m) => m.Billing),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Billing.' },
      },
      {
        path: 'legal',
        loadComponent: () => import('./features/legal/legal').then((m) => m.Legal),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Legal.' },
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit').then((m) => m.Audit),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'Audit.' },
      },
      {
        path: 'ai-config',
        loadComponent: () => import('./features/ai-config/ai-config').then((m) => m.AiConfig),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'LlmConfig.' },
      },
      {
        path: 'robot-config',
        loadComponent: () =>
          import('./features/robot-config/robot-config').then((m) => m.RobotConfig),
        canActivate: [permissionGuard],
        data: { permissionPrefix: 'ExtensionConfigAdmin.' },
      },
      {
        path: 'system-config',
        loadComponent: () =>
          import('./features/system-config/system-config').then((m) => m.SystemConfig),
        canActivate: [permissionGuard],
        // Màn hình gom ba nhóm: hạn mức gọi, đồng bộ ICD và đặc tả trường XML 130.
        data: { permissionPrefix: ['RateLimitConfig.', 'Icd.', 'Xml130.'] },
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
    ],
  },

  // Trang xem file gốc toàn màn hình (mở tab mới, cần đăng nhập)
  {
    path: 'viewer/:kind/:id',
    loadComponent: () => import('./features/viewer/viewer').then((m) => m.Viewer),
    canActivate: [authGuard],
  },

  // Trang lỗi
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden/forbidden').then((m) => m.Forbidden),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
