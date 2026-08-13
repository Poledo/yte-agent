import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LicenseApi } from '../../../core/api/license.api';
import { FacilityDto, IssuedLicenseDto, LicenseDto } from '../../../core/api/models';

export interface LicenseDialogData {
  /** null = cấp hợp đồng mới. */
  license: LicenseDto | null;
  /** Danh sách đơn vị (phẳng) để chọn bên đứng tên hợp đồng. */
  facilities: FacilityDto[];
  /** Id đơn vị đã có hợp đồng còn hiệu lực — loại khỏi ô chọn khi cấp mới. */
  takenFacilityIds: number[];
}

/**
 * Dialog cấp mới / sửa điều khoản hợp đồng.
 *
 * Khi SỬA, ô chọn đơn vị bị khóa: đổi đơn vị đứng tên giữa chừng là đổi bên trả
 * tiền, sản lượng đã ghi vào sổ dưới tên đơn vị cũ sẽ vô nghĩa. Muốn chuyển thì
 * thu hồi hợp đồng cũ rồi cấp hợp đồng mới cho đơn vị kia.
 */
@Component({
  selector: 'app-license-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './license-dialog.html',
  styleUrl: './license-dialog.scss',
})
export class LicenseDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LicenseApi);
  readonly data = inject<LicenseDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<LicenseDialog>);

  readonly isEdit = !!this.data.license;
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    facilityId: [this.data.license?.facilityId ?? (null as number | null), [Validators.required]],
    plan: [this.data.license?.plan ?? 'Cơ bản', [Validators.required, Validators.maxLength(64)]],
    monthlyQuota: [this.data.license?.monthlyQuota ?? 0, [Validators.required, Validators.min(0)]],
    basePrice: [this.data.license?.basePrice ?? 0, [Validators.required, Validators.min(0)]],
    overageUnitPrice: [
      this.data.license?.overageUnitPrice ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    coversSubtree: [this.data.license?.coversSubtree ?? false],
    validFrom: [this.data.license ? new Date(this.data.license.validFrom) : new Date()],
    validTo: [this.data.license?.validTo ? new Date(this.data.license.validTo) : (null as Date | null)],
    note: [this.data.license?.note ?? ''],
    isActive: [this.data.license?.isActive ?? true],
  });

  constructor() {
    // Khóa ô chọn đơn vị khi sửa. Khóa bằng control (không phải thuộc tính [disabled]
    // trên template) vì reactive form cảnh báo khi trộn hai cách.
    if (this.isEdit) {
      this.form.controls.facilityId.disable();
    }
  }

  /** Cấp mới chỉ chọn được đơn vị CHƯA có hợp đồng còn hiệu lực (API cũng chặn). */
  readonly facilityOptions = computed<FacilityDto[]>(() => {
    if (this.isEdit) return this.data.facilities;
    const taken = new Set(this.data.takenFacilityIds);
    return this.data.facilities.filter((f) => !taken.has(f.id));
  });

  cancel(): void {
    this.ref.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');

    const v = this.form.getRawValue();
    const body = {
      facilityId: v.facilityId!,
      plan: v.plan.trim(),
      monthlyQuota: Number(v.monthlyQuota),
      basePrice: Number(v.basePrice),
      overageUnitPrice: Number(v.overageUnitPrice),
      coversSubtree: v.coversSubtree,
      validFrom: v.validFrom ? v.validFrom.toISOString() : null,
      validTo: v.validTo ? v.validTo.toISOString() : null,
      note: v.note.trim() || null,
      isActive: v.isActive,
    };

    if (this.isEdit) {
      this.api.update(this.data.license!.id, body).subscribe({
        next: () => this.ref.close({ message: 'Đã lưu điều khoản hợp đồng.' }),
        error: (e) => this.fail(e, 'Không lưu được hợp đồng.'),
      });
      return;
    }

    this.api.create(body).subscribe({
      // Khóa gốc chỉ về đúng lần này — trả thẳng cho màn hình cha để mở hộp chép khóa.
      next: (issued: IssuedLicenseDto) => this.ref.close({ issued }),
      error: (e) => this.fail(e, 'Không cấp được hợp đồng.'),
    });
  }

  private fail(e: unknown, fallback: string): void {
    const message = (e as { error?: { message?: string } })?.error?.message;
    this.error.set(message ?? fallback);
    this.saving.set(false);
  }
}
