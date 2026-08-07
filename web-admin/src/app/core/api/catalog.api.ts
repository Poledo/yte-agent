import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogItemsPageDto, CatalogSourceDto } from './models';

/** Client cho /api/catalog. */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/catalog`;

  sources(includeInactive = false): Observable<CatalogSourceDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<CatalogSourceDto[]>(`${this.base}/sources`, { params });
  }

  /** Gỡ mềm: danh mục ngừng hiệu lực nhưng còn dữ liệu để khôi phục. */
  removeSource(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/sources/${id}`);
  }

  /** Gỡ mềm TẤT CẢ danh mục đang hiệu lực (từng cái vẫn khôi phục được). */
  removeAllSources(): Observable<{ removedCount: number; message: string }> {
    return this.http.delete<{ removedCount: number; message: string }>(`${this.base}/sources`);
  }

  restoreSource(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/sources/${id}/restore`, {});
  }

  /** Nạp toàn văn một danh mục vào kho tri thức (trợ lý hỏi–đáp tra cứu được). */
  addToKnowledge(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/sources/${id}/knowledge`, {});
  }

  /** Gỡ một danh mục khỏi kho tri thức. */
  removeFromKnowledge(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/sources/${id}/knowledge`);
  }

  /** Nạp nhiều danh mục vào kho tri thức cùng lúc. */
  addManyToKnowledge(
    ids: number[],
  ): Observable<{ successCount: number; failed: { id: number; name?: string; message: string }[]; message: string }> {
    return this.http.post<{
      successCount: number;
      failed: { id: number; name?: string; message: string }[];
      message: string;
    }>(`${this.base}/sources/knowledge`, { ids });
  }

  /** Xem nội dung một nguồn danh mục (kể cả nguồn đã gỡ). */
  items(sourceId: number, q?: string, limit = 100): Observable<CatalogItemsPageDto> {
    let params = new HttpParams().set('sourceId', sourceId).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<CatalogItemsPageDto>(`${this.base}/items`, { params });
  }

  /** URL file Excel gốc (mở tab mới để xem/tải). */
  fileUrl(id: number): string {
    return `${this.base}/sources/${id}/file`;
  }

  /** Nạp file danh mục Excel có báo tiến trình. */
  import(file: File, facility?: string): Observable<HttpEvent<unknown>> {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams();
    if (facility) params = params.set('facility', facility);
    const req = new HttpRequest('POST', `${this.base}/import`, form, {
      reportProgress: true,
      params,
    });
    return this.http.request(req);
  }
}
