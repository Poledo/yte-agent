import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditPageDto } from './models';

/** Client cho /api/admin/audit. */
@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/audit`;

  list(opts: { action?: string; search?: string; page?: number; pageSize?: number } = {}): Observable<AuditPageDto> {
    let params = new HttpParams();
    if (opts.action) params = params.set('action', opts.action);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.page) params = params.set('page', opts.page);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<AuditPageDto>(this.base, { params });
  }
}
