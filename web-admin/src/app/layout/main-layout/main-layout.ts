import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { NotificationService } from '../../core/notification.service';
import { MENU } from './menu';

/** Layout chính: sidebar + topbar + breadcrumb + menu động theo quyền. */
@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  // Thu gọn thành thanh rail (chỉ icon) — dùng trên desktop.
  readonly collapsed = signal(false);
  // Màn hình hẹp: sidebar chuyển sang dạng overlay (kéo ra/ẩn đi), không chiếm chỗ nội dung.
  readonly isMobile = signal(this.readMobile());
  // Trạng thái mở của drawer overlay trên mobile.
  readonly mobileOpen = signal(false);
  readonly user = this.auth.currentUser;

  private readMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    const m = this.readMobile();
    if (m !== this.isMobile()) {
      this.isMobile.set(m);
      // Rời khỏi mobile thì đóng drawer để không kẹt trạng thái overlay khi về desktop.
      if (!m) this.mobileOpen.set(false);
    }
  }

  // Menu lọc theo quyền của user
  readonly menu = computed(() => MENU.filter((m) => this.auth.hasAny(m.permissions)));

  // Nhãn trang hiện tại cho breadcrumb
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly currentLabel = computed(() => {
    const url = this.currentUrl();
    const item = MENU.find((m) => url.startsWith(m.route));
    if (item) return item.label;
    if (url.startsWith('/profile')) return 'Tài khoản';
    return 'Trang';
  });

  readonly themeMode = this.theme.mode;
  themeIcon = computed(() => {
    switch (this.themeMode()) {
      case 'light':
        return 'light_mode';
      case 'dark':
        return 'dark_mode';
      default:
        return 'brightness_auto';
    }
  });

  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? this.user()?.email ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  });

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileOpen.update((v) => !v);
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  /** Trên mobile, chọn menu xong thì đóng drawer overlay lại. */
  closeMobileNav(): void {
    if (this.isMobile()) this.mobileOpen.set(false);
  }

  onOpenedChange(open: boolean): void {
    if (this.isMobile()) this.mobileOpen.set(open);
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.theme.setMode(mode);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.notify.success('Đã đăng xuất');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
