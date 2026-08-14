import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FacilityApi } from '../../../core/api/facility.api';
import {
  FACILITY_TUYEN_LABELS,
  FACILITY_TUYEN_ORDER,
  FacilityDto,
  FacilityTuyen,
} from '../../../core/api/models';

export interface FacilityDialogData {
  /** null = thêm mới. */
  facility: FacilityDto | null;
  /** Toàn bộ đơn vị (dạng phẳng) để chọn đơn vị cấp trên. */
  all: FacilityDto[];
  /** Đơn vị cấp trên đặt sẵn khi bấm "Thêm đơn vị cấp dưới". */
  defaultParentId?: number | null;
}

/** Dialog đóng lại với kết quả này khi lưu thành công (đóng bằng Hủy thì undefined). */
export interface FacilityDialogResult {
  message: string;
  /** Nhắc tuyến của đơn vị không khớp tuyến cấp trên — đã lưu rồi, không phải lỗi. */
  warning: string | null;
}

/** Dialog thêm/sửa một đơn vị trong cây tổ chức. */
@Component({
  selector: 'app-facility-dialog',
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
  templateUrl: './facility-dialog.html',
  styleUrl: './facility-dialog.scss',
})
export class FacilityDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(FacilityApi);
  readonly data = inject<FacilityDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<FacilityDialog>);

  readonly isEdit = !!this.data.facility;
  readonly saving = signal(false);
  readonly error = signal('');

  readonly tuyenOptions = FACILITY_TUYEN_ORDER;
  readonly tuyenLabels = FACILITY_TUYEN_LABELS;

  readonly form = this.fb.nonNullable.group({
    code: [this.data.facility?.code ?? '', [Validators.required, Validators.maxLength(20)]],
    name: [this.data.facility?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    parentId: [this.data.facility?.parentId ?? this.data.defaultParentId ?? (null as number | null)],
    tuyen: [this.data.facility?.tuyen ?? ('khongXacDinh' as FacilityTuyen)],
    inheritCatalogFromParent: [this.data.facility?.inheritCatalogFromParent ?? true],
    note: [this.data.facility?.note ?? ''],
    isActive: [this.data.facility?.isActive ?? true],
  });

  /**
   * Danh sách chọn làm đơn vị cấp trên: bỏ chính nó và toàn bộ nhánh dưới nó —
   * chọn phải sẽ tạo vòng lặp cha ↔ con (API cũng chặn, đây là chặn sớm cho êm).
   */
  readonly parentOptions = computed<FacilityDto[]>(() => {
    const self = this.data.facility;
    if (!self) return this.data.all;

    const blocked = new Set<number>([self.id]);
    // Lặp tới khi không thêm được ai nữa: mỗi vòng gom thêm một cấp con
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of this.data.all) {
        if (f.parentId != null && blocked.has(f.parentId) && !blocked.has(f.id)) {
          blocked.add(f.id);
          grew = true;
        }
      }
    }
    return this.data.all.filter((f) => !blocked.has(f.id));
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
      code: v.code.trim(),
      name: v.name.trim(),
      parentId: v.parentId,
      tuyen: v.tuyen,
      inheritCatalogFromParent: v.inheritCatalogFromParent,
      note: v.note.trim() || null,
      isActive: v.isActive,
    };

    const request = this.isEdit
      ? this.api.update(this.data.facility!.id, body)
      : this.api.create(body);

    request.subscribe({
      next: (res) => this.ref.close({ message: res.message, warning: res.warning ?? null }),
      error: (e) => {
        this.error.set(e?.error?.message ?? 'Không lưu được đơn vị.');
        this.saving.set(false);
      },
    });
  }
}
