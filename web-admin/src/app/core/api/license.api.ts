import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IssuedLicenseDto, LicenseDto, LicenseRequest } from './models';

/**
 * Client cho /api/license — hợp đồng bán theo cơ sở KCB.
 *
 * Khóa bản quyền chỉ đi ra khỏi máy chủ đúng một lần, ở kết quả của create/rotate.
 * Không có endpoint nào đọc lại khóa: máy chủ chỉ lưu bản băm.
 */
@Injectable({ providedIn: 'root' })
export class LicenseApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/license`;

  list(includeRevoked = false): Observable<LicenseDto[]> {
    let params = new HttpParams();
    if (includeRevoked) params = params.set('includeRevoked', true);
    return this.http.get<LicenseDto[]>(this.base, { params });
  }

  create(body: LicenseRequest): Observable<IssuedLicenseDto> {
    return this.http.post<IssuedLicenseDto>(this.base, body);
  }

  /** Sửa điều khoản. KHÔNG đổi khóa và KHÔNG đổi đơn vị đứng tên hợp đồng. */
  update(id: number, body: LicenseRequest): Observable<LicenseDto> {
    return this.http.put<LicenseDto>(`${this.base}/${id}`, body);
  }

  /** Cấp lại khóa: khóa cũ mất hiệu lực NGAY, sản lượng và hóa đơn giữ nguyên. */
  rotate(id: number): Observable<IssuedLicenseDto> {
    return this.http.post<IssuedLicenseDto>(`${this.base}/${id}/rotate`, {});
  }

  revoke(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/revoke`, {});
  }

  restore(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/restore`, {});
  }
}
