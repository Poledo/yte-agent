import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Lịch tự động đồng bộ danh mục ICD (GET/PUT /api/icd/sync/settings). */
export interface IcdSyncSettingsDto {
  /** Cho phép tự động lấy dữ liệu ICD từ tracuu-icd10.web.app. */
  enabled: boolean;
  /** Giờ chạy hằng ngày "HH:mm" theo giờ máy chủ. */
  time: string;
  lastRunAt?: string | null;
  lastRunResult?: string | null;
}

/** So sánh phiên bản danh mục ICD local với nguồn công bố. */
export interface IcdSyncStatusDto {
  localVersion?: string | null;
  remoteVersion?: string | null;
  upToDate: boolean;
  sourceUrl?: string | null;
}

/** Kết quả một lần đồng bộ ICD. */
export interface IcdSyncResultDto {
  synced: boolean;
  message: string;
  fromVersion?: string | null;
  toVersion?: string | null;
  updatedFiles: string[];
}

/** Client cho /api/icd — đồng bộ danh mục ICD-10 từ nguồn công bố. */
@Injectable({ providedIn: 'root' })
export class IcdApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/icd`;

  syncStatus(): Observable<IcdSyncStatusDto> {
    return this.http.get<IcdSyncStatusDto>(`${this.base}/sync/status`);
  }

  syncSettings(): Observable<IcdSyncSettingsDto> {
    return this.http.get<IcdSyncSettingsDto>(`${this.base}/sync/settings`);
  }

  updateSyncSettings(enabled: boolean, time: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/sync/settings`, { enabled, time });
  }

  /** Đồng bộ ngay (force = tải lại bất kể phiên bản). */
  syncNow(force = false): Observable<IcdSyncResultDto> {
    let params = new HttpParams();
    if (force) params = params.set('force', true);
    return this.http.post<IcdSyncResultDto>(`${this.base}/sync`, {}, { params });
  }
}
