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
  /** Mã quyền phẳng. Quản trị hệ thống chỉ có đúng một phần tử `"*"`. */
  permissions: string[];
  isSuperAdmin: boolean;
  /** null = tài khoản cấp hệ thống, không thuộc cơ sở nào. */
  facilityId: number | null;
  facilityCode: string | null;
  facilityName: string | null;
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

  /**
   * Quyền dạng Set: bảng quyền giờ mịn tới từng endpoint (cả trăm mã), mà menu và
   * bảng dữ liệu hỏi quyền trên mỗi lần render — dò tuyến tính trên mảng ở đó là phí.
   */
  private readonly permissionSet = computed(
    () => new Set(this.currentUser()?.permissions ?? []),
  );

  /** Danh sách mã quyền (đọc để hiển thị; kiểm tra thì dùng các hàm bên dưới). */
  readonly permissions = computed(() => this.currentUser()?.permissions ?? []);

  /**
   * Tài khoản nhìn được toàn hệ thống: quản trị hệ thống, hoặc tài khoản không gắn
   * cơ sở nào. Đây là cờ DUY NHẤT quyết định có hiện cột "Cơ sở" và ô chọn cơ sở hay
   * không — quản trị cơ sở thì mọi dòng đều là cơ sở của họ, cột đó chỉ tốn chỗ.
   */
  readonly isSystemScope = computed(() => {
    const user = this.currentUser();
    return user !== null && (user.isSuperAdmin || user.facilityId === null);
  });

  /** Cơ sở của tài khoản đang đăng nhập (null = cấp hệ thống). */
  readonly facilityId = computed(() => this.currentUser()?.facilityId ?? null);

  /**
   * Kiểm tra user có một mã quyền cụ thể. `"*"` là toàn quyền — máy chủ trả đúng một
   * phần tử đó cho quản trị hệ thống thay vì liệt kê cả trăm mã.
   */
  hasPermission(code: string): boolean {
    const perms = this.permissionSet();
    return perms.has('*') || perms.has(code);
  }

  /**
   * Có ÍT NHẤT một quyền bắt đầu bằng tiền tố (vd `'Catalog.'`). Menu và route gác
   * theo tiền tố chứ không theo mã: một màn hình gọi nhiều endpoint, đòi đúng một mã
   * thì người chỉ được xem sẽ không vào nổi màn hình xem.
   */
  hasModule(prefix: string): boolean {
    const perms = this.permissionSet();
    if (perms.has('*')) return true;
    for (const code of perms) {
      if (code.startsWith(prefix)) return true;
    }
    return false;
  }

  /** Kiểm tra có ít nhất một trong các quyền. Danh sách rỗng = không đòi hỏi gì. */
  hasAny(codes: string[]): boolean {
    if (codes.length === 0) return true;
    return codes.some((c) => this.hasPermission(c));
  }

  /** Kiểm tra có ĐỦ tất cả các quyền. */
  hasAll(codes: string[]): boolean {
    return codes.every((c) => this.hasPermission(c));
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
          isSuperAdmin: data.isSuperAdmin ?? false,
          facilityId: data.facilityId ?? null,
          facilityCode: data.facilityCode ?? null,
          facilityName: data.facilityName ?? null,
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
          isSuperAdmin: me.isSuperAdmin ?? false,
          facilityId: me.facilityId ?? null,
          facilityCode: me.facilityCode ?? null,
          facilityName: me.facilityName ?? null,
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
