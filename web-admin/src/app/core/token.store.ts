import { Injectable } from '@angular/core';

/** Lưu access + refresh token vào localStorage. */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly ACCESS_KEY = 'cbytds.accessToken';
  private readonly REFRESH_KEY = 'cbytds.refreshToken';

  get accessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  setAccessToken(accessToken: string): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  /** Giải mã payload JWT (không xác thực chữ ký) để lấy claim. */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  }
}
