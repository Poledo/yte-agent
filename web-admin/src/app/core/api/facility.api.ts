import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FacilityCatalogScopeDto, FacilityDto, FacilityRequest } from './models';

/** Client cho /api/facility — cây đơn vị (cơ sở KCB) và cấu hình kế thừa danh mục. */
@Injectable({ providedIn: 'root' })
export class FacilityApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/facility`;

  /** Danh sách phẳng — dùng cho ô chọn đơn vị khi nạp danh mục. */
  list(includeInactive = false): Observable<FacilityDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<FacilityDto[]>(this.base, { params });
  }

  /** Cây lồng nhau: đơn vị gốc → con → cháu. */
  tree(includeInactive = false): Observable<FacilityDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<FacilityDto[]>(`${this.base}/tree`, { params });
  }

  create(body: FacilityRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, body);
  }

  update(id: number, body: FacilityRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  /** Đơn vị này thực sự dùng danh mục của ai (theo từng loại danh mục). */
  catalogScope(code: string): Observable<FacilityCatalogScopeDto> {
    return this.http.get<FacilityCatalogScopeDto>(`${this.base}/${encodeURIComponent(code)}/catalog-scope`);
  }
}
