import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocumentsApi } from '../../../core/api/documents.api';
import { NotificationService } from '../../../core/notification.service';

export interface ValidityDialogData {
  id: number;
  title: string;
  effectiveDate: string | null;
  expiryDate: string | null;
}

/**
 * Dialog nhập tay ngày hiệu lực / hết hiệu lực cho một văn bản trong kho tri thức.
 * (Hệ thống không tự đoán ngày từ nội dung nữa — dễ nhầm ngày ký/ngày trích dẫn.)
 */
@Component({
  selector: 'app-validity-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './validity-dialog.html',
  styleUrl: './validity-dialog.scss',
})
export class ValidityDialog {
  private readonly api = inject(DocumentsApi);
  private readonly notify = inject(NotificationService);
  private readonly ref = inject(MatDialogRef<ValidityDialog>);
  readonly data = inject<ValidityDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly effective = signal(this.toInputDate(this.data.effectiveDate));
  readonly expiry = signal(this.toInputDate(this.data.expiryDate));

  save(): void {
    const from = this.effective() || null;
    const to = this.expiry() || null;
    if (from && to && to < from) {
      this.notify.error('Ngày hết hiệu lực phải sau ngày có hiệu lực');
      return;
    }
    this.saving.set(true);
    this.api.updateValidity(this.data.id, { effectiveDate: from, expiryDate: to }).subscribe({
      next: (res) => {
        this.notify.success(res?.message ?? 'Đã cập nhật hiệu lực');
        this.ref.close(true);
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không cập nhật được');
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    this.ref.close(false);
  }

  /** ISO datetime từ API → "yyyy-MM-dd" cho input type=date. */
  private toInputDate(iso: string | null): string {
    return iso ? iso.slice(0, 10) : '';
  }
}
