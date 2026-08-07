import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LegalApi, LegalDownloadDto } from '../../../core/api/legal.api';
import { NotificationService } from '../../../core/notification.service';

/**
 * Dialog "Nạp từ văn bản đã tải" (mở từ màn Kho tri thức): liệt kê các văn bản
 * đã tải từ vbpl.vn nhưng CHƯA nạp, tick chọn rồi nạp — trạng thái bên màn
 * "Tải văn bản" tự cập nhật vì cùng đọc từ DB.
 */
@Component({
  selector: 'app-ingest-from-legal-dialog',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title><mat-icon>cloud_download</mat-icon> Nạp từ văn bản đã tải</h2>
    <mat-dialog-content>
      @if (loading()) {
        <div class="state"><mat-spinner diameter="26"></mat-spinner> Đang tải danh sách...</div>
      } @else if (pending().length === 0) {
        <div class="state">
          Không còn văn bản nào chưa nạp. Sang màn "Tải văn bản" để tải thêm từ vbpl.vn.
        </div>
      } @else {
        <div class="head-row">
          <mat-checkbox
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleAll($event.checked)"
          >Chọn tất cả ({{ pending().length }})</mat-checkbox>
        </div>
        @for (d of pending(); track d.id) {
          <div class="row">
            <mat-checkbox
              [checked]="selected().has(d.id)"
              [disabled]="ingesting()"
              (change)="toggleOne(d.id, $event.checked)"
            ></mat-checkbox>
            <div class="row-body">
              <div class="row-title">{{ d.title }}</div>
              <div class="row-meta">
                @if (d.docNumber) { <span class="tag">{{ d.docNumber }}</span> }
                @if (d.issuedDate) { <span>BH: {{ d.issuedDate | date: 'dd/MM/yyyy' }}</span> }
                <span>Tải: {{ d.downloadedAt | date: 'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close [disabled]="ingesting()">Đóng</button>
      <button [matButton]="'filled'" color="primary"
        [disabled]="selected().size === 0 || ingesting()"
        (click)="ingest()">
        <mat-icon>{{ ingesting() ? 'hourglass_top' : 'library_add' }}</mat-icon>
        {{ ingesting() ? 'Đang nạp...' : 'Nạp (' + selected().size + ')' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2 { display: flex; align-items: center; gap: 8px; }
    .state { display: flex; align-items: center; gap: 10px; padding: 18px 4px; color: var(--mat-sys-on-surface-variant); }
    .head-row { padding: 4px 0 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); margin-bottom: 6px; }
    .row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .row:last-child { border-bottom: none; }
    .row-body { min-width: 0; }
    .row-title { font-weight: 500; font-size: 13.5px; line-height: 1.4; }
    .row-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; font-size: 12px; color: var(--mat-sys-on-surface-variant); }
    .tag { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); border-radius: 8px; padding: 1px 8px; font-weight: 600; }
  `,
})
export class IngestFromLegalDialog {
  private readonly api = inject(LegalApi);
  private readonly notify = inject(NotificationService);
  private readonly dialogRef = inject(MatDialogRef<IngestFromLegalDialog>);

  readonly loading = signal(true);
  readonly downloads = signal<LegalDownloadDto[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly ingesting = signal(false);

  /** Chỉ hiện văn bản CHƯA nạp — văn bản đã nạp không cần nạp lại từ đây. */
  readonly pending = computed(() => this.downloads().filter((d) => !d.ingested));
  readonly allSelected = computed(
    () => this.pending().length > 0 && this.pending().every((d) => this.selected().has(d.id)),
  );
  readonly someSelected = computed(
    () => !this.allSelected() && this.pending().some((d) => this.selected().has(d.id)),
  );

  constructor() {
    this.api.downloads().subscribe({
      next: (list) => {
        this.downloads.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách văn bản đã tải.');
        this.loading.set(false);
      },
    });
  }

  toggleOne(id: number, checked: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.pending().map((d) => d.id)) : new Set());
  }

  ingest(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.ingesting.set(true);
    this.api.ingestSelected(ids).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        for (const err of (res.results ?? []).filter((r) => r.status === 'error')) {
          this.notify.error(`"${err.title}": ${err.message}`);
        }
        this.ingesting.set(false);
        this.dialogRef.close(true); // true = có nạp — trang cha refresh danh sách
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không nạp được vào kho tri thức.');
        this.ingesting.set(false);
      },
    });
  }
}
