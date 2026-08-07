import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Tóm tắt thay đổi từng bảng sau khi import đặc tả. */
export interface Xml130TableImportSummary {
  tableId: string;
  tableName?: string;
  fields: number;
  added: number;
  updated: number;
  removed: number;
}

/** Kết quả import file đặc tả cấu trúc XML130. */
export interface Xml130FieldSpecImportResult {
  message: string;
  tableCount: number;
  fieldCount: number;
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  inferredDates: number;
  inferredEnums: number;
  skippedSheets: string[];
  tables: Xml130TableImportSummary[];
}

/** Tóm tắt đặc tả trường XML130 đang có hiệu lực. */
export interface Xml130FieldSpecsSummary {
  source: 'import' | 'goc';
  tableCount: number;
  fieldCount: number;
  requiredCount: number;
  dateFormatCount: number;
  allowedValuesCount: number;
  tables: { tableId: string; tableName?: string; fieldCount: number }[];
}

/** Client cho /api/xml130 đặc tả trường (điều kiện kiểm tra hồ sơ). */
@Injectable({ providedIn: 'root' })
export class Xml130Api {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/xml130`;

  /** Đặc tả đang có hiệu lực (số bảng/trường/điều kiện, đang dùng bản gốc hay bản import). */
  fieldSpecs(): Observable<Xml130FieldSpecsSummary> {
    return this.http.get<Xml130FieldSpecsSummary>(`${this.base}/field-specs`);
  }

  /** Nạp lại file Excel đặc tả cấu trúc XML130 — điều kiện kiểm tra đổi theo file ngay. */
  importFieldSpecs(file: File): Observable<Xml130FieldSpecImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Xml130FieldSpecImportResult>(`${this.base}/field-specs/import`, form);
  }
}
