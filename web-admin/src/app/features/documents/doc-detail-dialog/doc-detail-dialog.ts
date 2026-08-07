import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentsApi } from '../../../core/api/documents.api';
import { DocumentDetailDto, DocumentDto } from '../../../core/api/models';
import { NotificationService } from '../../../core/notification.service';

export interface DocDetailDialogData {
  doc: DocumentDto;
}

/** Dialog xem chi tiết văn bản tri thức: metadata + toàn văn nội dung AI đang dùng. */
@Component({
  selector: 'app-doc-detail-dialog',
  imports: [
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './doc-detail-dialog.html',
  styleUrl: './doc-detail-dialog.scss',
})
export class DocDetailDialog {
  private readonly api = inject(DocumentsApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<DocDetailDialogData>(MAT_DIALOG_DATA);

  readonly loading = signal(true);
  readonly detail = signal<DocumentDetailDto | null>(null);

  constructor() {
    this.api.detail(this.data.doc.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được nội dung văn bản');
        this.loading.set(false);
      },
    });
  }

  openFile(): void {
    const name = encodeURIComponent(this.data.doc.sourceFileName ?? '');
    window.open(`/viewer/doc/${this.data.doc.id}?name=${name}`, '_blank');
  }
}
