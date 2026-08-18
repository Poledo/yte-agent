import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentsApi, EmbeddingsStatusDto } from '../../core/api/documents.api';
import { DocumentDto } from '../../core/api/models';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { FileUpload } from '../../shared/file-upload/file-upload';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { fileTypeIcon } from '../../shared/file-type-icon';
import { DocDetailDialog, DocDetailDialogData } from './doc-detail-dialog/doc-detail-dialog';
import { IngestFromLegalDialog } from './ingest-from-legal-dialog/ingest-from-legal-dialog';
import { ValidityDialog, ValidityDialogData } from './validity-dialog/validity-dialog';

/** Trang kho tri thức RAG: nạp, xem chi tiết, gỡ mềm / khôi phục văn bản — dạng bảng như màn Danh mục. */
@Component({
  selector: 'app-documents',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeader,
    FileUpload,
    DataTable,
    ColumnDefDirective,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class Documents {
  private readonly api = inject(DocumentsApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly documents = signal<DocumentDto[]>([]);
  readonly showUpload = signal(false);
  /** Hiện cả văn bản đã gỡ (để khôi phục). */
  readonly showInactive = signal(false);
  readonly searchCtrl = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.searchCtrl.valueChanges, { initialValue: '' });

  /** Icon + màu theo loại file gốc của văn bản. */
  readonly fileIcon = fileTypeIcon;

  readonly columns = computed<TableColumn[]>(() => [
    { key: 'title', header: 'Văn bản', sortable: true },
    { key: 'docType', header: 'Loại', sortable: true, width: '120px' },
    // Chỉ quản trị hệ thống mới cần phân biệt văn bản dùng chung với văn bản riêng
    // của từng cơ sở - quản trị cơ sở nhìn đâu cũng là nhánh của mình.
    ...(this.auth.isSystemScope()
      ? [{ key: 'facility', header: 'Cơ sở', width: '190px' } as TableColumn]
      : []),
    { key: 'validity', header: 'Hiệu lực', width: '170px' },
    { key: 'chunkCount', header: 'Số đoạn', align: 'end', width: '90px', sortable: true },
    { key: 'createdAt', header: 'Ngày nạp', width: '110px', sortable: true },
    { key: 'status', header: 'Trạng thái', align: 'center', width: '125px' },
    { key: 'actions', header: '', align: 'end', width: '130px' },
  ]);

  /** Số văn bản đang hiệu lực trong kho nhưng ĐÃ hết hạn theo ngày hết hiệu lực. */
  readonly expiredCount = computed(
    () => this.documents().filter((d) => d.isActive && this.isExpired(d.expiryDate)).length,
  );

  /** Văn bản đã quá ngày hết hiệu lực? */
  isExpired(expiryDate?: string | null): boolean {
    return !!expiryDate && new Date(expiryDate) < new Date();
  }

  /**
   * Text cột Hiệu lực:
   * - không có thông tin → chuỗi rỗng (ô trống);
   * - chỉ có ngày hiệu lực → "13/02/2026";
   * - có cả hai → "13/02/2026 → 13/02/2029";
   * - chỉ có ngày hết hiệu lực → "→ 13/02/2029".
   */
  validityText(doc: DocumentDto): string {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
    if (doc.effectiveDate && doc.expiryDate) return `${fmt(doc.effectiveDate)} → ${fmt(doc.expiryDate)}`;
    if (doc.effectiveDate) return fmt(doc.effectiveDate);
    if (doc.expiryDate) return `→ ${fmt(doc.expiryDate)}`;
    return '';
  }

  /** Gỡ mềm tất cả văn bản đã hết hiệu lực — RAG vốn tự loại, nút này để dọn danh sách. */
  removeExpired(): void {
    const count = this.expiredCount();
    if (count === 0) {
      this.notify.error('Không có văn bản nào đã hết hiệu lực trong kho.');
      return;
    }
    this.confirm
      .open({
        title: 'Gỡ văn bản hết hiệu lực',
        message:
          `Gỡ ${count} văn bản đã hết hiệu lực khỏi kho? ` +
          'Trợ lý AI vốn đã không trích dẫn chúng — thao tác này chỉ dọn danh sách cho gọn. ' +
          'Từng văn bản vẫn khôi phục được (bật "Hiện đã gỡ").',
        danger: true,
        confirmText: 'Gỡ hết hạn',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.removeExpired().subscribe({
          next: (res) => {
            this.notify.success(res?.message ?? 'Đã gỡ văn bản hết hiệu lực.');
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không gỡ được'),
        });
      });
  }

  readonly filtered = computed(() => {
    const t = this.term().trim().toLowerCase();
    if (!t) return this.documents();
    return this.documents().filter(
      (d) =>
        d.title.toLowerCase().includes(t) ||
        (d.docType ?? '').toLowerCase().includes(t) ||
        (d.docNumber ?? '').toLowerCase().includes(t) ||
        (d.sourceFileName ?? '').toLowerCase().includes(t),
    );
  });

  // Hàm upload truyền cho file-upload component
  readonly uploadFn = (file: File): Observable<HttpEvent<unknown>> =>
    this.api.upload(file, { title: file.name.replace(/\.[^.]+$/, '') });

  constructor() {
    this.load();
    this.loadEmbeddingsStatus();
  }

  load(): void {
    this.loading.set(true);
    this.api.list(this.showInactive()).subscribe({
      next: (list) => {
        this.documents.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách văn bản');
        this.loading.set(false);
      },
    });
  }

  toggleInactive(show: boolean): void {
    this.showInactive.set(show);
    this.load();
  }

  onUploaded(): void {
    // Làm mới danh sách sau khi có file thành công
    this.load();
    this.loadEmbeddingsStatus();
  }

  /** Đang chạy tạo chỉ mục ngữ nghĩa; số đoạn còn lại (hiện trên nút). */
  readonly indexing = signal(false);
  readonly indexingRemaining = signal<number | null>(null);

  /** Trạng thái tầng ngữ nghĩa (Ollama + chỉ mục pgvector/bộ nhớ) — dải thông tin trên bảng. */
  readonly embStatus = signal<EmbeddingsStatusDto | null>(null);
  readonly embStatusLoading = signal(false);

  loadEmbeddingsStatus(): void {
    this.embStatusLoading.set(true);
    this.api.embeddingsStatus().subscribe({
      next: (s) => {
        this.embStatus.set(s);
        this.embStatusLoading.set(false);
      },
      error: () => {
        this.embStatus.set(null);
        this.embStatusLoading.set(false);
      },
    });
  }

  /**
   * Tạo chỉ mục ngữ nghĩa: đánh thức worker NỀN phía server (một request duy nhất,
   * trả về ngay) rồi theo dõi tiến độ qua endpoint status — đóng tab cũng không
   * dừng việc chỉ mục. Lỗi 4xx (ví dụ Ollama chưa chạy) báo ngay.
   */
  rebuildEmbeddings(): void {
    this.indexing.set(true);
    this.indexingRemaining.set(null);
    this.api.rebuildEmbeddings().subscribe({
      next: (res) => {
        if ((res?.remaining ?? 0) === 0) {
          this.notify.success(res?.message ?? 'Đã tạo chỉ mục ngữ nghĩa.');
          this.indexing.set(false);
          this.loadEmbeddingsStatus();
          return;
        }
        this.indexingRemaining.set(res.remaining);
        this.pollIndexing(res.remaining, 0);
      },
      error: (e) => {
        const detail = e?.error?.message ?? e?.message ?? 'Không tạo được chỉ mục ngữ nghĩa.';
        this.notify.error(e?.status ? `${detail} (HTTP ${e.status})` : detail);
        this.indexing.set(false);
        this.indexingRemaining.set(null);
        this.loadEmbeddingsStatus();
      },
    });
  }

  /**
   * Theo dõi worker nền: hỏi status mỗi 3 giây tới khi Remaining = 0. Nếu số còn lại
   * không giảm suốt ~30 giây mà worker cũng không chạy thì coi như kẹt (ví dụ Ollama
   * chết giữa chừng) — dừng theo dõi và báo lỗi; tiến độ đã embed vẫn được giữ.
   */
  private pollIndexing(prevRemaining: number, stalls: number): void {
    setTimeout(() => {
      this.api.embeddingsStatus().subscribe({
        next: (s) => {
          this.embStatus.set(s);
          const remaining = s.remaining ?? 0;
          this.indexingRemaining.set(remaining > 0 ? remaining : null);
          if (remaining === 0 && !s.indexing) {
            this.notify.success('Đã tạo xong chỉ mục ngữ nghĩa cho toàn bộ kho.');
            this.indexing.set(false);
            this.indexingRemaining.set(null);
            return;
          }
          const stalled = remaining >= prevRemaining ? stalls + 1 : 0;
          if (stalled >= 10 && !s.indexing) {
            this.notify.error(
              s.ollama !== 'OK' ? s.ollama : 'Chỉ mục nền không tiến triển — xem log API.',
            );
            this.indexing.set(false);
            this.indexingRemaining.set(null);
            return;
          }
          this.pollIndexing(remaining, stalled);
        },
        error: () => {
          // Rớt mạng thoáng qua — thử tiếp, nhưng không quá ~30 giây liên tục
          if (stalls >= 10) {
            this.notify.error('Mất kết nối tới API khi theo dõi tiến độ chỉ mục.');
            this.indexing.set(false);
            this.indexingRemaining.set(null);
            return;
          }
          this.pollIndexing(prevRemaining, stalls + 1);
        },
      });
    }, 3000);
  }

  /** Nạp văn bản từ danh sách "đã tải" (màn Tải văn bản) thay vì chọn file từ máy. */
  openIngestFromLegal(): void {
    this.dialog
      .open(IngestFromLegalDialog, { width: '640px', maxWidth: '95vw', autoFocus: false })
      .afterClosed()
      .subscribe((ingested) => {
        if (ingested) this.load();
      });
  }

  openDetail(doc: DocumentDto): void {
    const data: DocDetailDialogData = { doc };
    this.dialog.open(DocDetailDialog, { data, width: '760px', maxWidth: '95vw', autoFocus: false });
  }

  openFile(doc: DocumentDto): void {
    window.open(`/viewer/doc/${doc.id}?name=${encodeURIComponent(doc.sourceFileName ?? '')}`, '_blank');
  }

  /** Nhập tay ngày hiệu lực / hết hiệu lực (hệ thống không tự đoán từ nội dung). */
  editValidity(doc: DocumentDto): void {
    const data: ValidityDialogData = {
      id: doc.id,
      title: doc.title,
      effectiveDate: doc.effectiveDate ?? null,
      expiryDate: doc.expiryDate ?? null,
    };
    this.dialog
      .open(ValidityDialog, { data, width: '480px', maxWidth: '95vw', autoFocus: false })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  remove(doc: DocumentDto): void {
    this.confirm
      .open({
        title: 'Gỡ văn bản',
        message:
          `Gỡ "${doc.title}" khỏi kho tri thức? ` +
          'Trợ lý AI sẽ ngừng tra cứu văn bản này, nhưng bạn có thể khôi phục sau.',
        danger: true,
        confirmText: 'Gỡ bỏ',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.remove(doc.id).subscribe({
          next: () => {
            this.notify.success('Đã gỡ văn bản. Có thể khôi phục khi cần.');
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không gỡ được'),
        });
      });
  }

  restore(doc: DocumentDto): void {
    this.api.restore(doc.id).subscribe({
      next: () => {
        this.notify.success('Đã khôi phục văn bản — AI tra cứu trở lại ngay');
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không khôi phục được'),
    });
  }
}
