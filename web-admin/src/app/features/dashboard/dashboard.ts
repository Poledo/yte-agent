import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AuthService } from '../../core/auth.service';
import { UsersApi } from '../../core/api/users.api';
import { RolesApi } from '../../core/api/roles.api';
import { DocumentsApi } from '../../core/api/documents.api';
import { CatalogApi } from '../../core/api/catalog.api';
import { StatsApi, UsageStatsDto } from '../../core/api/stats.api';
import { PageHeader } from '../../shared/page-header/page-header';
import { HasPermissionDirective } from '../../shared/permission.directive';

interface StatCard {
  key: string;
  label: string;
  icon: string;
  color: string;
  route: string;
  value: number | null;
}

/** Trang tổng quan: thẻ thống kê + trạng thái hệ thống. */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDatepickerModule,
    PageHeader,
    HasPermissionDirective,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly usersApi = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly docsApi = inject(DocumentsApi);
  private readonly catalogApi = inject(CatalogApi);

  readonly loading = signal(true);
  readonly user = this.auth.currentUser;
  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Chào buổi sáng';
    if (h < 14) return 'Chào buổi trưa';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  });

  readonly stats = signal<StatCard[]>([
    { key: 'documents', label: 'Văn bản tri thức', icon: 'menu_book', color: '#1976d2', route: '/documents', value: null },
    { key: 'catalog', label: 'Danh mục HIS', icon: 'inventory_2', color: '#00897b', route: '/catalog', value: null },
    { key: 'users', label: 'Người dùng', icon: 'group', color: '#6a1b9a', route: '/users', value: null },
    { key: 'roles', label: 'Vai trò', icon: 'admin_panel_settings', color: '#e65100', route: '/roles', value: null },
  ]);

  readonly skeletons = [0, 1, 2, 3];

  // ===== Biểu đồ hoạt động (lịch sử hỏi đáp AI + kiểm tra XML 130) =====
  private readonly statsApi = inject(StatsApi);

  /** Các khoảng thời gian chọn nhanh. */
  readonly presets: { key: string; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'week', label: 'Tuần này' },
    { key: '7d', label: '7 ngày' },
    { key: 'month', label: 'Tháng này' },
    { key: 'lastMonth', label: 'Tháng trước' },
    { key: '30d', label: '30 ngày' },
  ];
  readonly preset = signal('7d');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly usage = signal<UsageStatsDto | null>(null);
  readonly usageLoading = signal(true);
  /** Nhãn hiển thị trên nút chọn thời gian (preset hoặc khoảng tùy chọn). */
  readonly rangeLabel = computed(() => {
    const key = this.preset();
    const found = this.presets.find((p) => p.key === key);
    if (found) return found.label;
    const [f, t] = [this.customFrom(), this.customTo()];
    const vn = (s: string) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '');
    return f && t ? `${vn(f)} – ${vn(t)}` : 'Chọn khoảng';
  });
  /** Giá trị cao nhất giữa 2 chuỗi — làm mốc 100% chiều cao cột. */
  readonly chartMax = computed(() => {
    const u = this.usage();
    if (!u || u.points.length === 0) return 1;
    return Math.max(1, ...u.points.map((p) => Math.max(p.ask, p.check)));
  });
  /** Chỉ hiện nhãn thưa khi quá nhiều cột (ví dụ 24 giờ / 31 ngày). */
  readonly labelStep = computed(() => {
    const n = this.usage()?.points.length ?? 0;
    return n > 16 ? Math.ceil(n / 12) : 1;
  });

  constructor() {
    this.loadStats();
    this.selectPreset('7d');
  }

  selectPreset(key: string): void {
    this.preset.set(key);
    const today = new Date();
    const d = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    let from = d(today);
    let to = d(today);
    switch (key) {
      case 'yesterday':
        from.setDate(from.getDate() - 1);
        to = new Date(from);
        break;
      case 'week': {
        // Tuần bắt đầu thứ Hai
        const dow = (today.getDay() + 6) % 7;
        from.setDate(from.getDate() - dow);
        break;
      }
      case '7d':
        from.setDate(from.getDate() - 6);
        break;
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case '30d':
        from.setDate(from.getDate() - 29);
        break;
    }
    this.customFrom.set(this.fmt(from));
    this.customTo.set(this.fmt(to));
    this.loadUsage(this.fmt(from), this.fmt(to));
  }

  /** Khoảng tùy chọn từ date-range-picker: đủ 2 đầu mới tải. */
  onRangeStart(d: Date | null): void {
    this.customFrom.set(d ? this.fmt(d) : '');
  }

  onRangeEnd(d: Date | null): void {
    this.customTo.set(d ? this.fmt(d) : '');
    const from = this.customFrom();
    const to = this.customTo();
    if (!from || !to) return;
    this.preset.set('custom');
    this.loadUsage(from, to);
  }

  private loadUsage(from: string, to: string): void {
    this.usageLoading.set(true);
    this.statsApi.usage(from, to).subscribe({
      next: (res) => {
        this.usage.set(res);
        this.usageLoading.set(false);
      },
      error: () => {
        this.usage.set(null);
        this.usageLoading.set(false);
      },
    });
  }

  private fmt(x: Date): string {
    const m = `${x.getMonth() + 1}`.padStart(2, '0');
    const day = `${x.getDate()}`.padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
  }

  private loadStats(): void {
    this.loading.set(true);
    forkJoin({
      documents: this.docsApi.list().pipe(catchError(() => of<null>(null))),
      catalog: this.catalogApi.sources().pipe(catchError(() => of<null>(null))),
      users: this.auth.hasPermission('Users.List')
        ? this.usersApi.list().pipe(catchError(() => of<null>(null)))
        : of<null>(null),
      roles: this.auth.hasPermission('Roles.List')
        ? this.rolesApi.list().pipe(catchError(() => of<null>(null)))
        : of<null>(null),
    }).subscribe((res) => {
      this.stats.update((cards) =>
        cards.map((c) => {
          const list = (res as Record<string, unknown[] | null>)[c.key];
          return { ...c, value: list ? list.length : null };
        }),
      );
      this.loading.set(false);
    });
  }
}
