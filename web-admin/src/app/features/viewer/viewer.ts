import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { read, utils, type WorkBook } from 'xlsx';
import { renderAsync } from 'docx-preview';
import { environment } from '../../../environments/environment';

/** Chế độ hiển thị theo loại file. */
type ViewMode = 'loading' | 'excel' | 'docx' | 'native' | 'unsupported' | 'error';

/**
 * Trang xem file gốc toàn màn hình (mở tab mới):
 * - .xls/.xlsx/.csv: SheetJS render bảng, chuyển được giữa các sheet.
 * - .docx: docx-preview render sát định dạng gốc.
 * - .pdf/.txt/ảnh: trình duyệt hiển thị trực tiếp (iframe).
 * - Loại khác (.doc cũ...): hướng dẫn tải về.
 * File đọc qua API nội bộ — không gửi ra dịch vụ bên ngoài.
 */
@Component({
  selector: 'app-viewer',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './viewer.html',
  styleUrl: './viewer.scss',
})
export class Viewer {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly docxHost = viewChild<ElementRef<HTMLDivElement>>('docxHost');

  readonly mode = signal<ViewMode>('loading');
  readonly fileName = signal('');
  readonly errorMessage = signal('');

  // Excel
  private workbook: WorkBook | null = null;
  readonly sheetNames = signal<string[]>([]);
  readonly activeSheet = signal('');
  readonly sheetHtml = signal<SafeHtml | null>(null);

  // pdf/txt/ảnh nhúng trực tiếp
  readonly nativeUrl = signal<SafeResourceUrl | null>(null);

  /** URL file gốc trên API theo loại nguồn. */
  readonly fileUrl = computed(() => {
    const kind = this.route.snapshot.paramMap.get('kind');
    const id = this.route.snapshot.paramMap.get('id');
    return kind === 'catalog'
      ? `${environment.apiBaseUrl}/api/catalog/sources/${id}/file`
      : `${environment.apiBaseUrl}/api/assistant/documents/${id}/file`;
  });

  constructor() {
    this.fileName.set(this.route.snapshot.queryParamMap.get('name') ?? '');
    this.load();
  }

  private load(): void {
    this.http.get(this.fileUrl(), { responseType: 'arraybuffer', observe: 'response' }).subscribe({
      next: (res) => {
        // Ưu tiên tên file server trả về (Content-Disposition)
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = /filename\*=UTF-8''([^;]+)/i.exec(cd);
        if (match) this.fileName.set(decodeURIComponent(match[1]));

        this.render(res.body ?? new ArrayBuffer(0));
      },
      error: async (err) => {
        // Body lỗi là JSON nhưng đọc dưới dạng arraybuffer — giải mã lại
        let message = 'Không tải được file.';
        try {
          const text = new TextDecoder('utf-8').decode(err.error);
          message = JSON.parse(text)?.message ?? message;
        } catch {
          /* giữ thông báo mặc định */
        }
        this.errorMessage.set(message);
        this.mode.set('error');
      },
    });
  }

  private render(buffer: ArrayBuffer): void {
    const ext = this.fileName().split('.').pop()?.toLowerCase() ?? '';

    if (['xls', 'xlsx', 'xlsm', 'csv'].includes(ext)) {
      this.renderExcel(buffer);
    } else if (ext === 'docx') {
      this.renderDocx(buffer);
    } else if (['pdf', 'txt', 'md', 'html', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      this.nativeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl()));
      this.mode.set('native');
    } else {
      // .doc cũ, .xml... — không render trong trình duyệt được
      this.mode.set('unsupported');
    }
  }

  private renderExcel(buffer: ArrayBuffer): void {
    try {
      this.workbook = read(new Uint8Array(buffer), { type: 'array', codepage: 65001 });
      this.sheetNames.set(this.workbook.SheetNames);
      this.mode.set('excel');
      this.selectSheet(this.workbook.SheetNames[0]);
    } catch {
      this.errorMessage.set('File Excel bị hỏng hoặc định dạng không đọc được.');
      this.mode.set('error');
    }
  }

  selectSheet(name: string): void {
    if (!this.workbook) return;
    this.activeSheet.set(name);
    // sheet_to_html tự escape nội dung ô nên an toàn để bind innerHTML
    const html = utils.sheet_to_html(this.workbook.Sheets[name], { header: '', footer: '' });
    this.sheetHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
  }

  private renderDocx(buffer: ArrayBuffer): void {
    this.mode.set('docx');
    // Chờ Angular render container #docxHost xong rồi mới đổ nội dung
    setTimeout(async () => {
      const host = this.docxHost()?.nativeElement;
      if (!host) return;
      try {
        await renderAsync(buffer, host, undefined, { inWrapper: true });
      } catch {
        this.errorMessage.set('File Word bị hỏng hoặc định dạng không đọc được.');
        this.mode.set('error');
      }
    });
  }

  download(): void {
    window.open(`${this.fileUrl()}?download=true`, '_blank');
  }
}
