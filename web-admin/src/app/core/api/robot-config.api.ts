import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExtensionConfigDto, FacilityRobotConfigDto, FacilityRobotOverrideDto } from './models';

/** Client cho /api/admin/extension-config (hình hài robot + hệ sinh hoạt). */
@Injectable({ providedIn: 'root' })
export class RobotConfigApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/extension-config`;

  get(): Observable<ExtensionConfigDto> {
    return this.http.get<ExtensionConfigDto>(this.base);
  }

  update(body: ExtensionConfigDto): Observable<{ message: string; robotRenderer: string }> {
    return this.http.put<{ message: string; robotRenderer: string }>(this.base, body);
  }

  /** Các cơ sở đang có cấu hình RIÊNG (đã ghi đè cấu hình chung). */
  overrides(): Observable<FacilityRobotOverrideDto[]> {
    return this.http.get<FacilityRobotOverrideDto[]>(`${this.base}/facilities`);
  }

  /** Cấu hình hiệu lực của một cơ sở, kèm cho biết đang thừa hưởng từ đâu. */
  getForFacility(facilityId: number): Observable<FacilityRobotConfigDto> {
    return this.http.get<FacilityRobotConfigDto>(`${this.base}/facility/${facilityId}`);
  }

  updateForFacility(
    facilityId: number,
    body: ExtensionConfigDto,
  ): Observable<{ message: string; robotRenderer: string }> {
    return this.http.put<{ message: string; robotRenderer: string }>(
      `${this.base}/facility/${facilityId}`,
      body,
    );
  }

  /** Bỏ cấu hình riêng để cơ sở quay lại thừa hưởng cấp trên. */
  clearForFacility(facilityId: number): Observable<{ message: string; removed?: boolean }> {
    return this.http.delete<{ message: string; removed?: boolean }>(
      `${this.base}/facility/${facilityId}`,
    );
  }
}
