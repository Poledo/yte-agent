import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LlmConfigDto, LlmConfigUpdate, LlmTestResult } from './models';

/** Client cho /api/admin/llm-config (cấu hình AI online/offline). */
@Injectable({ providedIn: 'root' })
export class LlmApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/llm-config`;

  get(): Observable<LlmConfigDto> {
    return this.http.get<LlmConfigDto>(this.base);
  }

  update(body: LlmConfigUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.base, body);
  }

  /** Kiểm tra kết nối chế độ chỉ định (không đổi cấu hình). */
  test(mode: 'online' | 'offline'): Observable<LlmTestResult> {
    const params = new HttpParams().set('mode', mode);
    return this.http.post<LlmTestResult>(`${this.base}/test`, {}, { params });
  }
}
