import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { of, switchMap } from 'rxjs';
import { UsersApi } from '../../../core/api/users.api';
import { FacilityApi } from '../../../core/api/facility.api';
import { FacilityDto, RoleDto, UserDto } from '../../../core/api/models';
import { AuthService } from '../../../core/auth.service';
import { NotificationService } from '../../../core/notification.service';

export interface UserDialogData {
  user: UserDto | null;
  roles: RoleDto[];
}

/** Dialog tạo/sửa người dùng kèm gán vai trò. */
@Component({
  selector: 'app-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './user-dialog.html',
  styleUrl: './user-dialog.scss',
})
export class UserDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersApi);
  private readonly notify = inject(NotificationService);
  private readonly facilityApi = inject(FacilityApi);
  private readonly auth = inject(AuthService);
  readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserDialog>);

  readonly isEdit = !!this.data.user;
  readonly saving = signal(false);
  readonly hide = signal(true);

  /**
   * Chỉ quản trị hệ thống mới chọn được cơ sở. Quản trị cơ sở gửi lên gì máy chủ cũng
   * ép về cơ sở của chính họ, nên hiện ô này cho họ chỉ tạo ảo giác là chọn được.
   */
  readonly canPickFacility = this.auth.isSystemScope();
  readonly facilities = signal<FacilityDto[]>([]);

  readonly form = this.fb.nonNullable.group({
    email: [
      { value: this.data.user?.email ?? '', disabled: this.isEdit },
      [Validators.required, Validators.email],
    ],
    fullName: [this.data.user?.fullName ?? '', [Validators.required]],
    password: ['', this.isEdit ? [] : [Validators.required, Validators.minLength(6)]],
    isActive: [this.data.user?.isActive ?? true],
    roles: [this.data.user?.roles ?? ([] as string[])],
    // null = tài khoản cấp hệ thống, thấy toàn bộ dữ liệu.
    facilityId: [this.data.user?.facilityId ?? (null as number | null)],
  });

  constructor() {
    if (this.canPickFacility && !this.isEdit) {
      this.facilityApi.list().subscribe({
        next: (list) => this.facilities.set(list),
        error: () => this.facilities.set([]),
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();

    if (!this.isEdit) {
      this.api
        .create({
          email: v.email,
          password: v.password,
          fullName: v.fullName,
          roles: v.roles,
          facilityId: this.canPickFacility ? v.facilityId : null,
        })
        .subscribe({
          next: () => this.done('Đã tạo người dùng'),
          error: (e) => this.fail(e),
        });
      return;
    }

    // Sửa: cập nhật thông tin XONG rồi mới gán lại vai trò. Bắt buộc chạy tuần
    // tự — ASP.NET Identity dùng ConcurrencyStamp trên bản ghi người dùng, gọi
    // song song thì lệnh về sau đụng stamp cũ và bị hủy (vai trò không lưu).
    const id = this.data.user!.id;
    this.api
      .update(id, { fullName: v.fullName, isActive: v.isActive })
      .pipe(
        switchMap(() =>
          this.rolesChanged(v.roles) ? this.api.assignRoles(id, { roles: v.roles }) : of(null),
        ),
      )
      .subscribe({
        next: () => this.done('Đã cập nhật người dùng'),
        error: (e) => this.fail(e),
      });
  }

  private rolesChanged(next: string[]): boolean {
    const prev = [...(this.data.user?.roles ?? [])].sort();
    const cur = [...next].sort();
    return JSON.stringify(prev) !== JSON.stringify(cur);
  }

  private done(msg: string): void {
    this.saving.set(false);
    this.notify.success(msg);
    this.ref.close(true);
  }

  private fail(err: { error?: { message?: string } }): void {
    this.saving.set(false);
    this.notify.error(err?.error?.message ?? 'Thao tác thất bại');
  }

  cancel(): void {
    this.ref.close(false);
  }
}
