import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LegalApi, LegalDocDto, LegalDownloadDto } from '../../core/api/legal.api';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { EmptyState } from '../../shared/empty-state/empty-state';

/**
 * Trang "Tải văn bản":
 * 1. Tìm văn bản pháp luật (bản TEXT) trên vbpl.vn theo lĩnh vực/từ khóa + khoảng
 *    ngày ban hành → bấm "Tải về" để lưu vào DB (thông tin + toàn văn).
 * 2. Danh sách văn bản ĐÃ TẢI (lưu bền trong DB): xem toàn văn, chọn bằng checkbox
 *    (từng dòng / chọn tất cả) rồi "Nạp vào kho tri thức"; nạp thành công được
 *    đánh dấu "Đã nạp".
 */
@Component({
  selector: 'app-legal',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeader,
    EmptyState,
  ],
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
})
export class Legal {
  private readonly api = inject(LegalApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  /** Lĩnh vực gợi ý — thực chất là cụm từ khóa tìm trong tiêu đề văn bản. */
  readonly fields: { label: string; keyword: string }[] = [
    { label: 'Bảo hiểm y tế', keyword: 'bảo hiểm y tế' },
    { label: 'Khám bệnh, chữa bệnh', keyword: 'khám bệnh, chữa bệnh' },
    { label: 'Dược', keyword: 'dược' },
    { label: 'Trang thiết bị y tế', keyword: 'trang thiết bị y tế' },
    { label: 'Giá dịch vụ y tế', keyword: 'giá dịch vụ khám bệnh' },
    { label: 'An toàn thực phẩm', keyword: 'an toàn thực phẩm' },
    { label: '(Tự nhập từ khóa)', keyword: '' },
  ];

  readonly fieldCtrl = new FormControl(this.fields[0].keyword, { nonNullable: true });
  readonly keywordCtrl = new FormControl('', { nonNullable: true });
  readonly fromCtrl = new FormControl('', { nonNullable: true });
  readonly toCtrl = new FormControl('', { nonNullable: true });
  /** Lọc hiệu lực: all | active | expired. */
  readonly effStatusCtrl = new FormControl('all', { nonNullable: true });

  /** Tab đang mở: 0 = Tìm & tải, 1 = Văn bản đã tải. */
  readonly activeTab = signal(0);

  // ---- Khu 1: kết quả tìm trên vbpl.vn ----
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly page = signal(1);
  readonly results = signal<LegalDocDto[]>([]);
  /** itemId đang tải về (chuỗi: số cũ hoặc GUID mới). */
  readonly downloading = signal<Set<string>>(new Set());

  // ---- Khu 2: danh sách đã tải (DB) ----
  readonly loadingDownloads = signal(true);
  readonly downloadsList = signal<LegalDownloadDto[]>([]);
  /** id (bản ghi DB) được tick chọn. */
  readonly selected = signal<Set<number>>(new Set());
  readonly ingesting = signal(false);

  // Chọn được MỌI dòng; hai nút hàng loạt tự áp lên tập con đúng trạng thái
  // (dòng "lẫn trạng thái" với thao tác nào thì thao tác đó tự bỏ qua nó).
  readonly allSelected = computed(
    () => this.downloadsList().length > 0 && this.downloadsList().every((d) => this.selected().has(d.id)),
  );
  readonly someSelected = computed(
    () => !this.allSelected() && this.downloadsList().some((d) => this.selected().has(d.id)),
  );

  /** Số dòng đã chọn CHƯA nạp — áp cho nút "Nạp các file chọn". */
  readonly selectedIngestCount = computed(
    () => this.downloadsList().filter((d) => !d.ingested && this.selected().has(d.id)).length,
  );

  /** Số dòng đã chọn ĐÃ nạp — áp cho nút "Gỡ các file chọn". */
  readonly selectedRemoveCount = computed(
    () => this.downloadsList().filter((d) => d.ingested && this.selected().has(d.id)).length,
  );

  constructor() {
    this.loadDownloads();
  }

  // ---------------------------------------------------------------
  // Tìm kiếm + tải về
  // ---------------------------------------------------------------

  /**
   * Nhập từ khóa thì tìm ĐÚNG từ khóa đó (dán nguyên tên/số hiệu văn bản vẫn ra);
   * lĩnh vực chỉ dùng làm từ khóa mặc định khi ô từ khóa để trống — ghép cả hai
   * kiểu cũ làm văn bản ngoài lĩnh vực y tế không bao giờ khớp.
   */
  private buildKeyword(): string {
    return this.cleanKeyword(this.keywordCtrl.value) || this.cleanKeyword(this.fieldCtrl.value);
  }

  /**
   * Làm sạch từ khóa COPY từ trang web: dấu tiếng Việt về dạng dựng sẵn (NFC — bản
   * copy hay ở dạng tổ hợp, nhìn giống hệt nhưng khác byte nên server tìm không ra),
   * các "dấu cách tàng hình" (NBSP, zero-width, BOM...) về dấu cách thường.
   */
  private cleanKeyword(value: string): string {
    return value
      .normalize('NFC')
      .replace(/[   -​  　﻿]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  search(page = 1): void {
    const keyword = this.buildKeyword();
    if (!keyword) {
      this.notify.error('Chọn lĩnh vực hoặc nhập từ khóa trước đã.');
      return;
    }
    this.searching.set(true);
    this.page.set(page);
    this.api
      .search(
        keyword,
        this.fromCtrl.value || undefined,
        this.toCtrl.value || undefined,
        page,
        this.effStatusCtrl.value,
      )
      .subscribe({
      next: (list) => {
        this.results.set(list);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không tìm được — kiểm tra kết nối mạng của máy chủ.');
        this.searching.set(false);
      },
    });
  }

  isDownloading(doc: LegalDocDto): boolean {
    return this.downloading().has(doc.itemId);
  }

  /** Tải một văn bản về DB (chưa nạp kho tri thức). */
  download(doc: LegalDocDto): void {
    this.downloading.update((s) => new Set(s).add(doc.itemId));
    this.api
      .download({
        itemId: doc.itemId,
        title: doc.title,
        docNumber: doc.docNumber,
        issuedDate: doc.issuedDate,
        effectiveDate: doc.effectiveDate,
        expiryDate: doc.expiryDate,
        url: doc.url,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(res.message);
          this.markDownloaded(doc.itemId);
          this.loadDownloads();
        },
        error: (e) => {
          this.notify.error(e?.error?.message ?? `Không tải được "${doc.title}"`);
          this.unmarkDownloading(doc.itemId);
        },
      });
  }

  private markDownloaded(itemId: string): void {
    this.unmarkDownloading(itemId);
    this.results.update((list) =>
      list.map((d) => (d.itemId === itemId ? { ...d, alreadyDownloaded: true } : d)),
    );
  }

  private unmarkDownloading(itemId: string): void {
    this.downloading.update((s) => {
      const next = new Set(s);
      next.delete(itemId);
      return next;
    });
  }

  openSource(url: string): void {
    window.open(url, '_blank');
  }

  /** Văn bản đã quá ngày hết hiệu lực? (dùng hiển thị cảnh báo) */
  isExpired(expiryDate?: string | null): boolean {
    return !!expiryDate && new Date(expiryDate) < new Date();
  }

  // ---------------------------------------------------------------
  // Danh sách đã tải + nạp kho tri thức
  // ---------------------------------------------------------------

  loadDownloads(): void {
    this.loadingDownloads.set(true);
    this.api.downloads().subscribe({
      next: (list) => {
        this.downloadsList.set(list);
        // Bỏ các lựa chọn của bản ghi đã bị xóa
        const validIds = new Set(list.map((d) => d.id));
        this.selected.update((s) => new Set([...s].filter((id) => validIds.has(id))));
        this.loadingDownloads.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách văn bản đã tải.');
        this.loadingDownloads.set(false);
      },
    });
  }

  toggleOne(download: LegalDownloadDto, checked: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (checked) next.add(download.id);
      else next.delete(download.id);
      return next;
    });
  }

  toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.downloadsList().map((d) => d.id)) : new Set());
  }

  isSelected(download: LegalDownloadDto): boolean {
    return this.selected().has(download.id);
  }

  viewContent(download: LegalDownloadDto): void {
    window.open(this.api.contentUrl(download.id), '_blank');
  }

  /** Nạp một văn bản vào kho tri thức. */
  ingestOne(download: LegalDownloadDto): void {
    this.runIngest([download.id]);
  }

  /** Nạp các văn bản đã tick chọn — chỉ áp lên dòng CHƯA nạp (dòng đã nạp tự bỏ qua). */
  ingestSelected(): void {
    const ids = this.downloadsList()
      .filter((d) => !d.ingested && this.selected().has(d.id))
      .map((d) => d.id);
    if (ids.length === 0) {
      this.notify.error('Trong các dòng đã chọn không có văn bản nào chưa nạp.');
      return;
    }
    this.runIngest(ids);
  }

  /** Gỡ một văn bản đã nạp khỏi kho tri thức. */
  removeKnowledgeOne(download: LegalDownloadDto): void {
    this.runRemoveKnowledge([download.id]);
  }

  /** Gỡ các văn bản đã tick chọn khỏi kho — chỉ áp lên dòng ĐÃ nạp (dòng chưa nạp tự bỏ qua). */
  removeKnowledgeSelected(): void {
    const ids = this.downloadsList()
      .filter((d) => d.ingested && this.selected().has(d.id))
      .map((d) => d.id);
    if (ids.length === 0) {
      this.notify.error('Trong các dòng đã chọn không có văn bản nào đang nằm trong kho tri thức.');
      return;
    }
    this.runRemoveKnowledge(ids);
  }

  private runRemoveKnowledge(ids: number[]): void {
    this.ingesting.set(true);
    this.api.removeKnowledge(ids).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.ingesting.set(false);
        this.loadDownloads();
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không gỡ được khỏi kho tri thức.');
        this.ingesting.set(false);
      },
    });
  }

  private runIngest(ids: number[]): void {
    this.ingesting.set(true);
    this.api.ingestSelected(ids).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        const errors = (res.results ?? []).filter((r) => r.status === 'error');
        for (const err of errors) {
          this.notify.error(`"${err.title}": ${err.message}`);
        }
        this.ingesting.set(false);
        this.loadDownloads();
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không nạp được vào kho tri thức.');
        this.ingesting.set(false);
      },
    });
  }

  removeDownload(download: LegalDownloadDto): void {
    this.confirm
      .open({
        title: 'Xóa văn bản đã tải',
        message:
          `Xóa VĨNH VIỄN "${download.title}" khỏi danh sách tải về (bao gồm toàn văn đã lưu)? ` +
          (download.ingested
            ? 'Bản ĐÃ NẠP trong kho tri thức được giữ nguyên — muốn gỡ thì dùng nút "Gỡ khỏi kho" trước.'
            : 'Muốn dùng lại sẽ phải tải lại từ vbpl.vn.'),
        danger: true,
        confirmText: 'Xóa vĩnh viễn',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.removeDownload(download.id).subscribe({
          next: (res) => {
            this.notify.success(res.message);
            this.loadDownloads();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không xóa được'),
        });
      });
  }
}
