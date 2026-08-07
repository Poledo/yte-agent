import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Ngưỡng chống spam request (đơn vị: request/phút/IP). */
export interface RateLimitState {
  globalPerMinute: number;
  loginPerMinute: number;
  forgotPasswordPerMinute: number;
  askPerMinute: number;
  importPerMinute: number;
}

/** Client cho /api/admin/rate-limit (chỉ SystemAdmin). */
@Injectable({ providedIn: 'root' })
export class RateLimitApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/rate-limit`;

  /** Ngưỡng đang hiệu lực. */
  get(): Observable<RateLimitState> {
    return this.http.get<RateLimitState>(this.base);
  }

  /** Cập nhật ngưỡng — áp dụng ngay, không cần restart server. */
  update(state: RateLimitState): Observable<{ message: string; state: RateLimitState }> {
    return this.http.put<{ message: string; state: RateLimitState }>(this.base, state);
  }
}
