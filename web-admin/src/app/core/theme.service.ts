import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Quản lý dark mode (light/dark/system), lưu localStorage. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'cbytds.theme';
  readonly mode = signal<ThemeMode>(this.readStored());

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    // Áp dụng theme mỗi khi mode đổi
    effect(() => {
      const mode = this.mode();
      localStorage.setItem(this.STORAGE_KEY, mode);
      this.apply(mode);
    });
    // Theo dõi thay đổi của hệ thống khi ở chế độ system
    this.media.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply('system');
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  /** Xoay vòng light -> dark -> system. */
  cycle(): void {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this.mode()) + 1) % order.length];
    this.mode.set(next);
  }

  /** true nếu giao diện đang hiển thị tối. */
  isDark(): boolean {
    const mode = this.mode();
    if (mode === 'system') return this.media.matches;
    return mode === 'dark';
  }

  private apply(mode: ThemeMode): void {
    const dark = mode === 'dark' || (mode === 'system' && this.media.matches);
    const el = document.documentElement;
    el.style.colorScheme = dark ? 'dark' : 'light';
    el.classList.toggle('dark-theme', dark);
    document.body.classList.toggle('dark-theme', dark);
  }

  private readStored(): ThemeMode {
    const v = localStorage.getItem(this.STORAGE_KEY);
    // Mặc định TỐI — đồng bộ nhận diện ZeroCheck AI (đổi được ở menu Giao diện)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark';
  }
}
