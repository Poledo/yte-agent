import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RolesApi } from '../../../core/api/roles.api';
import { RoleDto } from '../../../core/api/models';
import { NotificationService } from '../../../core/notification.service';

/** Dialog tạo/sửa vai trò (tên + mô tả). */
@Component({
  selector: 'app-role-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './role-dialog.html',
  styleUrl: './role-dialog.scss',
})
export class RoleDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RolesApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<{ role: RoleDto | null }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RoleDialog>);

  readonly isEdit = !!this.data.role;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [
      { value: this.data.role?.name ?? '', disabled: this.isEdit },
      [Validators.required],
    ],
    description: [this.data.role?.description ?? ''],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const req = this.isEdit
      ? this.api.update(this.data.role!.id, { description: v.description })
      : this.api.create({ name: v.name, description: v.description });
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(this.isEdit ? 'Đã cập nhật vai trò' : 'Đã tạo vai trò');
        this.ref.close(true);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.error?.message ?? 'Thao tác thất bại');
      },
    });
  }

  cancel(): void {
    this.ref.close(false);
  }
}
