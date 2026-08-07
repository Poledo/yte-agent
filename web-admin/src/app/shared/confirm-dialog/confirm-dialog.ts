import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

/** Hộp thoại xác nhận dùng chung (mở bằng MatDialog). */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm" [class.danger]="data.danger">
      <div class="icon-box">
        <mat-icon>{{ data.icon ?? (data.danger ? 'warning' : 'help_outline') }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton (click)="close(false)">{{ data.cancelText ?? 'Hủy' }}</button>
        <button
          [matButton]="'filled'"
          [color]="data.danger ? 'warn' : 'primary'"
          (click)="close(true)"
        >
          {{ data.confirmText ?? 'Xác nhận' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm {
        text-align: center;
        padding: 8px 8px 0;
        min-width: 320px;
      }
      .icon-box {
        display: grid;
        place-items: center;
        width: 56px;
        height: 56px;
        margin: 4px auto 4px;
        border-radius: 50%;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .danger .icon-box {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
      .icon-box mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }
      h2 {
        margin: 0 0 4px;
      }
      mat-dialog-content p {
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }
      mat-dialog-actions {
        padding-bottom: 8px;
      }
    `,
  ],
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfirmDialog>);

  close(result: boolean): void {
    this.ref.close(result);
  }
}
