import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStore } from './token.store';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

// Trạng thái refresh chia sẻ giữa các request song song
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

/**
 * Thân phản hồi 403 do tầng phân quyền dựng (PermissionAuthorizationResultHandler).
 * `permissionCode` rỗng khi endpoint chưa có mã quyền nào trong bảng - lúc đó phải
 * quét lại chứ không phải cấp thêm quyền, nên thông báo phải nói khác nhau.
 */
interface ForbiddenBody {
  permissionCode?: string;
  reason?: string;
  result?: string;
}

/** Gắn Bearer token; khi 401 thì tự refresh rồi thử lại request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const notify = inject(NotificationService);

  // Không gắn token cho các endpoint auth công khai
  const isAuthEndpoint =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/refresh') ||
    req.url.includes('/api/auth/register') ||
    req.url.includes('/api/auth/forgot-password') ||
    req.url.includes('/api/auth/reset-password');

  const accessToken = tokens.accessToken;
  const authReq =
    accessToken && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthEndpoint && tokens.refreshToken) {
        return handle401(req, next, tokens, auth, router, http);
      }
      if (err.status === 403) {
        notify.error(forbiddenMessage(err));
      }
      return throwError(() => err);
    }),
  );
};

/**
 * Dựng thông báo 403 nêu ĐÚNG mã quyền còn thiếu - thứ giúp người quản trị tự vào màn
 * hình Vai trò tick thêm một ô, thay vì phải mở log máy chủ để đoán.
 */
function forbiddenMessage(err: HttpErrorResponse): string {
  const body = (err.error ?? {}) as ForbiddenBody;
  const reason = body.reason?.trim();

  // Ngoài phạm vi cơ sở quản lý: máy chủ đã nói rõ lý do, thêm mã quyền vào chỉ gây
  // hiểu nhầm là thiếu quyền (cấp thêm quyền cũng không vào được cơ sở của người khác).
  if (!body.permissionCode) {
    return reason || 'Bạn không có quyền thực hiện thao tác này.';
  }

  return `${reason || 'Bạn không có quyền thực hiện thao tác này.'} (mã quyền: ${body.permissionCode})`;
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokens: TokenStore,
  auth: AuthService,
  router: Router,
  http: HttpClient,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // Chờ refresh đang chạy hoàn tất rồi thử lại
    return refreshDone$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap((newToken) =>
        next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
      ),
    );
  }

  isRefreshing = true;
  refreshDone$.next(null);
  const refreshToken = tokens.refreshToken!;

  return http
    .post<{ data: { accessToken: string; refreshToken: string } }>(
      `${environment.apiBaseUrl}/api/auth/refresh`,
      { refreshToken },
    )
    .pipe(
      switchMap((res) => {
        const data = res.data;
        tokens.setTokens(data.accessToken, data.refreshToken);
        isRefreshing = false;
        refreshDone$.next(data.accessToken);
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${data.accessToken}` } }));
      }),
      catchError((err) => {
        isRefreshing = false;
        auth.clearSession();
        router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
}
