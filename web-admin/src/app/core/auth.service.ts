import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStore } from './token.store';
import {
  ApiEnvelope,
  AuthResult,
  ChangePasswordRequest,
  ForgotPasswordResult,
  LoginRequest,
  MeResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from './api/models';

/** Thông tin user hiện tại lưu trong state. */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

/** Dịch vụ xác thực + trạng thái phiên bằng signals. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStore);
  private readonly base = environment.apiBaseUrl;

  // ===== State bằng signals =====
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly permissions = computed(() => this.currentUser()?.permissions ?? []);

  /** Kiểm tra user có 1 quyền cụ thể (System.Admin = toàn quyền). */
  hasPermission(code: string): boolean {
    const perms = this.permissions();
    return perms.includes('System.Admin') || perms.includes(code);
  }

  /** Kiểm tra có ít nhất một trong các quyền. */
  hasAny(codes: string[]): boolean {
    if (codes.length === 0) return true;
    return codes.some((c) => this.hasPermission(c));
  }

  /** Đăng nhập, lưu token và nạp thông tin user. */
  login(body: LoginRequest): Observable<ApiEnvelope<AuthResult>> {
    return this.http.post<ApiEnvelope<AuthResult>>(`${this.base}/api/auth/login`, body).pipe(
      tap((res) => {
        const data = res.data;
        this.tokens.setTokens(data.accessToken, data.refreshToken);
        this.currentUser.set({
          id: data.userId,
          email: data.email,
          fullName: data.fullName,
          roles: data.roles ?? [],
          permissions: data.permissions ?? this.extractPermissionsFromToken(data.accessToken),
        });
      }),
    );
  }

  register(body: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.base}/api/auth/register`, body);
  }

  forgotPassword(email: string): Observable<ApiEnvelope<ForgotPasswordResult>> {
    return this.http.post<ApiEnvelope<ForgotPasswordResult>>(
      `${this.base}/api/auth/forgot-password`,
      { email },
    );
  }

  resetPassword(body: ResetPasswordRequest): Observable<unknown> {
    return this.http.post(`${this.base}/api/auth/reset-password`, body);
  }

  changePassword(body: ChangePasswordRequest): Observable<unknown> {
    return this.http.post(`${this.base}/api/auth/change-password`, body);
  }

  /** Gọi /me để nạp lại thông tin user (dùng khi F5 mà còn token). */
  loadMe(): Observable<ApiEnvelope<MeResponse>> {
    return this.http.get<ApiEnvelope<MeResponse>>(`${this.base}/api/auth/me`).pipe(
      tap((res) => {
        const me = res.data;
        this.currentUser.set({
          id: me.id,
          email: me.email,
          fullName: me.fullName,
          roles: me.roles ?? [],
          permissions: me.permissions ?? [],
        });
      }),
    );
  }

  /** Đăng xuất: thu hồi refresh token rồi xóa state. */
  logout(): Observable<unknown> {
    const refreshToken = this.tokens.refreshToken;
    const done = () => {
      this.tokens.clear();
      this.currentUser.set(null);
    };
    if (!refreshToken) {
      done();
      return new Observable((s) => {
        s.next(null);
        s.complete();
      });
    }
    return this.http.post(`${this.base}/api/auth/logout`, { refreshToken }).pipe(tap(done));
  }

  /** Xóa phiên cục bộ (dùng khi refresh token thất bại). */
  clearSession(): void {
    this.tokens.clear();
    this.currentUser.set(null);
  }

  /** Lấy các claim "permission" từ JWT (dự phòng nếu response thiếu). */
  private extractPermissionsFromToken(token: string): string[] {
    const payload = this.tokens.decodeToken(token);
    if (!payload) return [];
    const raw = payload['permission'];
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') return [raw];
    return [];
  }
}
