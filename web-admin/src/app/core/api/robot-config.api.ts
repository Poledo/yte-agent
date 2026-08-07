import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExtensionConfigDto } from './models';

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
}
