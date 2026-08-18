import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BulkTogglePermissionsRequest,
  PermissionAuditPageDto,
  PermissionFacetsDto,
  PermissionPageDto,
  PermissionSyncResultDto,
  PermissionSyncStatusDto,
  UpdatePermissionDisplayNameRequest,
} from './models';

/** Client cho /api/admin/permissions — bảng quyền động do bộ quét endpoint sinh ra. */
@Injectable({ providedIn: 'root' })
export class PermissionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/permissions`;

  list(
    opts: {
      category?: string;
      search?: string;
      isActive?: boolean | null;
      page?: number;
      pageSize?: number;
    } = {},
  ): Observable<PermissionPageDto> {
    let params = new HttpParams();
    if (opts.category) params = params.set('category', opts.category);
    if (opts.search) params = params.set('search', opts.search);
    // null = lấy cả bật lẫn tắt, nên chỉ gửi khi thực sự có lọc.
    if (opts.isActive === true || opts.isActive === false) {
      params = params.set('isActive', opts.isActive);
    }
    if (opts.page) params = params.set('page', opts.page);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<PermissionPageDto>(this.base, { params });
  }

  facets(): Observable<PermissionFacetsDto> {
    return this.http.get<PermissionFacetsDto>(`${this.base}/facets`);
  }

  syncStatus(): Observable<PermissionSyncStatusDto> {
    return this.http.get<PermissionSyncStatusDto>(`${this.base}/sync-status`);
  }

  rescan(): Observable<PermissionSyncResultDto> {
    return this.http.post<PermissionSyncResultDto>(`${this.base}/rescan`, {});
  }

  bulkToggle(
    body: BulkTogglePermissionsRequest,
  ): Observable<{ message: string; changed: number; notFound: string[] }> {
    return this.http.post<{ message: string; changed: number; notFound: string[] }>(
      `${this.base}/bulk-toggle`,
      body,
    );
  }

  updateDisplayName(
    code: string,
    body: UpdatePermissionDisplayNameRequest,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/${encodeURIComponent(code)}/display-name`,
      body,
    );
  }

  auditLogs(
    opts: {
      code?: string;
      result?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Observable<PermissionAuditPageDto> {
    let params = new HttpParams();
    if (opts.code) params = params.set('code', opts.code);
    if (opts.result) params = params.set('result', opts.result);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.page) params = params.set('page', opts.page);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<PermissionAuditPageDto>(`${this.base}/audit-logs`, { params });
  }
}
