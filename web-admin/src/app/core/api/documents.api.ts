import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentDetailDto, DocumentDto } from './models';

/** Trạng thái tầng tìm kiếm ngữ nghĩa (GET /api/assistant/embeddings/status). */
export interface EmbeddingsStatusDto {
  /** "OK" hoặc mô tả lỗi kết nối Ollama. */
  ollama: string;
  /** Mô tả chỉ mục đang dùng: pgvector (HNSW) hay bộ nhớ, kèm số vector. */
  index: string;
  dbError?: string | null;
  totalChunks: number;
  embedded: number;
  remaining: number;
  /** Worker nền đang trong một lượt chỉ mục. */
  indexing: boolean;
}

/** Client cho /api/assistant/documents (kho tri thức RAG). */
@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/assistant/documents`;

  list(includeInactive = false): Observable<DocumentDto[]> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', true);
    return this.http.get<DocumentDto[]>(this.base, { params });
  }

  /** Chi tiết văn bản kèm toàn văn nội dung. */
  detail(id: number): Observable<DocumentDetailDto> {
    return this.http.get<DocumentDetailDto>(`${this.base}/${id}`);
  }

  /** URL file gốc (mở tab mới để xem/tải). */
  fileUrl(id: number): string {
    return `${this.base}/${id}/file`;
  }

  /** Gỡ mềm: AI ngừng tra cứu nhưng còn dữ liệu để khôi phục. */
  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  /** Gỡ mềm TẤT CẢ văn bản đang hiệu lực (từng cái vẫn khôi phục được). */
  removeAll(): Observable<{ removedCount: number; message: string }> {
    return this.http.delete<{ removedCount: number; message: string }>(this.base);
  }

  /** Gỡ mềm tất cả văn bản ĐÃ HẾT HIỆU LỰC (dọn danh sách; RAG vốn đã tự loại chúng). */
  removeExpired(): Observable<{ removedCount: number; message: string }> {
    return this.http.delete<{ removedCount: number; message: string }>(`${this.base}/expired`);
  }

  /**
   * Tạo chỉ mục ngữ nghĩa (embedding) cho các đoạn chưa có — cần Ollama chạy local.
   * Lưu ý: endpoint nằm ở /api/assistant/embeddings/... (KHÔNG có segment /documents).
   */
  rebuildEmbeddings(): Observable<{ embedded: number; remaining: number; message: string }> {
    return this.http.post<{ embedded: number; remaining: number; message: string }>(
      `${environment.apiBaseUrl}/api/assistant/embeddings/rebuild`,
      {},
    );
  }

  /** Trạng thái tầng ngữ nghĩa: Ollama sống chưa, chỉ mục pgvector hay bộ nhớ, còn bao nhiêu đoạn thiếu. */
  embeddingsStatus(): Observable<EmbeddingsStatusDto> {
    return this.http.get<EmbeddingsStatusDto>(`${environment.apiBaseUrl}/api/assistant/embeddings/status`);
  }

  restore(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/restore`, {});
  }

  /**
   * Cập nhật ngày hiệu lực / hết hiệu lực (yyyy-MM-dd hoặc null để xóa).
   * Hệ thống không tự đoán ngày từ nội dung nữa — người dùng nhập tay tại đây.
   */
  updateValidity(
    id: number,
    body: { effectiveDate: string | null; expiryDate: string | null },
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}/validity`, body);
  }

  /** Upload có báo tiến trình. Trả stream HttpEvent để đọc % thật. */
  upload(file: File, meta: { title?: string; docType?: string }): Observable<HttpEvent<unknown>> {
    const form = new FormData();
    form.append('file', file);
    if (meta.title) form.append('title', meta.title);
    if (meta.docType) form.append('docType', meta.docType);
    const req = new HttpRequest('POST', this.base, form, {
      reportProgress: true,
    });
    return this.http.request(req);
  }
}
