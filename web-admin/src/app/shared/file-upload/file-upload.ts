import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Trạng thái một file trong hàng đợi.
 * pending: đã chọn, chờ người dùng bấm Nạp.
 * queued: đã bấm Nạp, chờ tới lượt (giới hạn maxConcurrent).
 */
type FileStatus = 'pending' | 'queued' | 'uploading' | 'success' | 'error';

interface QueueItem {
  id: number;
  file: File;
  status: FileStatus;
  progress: number;
  message: string;
  sub?: Subscription;
}

/**
 * Component upload kéo-thả nhiều file. Chọn file KHÔNG nạp ngay — file vào danh
 * sách chờ, người dùng bấm "Nạp" từng file hoặc "Nạp tất cả" mới bắt đầu.
 * Mỗi file có tiến trình % và trạng thái riêng.
 * uploadFn: hàm nhận File, trả Observable<HttpEvent> (dùng reportProgress).
 */
@Component({
  selector: 'app-file-upload',
  imports: [MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  // Cấu hình
  readonly accept = input('');
  readonly multiple = input(true);
  readonly maxConcurrent = input(3);
  /** Hàm upload thật do trang cha cung cấp. */
  readonly uploadFn = input.required<(file: File) => Observable<HttpEvent<unknown>>>();
  /** Bắn ra khi có ít nhất 1 file upload thành công (để refresh list). */
  readonly uploaded = output<void>();

  readonly items = signal<QueueItem[]>([]);
  readonly dragOver = signal(false);
  private seq = 0;
  private activeCount = 0;

  readonly pendingCount = computed(
    () => this.items().filter((i) => i.status === 'pending').length,
  );
  readonly busyCount = computed(
    () => this.items().filter((i) => i.status === 'queued' || i.status === 'uploading').length,
  );
  readonly successCount = computed(
    () => this.items().filter((i) => i.status === 'success').length,
  );
  readonly errorCount = computed(() => this.items().filter((i) => i.status === 'error').length);
  readonly hasFinished = computed(() =>
    this.items().some((i) => i.status === 'success' || i.status === 'error'),
  );

  // ===== Kéo-thả =====
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }
  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
  }
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files) this.addFiles(e.dataTransfer.files);
  }

  onPick(input: HTMLInputElement): void {
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  /** Chỉ thêm vào danh sách chờ — KHÔNG tự upload. */
  private addFiles(list: FileList): void {
    const incoming = Array.from(list);
    const toAdd = this.multiple() ? incoming : incoming.slice(0, 1);
    const mapped: QueueItem[] = toAdd.map((file) => ({
      id: ++this.seq,
      file,
      status: 'pending',
      progress: 0,
      message: '',
    }));
    this.items.update((cur) => (this.multiple() ? [...cur, ...mapped] : mapped));
  }

  /** Nạp một file cụ thể. */
  uploadOne(id: number): void {
    this.patch(id, { status: 'queued', progress: 0, message: '' });
    this.pump();
  }

  /** Nạp tất cả file đang chờ. */
  uploadAll(): void {
    this.items.update((cur) =>
      cur.map((i) =>
        i.status === 'pending' ? { ...i, status: 'queued' as FileStatus, message: '' } : i,
      ),
    );
    this.pump();
  }

  // ===== Hàng đợi: tối đa maxConcurrent chạy song song =====
  private pump(): void {
    while (this.activeCount < this.maxConcurrent()) {
      const next = this.items().find((i) => i.status === 'queued');
      if (!next) break;
      this.start(next.id);
    }
  }

  private start(id: number): void {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;
    this.activeCount++;
    this.patch(id, { status: 'uploading', progress: 0, message: '' });

    const sub = this.uploadFn()(item.file).subscribe({
      next: (event: HttpEvent<unknown>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round((event.loaded / event.total) * 100);
          this.patch(id, { progress: pct });
        } else if (event.type === HttpEventType.Response) {
          // Hiện thông báo của server dưới mỗi file (vd cách đọc: lớp chữ PDF / OCR chuẩn / OCR nâng cao)
          const body = (event as HttpResponse<unknown>).body as { message?: string } | null;
          this.patch(id, { status: 'success', progress: 100, message: body?.message ?? 'Thành công' });
        }
      },
      error: (err) => {
        this.activeCount--;
        this.patch(id, {
          status: 'error',
          message: this.errorText(err),
        });
        this.pump();
      },
      complete: () => {
        this.activeCount--;
        const cur = this.items().find((i) => i.id === id);
        if (cur && cur.status !== 'error') {
          this.patch(id, { status: 'success', progress: 100 });
          this.uploaded.emit();
        }
        this.pump();
      },
    });
    this.patch(id, { sub });
  }

  retry(id: number): void {
    this.patch(id, { status: 'queued', progress: 0, message: '' });
    this.pump();
  }

  remove(id: number): void {
    const item = this.items().find((i) => i.id === id);
    item?.sub?.unsubscribe();
    if (item?.status === 'uploading') this.activeCount--;
    this.items.update((cur) => cur.filter((i) => i.id !== id));
    this.pump();
  }

  clearFinished(): void {
    this.items.update((cur) =>
      cur.filter((i) => i.status !== 'success' && i.status !== 'error'),
    );
  }

  /** Xóa HẾT file khỏi khay chọn (hủy luôn file đang tải lên dở). */
  clearAll(): void {
    for (const item of this.items()) {
      item.sub?.unsubscribe();
    }
    this.activeCount = 0;
    this.items.set([]);
  }

  private patch(id: number, changes: Partial<QueueItem>): void {
    this.items.update((cur) => cur.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }

  private errorText(err: unknown): string {
    const e = err as { error?: { message?: string; detail?: string }; message?: string };
    return e?.error?.message ?? e?.error?.detail ?? e?.message ?? 'Tải lên thất bại';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  iconFor(status: FileStatus): string {
    switch (status) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'uploading':
        return 'sync';
      case 'queued':
        return 'hourglass_top';
      default:
        return 'schedule';
    }
  }

  labelFor(status: FileStatus): string {
    switch (status) {
      case 'success':
        return 'Thành công';
      case 'error':
        return 'Lỗi';
      case 'uploading':
        return 'Đang tải lên';
      case 'queued':
        return 'Trong hàng đợi';
      default:
        return 'Chờ nạp';
    }
  }
}
