import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Một văn bản tìm thấy trên vbpl.vn. */
export interface LegalDocDto {
  /** Định danh trên vbpl: văn bản cũ là số ("181847"), mới là GUID ("4fda4da0-..."). */
  itemId: string;
  title: string;
  docNumber?: string | null;
  issuedDate?: string | null;
  /** Ngày có hiệu lực (nếu vbpl trả về). */
  effectiveDate?: string | null;
  /** Ngày hết hiệu lực (null = còn hiệu lực). */
  expiryDate?: string | null;
  url: string;
  /** Đã tải về DB (bảng legal_downloads). */
  alreadyDownloaded: boolean;
  /** Đã nạp vào kho tri thức. */
  alreadyIngested: boolean;
}

/** Một văn bản đã tải về DB. */
export interface LegalDownloadDto {
  id: number;
  itemId: string;
  title: string;
  docNumber?: string | null;
  issuedDate?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  sourceUrl: string;
  downloadedAt: string;
  contentLength: number;
  /** Đã nạp và bản trong kho tri thức còn hiệu lực. */
  ingested: boolean;
  ingestedAt?: string | null;
}

export interface LegalIngestItemResult {
  id: number;
  title: string;
  status: 'done' | 'skipped' | 'error';
  message: string;
}

/** Client cho /api/legal — tải văn bản pháp luật từ vbpl.vn về DB rồi nạp kho tri thức theo lựa chọn. */
@Injectable({ providedIn: 'root' })
export class LegalApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/legal`;

  /** effStatus: 'active' (còn hiệu lực) | 'expired' (hết hiệu lực) | bỏ trống = tất cả. */
  search(keyword: string, from?: string, to?: string, page = 1, effStatus?: string): Observable<LegalDocDto[]> {
    let params = new HttpParams().set('keyword', keyword).set('page', page);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (effStatus && effStatus !== 'all') params = params.set('effStatus', effStatus);
    return this.http.get<LegalDocDto[]>(`${this.base}/search`, { params });
  }

  /** Tải toàn văn về DB (chưa nạp kho tri thức). */
  download(doc: {
    itemId: string;
    title: string;
    docNumber?: string | null;
    issuedDate?: string | null;
    effectiveDate?: string | null;
    expiryDate?: string | null;
    url?: string | null;
  }): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/download`, doc);
  }

  /** Danh sách văn bản đã tải. */
  downloads(): Observable<LegalDownloadDto[]> {
    return this.http.get<LegalDownloadDto[]>(`${this.base}/downloads`);
  }

  /** URL xem toàn văn đã tải (text thuần — mở tab mới). */
  contentUrl(id: number): string {
    return `${this.base}/downloads/${id}/content`;
  }

  /** Nạp các văn bản đã chọn vào kho tri thức. */
  ingestSelected(ids: number[]): Observable<{ results: LegalIngestItemResult[]; message: string }> {
    return this.http.post<{ results: LegalIngestItemResult[]; message: string }>(
      `${this.base}/downloads/ingest`,
      { ids },
    );
  }

  /** Gỡ (mềm) các văn bản đã nạp khỏi kho tri thức theo danh sách bản ghi tải về. */
  removeKnowledge(ids: number[]): Observable<{ removedCount: number; message: string }> {
    return this.http.post<{ removedCount: number; message: string }>(
      `${this.base}/downloads/remove-knowledge`,
      { ids },
    );
  }

  removeDownload(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/downloads/${id}`);
  }
}
