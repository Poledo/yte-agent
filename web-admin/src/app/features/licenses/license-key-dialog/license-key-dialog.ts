import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IssuedLicenseDto } from '../../../core/api/models';

/**
 * Hộp thoại hiện khóa bản quyền vừa cấp — lần DUY NHẤT đọc được khóa gốc.
 *
 * Máy chủ chỉ lưu bản băm (như mật khẩu), nên đóng hộp này mà chưa chép là phải
 * cấp lại khóa. Vì vậy nút đóng chỉ mở khi người dùng đã bấm chép, và hộp không
 * đóng được bằng phím Esc / bấm ra ngoài (disableClose ở nơi mở).
 */
@Component({
  selector: 'app-license-key-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './license-key-dialog.html',
  styleUrl: './license-key-dialog.scss',
})
export class LicenseKeyDialog {
  readonly data = inject<IssuedLicenseDto>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<LicenseKeyDialog>);

  readonly copied = signal(false);
  /** Trình duyệt chặn clipboard (không HTTPS...) → hướng dẫn chép tay. */
  readonly copyFailed = signal(false);

  copy(): void {
    navigator.clipboard
      .writeText(this.data.key)
      .then(() => {
        this.copied.set(true);
        this.copyFailed.set(false);
      })
      .catch(() => {
        // Không chép được thì vẫn phải cho đóng, người dùng bôi đen chép tay.
        this.copyFailed.set(true);
        this.copied.set(true);
      });
  }

  close(): void {
    this.ref.close();
  }
}
