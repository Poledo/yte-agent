import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillingDetailDto, BillingPeriodDto, CloseResultDto, InvoiceDto } from './models';

/**
 * Client cho /api/billing — bảng kê sản lượng và hóa đơn theo cơ sở KCB.
 *
 * Bảng kê (usage) tính LẠI từ sổ mỗi lần gọi nên luôn theo số hiện tại; hóa đơn thì
 * đóng băng con số của kỳ tại thời điểm chốt.
 */
@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/billing`;

  /** Bảng kê toàn bộ cơ sở trong một kỳ; bỏ trống period = kỳ đang chạy. */
  usage(period?: number): Observable<BillingPeriodDto> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<BillingPeriodDto>(`${this.base}/usage`, { params });
  }

  /** Chi tiết sản lượng một hợp đồng: theo ngày, theo đơn vị phát sinh, theo nhân viên. */
  detail(licenseId: number, period?: number): Observable<BillingDetailDto> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<BillingDetailDto>(`${this.base}/usage/${licenseId}`, { params });
  }

  invoices(period?: number, licenseId?: number): Observable<InvoiceDto[]> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    if (licenseId) params = params.set('licenseId', licenseId);
    return this.http.get<InvoiceDto[]>(`${this.base}/invoices`, { params });
  }

  /** Chốt sổ: sinh hóa đơn bất biến. Chạy lại không tạo bản trùng. */
  close(period: number, allowCurrentPeriod = false): Observable<CloseResultDto> {
    return this.http.post<CloseResultDto>(`${this.base}/close`, { period, allowCurrentPeriod });
  }
}
