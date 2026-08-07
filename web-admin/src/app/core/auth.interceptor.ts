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

// Trạng thái refresh chia sẻ giữa các request song song
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

/** Gắn Bearer token; khi 401 thì tự refresh rồi thử lại request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

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
      return throwError(() => err);
    }),
  );
};

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
