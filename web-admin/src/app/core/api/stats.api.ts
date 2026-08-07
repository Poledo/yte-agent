import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Một mốc trên biểu đồ hoạt động (giờ trong ngày hoặc ngày trong khoảng). */
export interface UsagePointDto {
  label: string;
  ask: number;
  check: number;
  errors: number;
  risk: number;
}

/** Thống kê sử dụng trả về từ GET /api/stats/usage. */
export interface UsageStatsDto {
  from: string;
  to: string;
  granularity: 'hour' | 'day';
  totalAsk: number;
  totalCheck: number;
  totalHoso: number;
  totalErrors: number;
  totalWarnings: number;
  totalRisk: number;
  points: UsagePointDto[];
}

/** Một dòng lịch sử hoạt động (danh sách). */
export interface UsageEventRow {
  id: number;
  eventType: 'Ask' | 'Xml130Check';
  createdAt: string;
  facilityCode: string;
  staffCode: string;
  hosoCount: number;
  errorCount: number;
  warningCount: number;
  xuatToanRisk: boolean;
  durationMs: number;
  preview: string | null;
  hasDetail: boolean;
}

/** Chi tiết một lượt (kèm nội dung phản hồi đầy đủ dạng JSON). */
export interface UsageEventDetail extends Omit<UsageEventRow, 'hasDetail'> {
  detailJson: string | null;
}

/**
 * Client cho /api/dashboard (thống kê + lịch sử hoạt động — cần đăng nhập).
 * Route tránh chữ "stats" vì các extension chặn quảng cáo (EasyPrivacy) chặn
 * URL chứa "/stats/" → net::ERR_BLOCKED_BY_CLIENT.
 */
@Injectable({ providedIn: 'root' })
export class StatsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/dashboard`;

  /** from/to dạng yyyy-MM-dd (ngày theo giờ Việt Nam, "to" bao trọn ngày). */
  usage(from: string, to: string): Observable<UsageStatsDto> {
    return this.http.get<UsageStatsDto>(`${this.base}/usage`, { params: { from, to } });
  }

  /** Danh sách lịch sử (mới nhất trước, tối đa 500 dòng). type bỏ trống = tất cả. */
  events(from: string, to: string, type?: string): Observable<UsageEventRow[]> {
    const params: Record<string, string> = { from, to };
    if (type) params['type'] = type;
    return this.http.get<UsageEventRow[]>(`${this.base}/events`, { params });
  }

  /** Nội dung phản hồi đầy đủ của một lượt. */
  eventDetail(id: number): Observable<UsageEventDetail> {
    return this.http.get<UsageEventDetail>(`${this.base}/events/${id}`);
  }
}
