import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IcdApi, IcdSyncSettingsDto, IcdSyncStatusDto } from '../../core/api/icd.api';
import {
  Xml130Api,
  Xml130FieldSpecImportResult,
  Xml130FieldSpecsSummary,
} from '../../core/api/xml130.api';
import { RateLimitApi } from '../../core/api/ratelimit.api';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';

/**
 * Trang CẤU HÌNH HỆ THỐNG — nơi gom các cấu hình chung (không thuộc riêng
 * nghiệp vụ nào). Hiện có: lịch tự động đồng bộ danh mục ICD-10.
 * Cấu hình mới sau này cứ thêm card vào trang này.
 */
@Component({
  selector: 'app-system-config',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeader,
  ],
  templateUrl: './system-config.html',
  styleUrl: './system-config.scss',
})
export class SystemConfig {
  private readonly fb = inject(FormBuilder);
  private readonly icdApi = inject(IcdApi);
  private readonly xml130Api = inject(Xml130Api);
  private readonly rateLimitApi = inject(RateLimitApi);
  private readonly notify = inject(NotificationService);

  readonly icdSettings = signal<IcdSyncSettingsDto | null>(null);
  readonly icdStatus = signal<IcdSyncStatusDto | null>(null);
  readonly icdSaving = signal(false);
  readonly icdSyncing = signal(false);

  // Đặc tả cấu trúc XML130 (điều kiện kiểm tra hồ sơ)
  readonly specSummary = signal<Xml130FieldSpecsSummary | null>(null);
  readonly specImporting = signal(false);
  readonly specResult = signal<Xml130FieldSpecImportResult | null>(null);

  // Ngưỡng chống spam request (rate limit)
  readonly rateSaving = signal(false);

  readonly icdForm = this.fb.nonNullable.group({
    enabled: [true],
    time: ['00:00', [Validators.required, Validators.pattern(/^([01]?\d|2[0-3]):[0-5]\d$/)]],
  });

  readonly rateForm = this.fb.nonNullable.group({
    globalPerMinute: [100, [Validators.required, Validators.min(1)]],
    loginPerMinute: [5, [Validators.required, Validators.min(1)]],
    forgotPasswordPerMinute: [3, [Validators.required, Validators.min(1)]],
    askPerMinute: [10, [Validators.required, Validators.min(1)]],
    importPerMinute: [5, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.loadIcd();
    this.loadSpecSummary();
    this.loadRateLimit();
  }

  loadRateLimit(): void {
    this.rateLimitApi.get().subscribe({
      next: (s) => this.rateForm.patchValue(s),
      error: () => this.notify.error('Không tải được ngưỡng chống spam'),
    });
  }

  saveRateLimit(): void {
    if (this.rateForm.invalid) {
      this.rateForm.markAllAsTouched();
      return;
    }
    this.rateSaving.set(true);
    this.rateLimitApi.update(this.rateForm.getRawValue()).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.rateSaving.set(false);
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không lưu được ngưỡng chống spam');
        this.rateSaving.set(false);
      },
    });
  }

  loadIcd(): void {
    this.icdApi.syncSettings().subscribe({
      next: (s) => {
        this.icdSettings.set(s);
        this.icdForm.patchValue({ enabled: s.enabled, time: s.time });
      },
      error: () => this.notify.error('Không tải được cấu hình đồng bộ ICD'),
    });
    // Trạng thái phiên bản cần gọi ra nguồn công bố — lỗi mạng thì chỉ ẩn dòng trạng thái
    this.icdApi.syncStatus().subscribe({
      next: (s) => this.icdStatus.set(s),
      error: () => this.icdStatus.set(null),
    });
  }

  saveIcd(): void {
    if (this.icdForm.invalid) {
      this.icdForm.markAllAsTouched();
      return;
    }
    const v = this.icdForm.getRawValue();
    this.icdSaving.set(true);
    this.icdApi.updateSyncSettings(v.enabled, v.time).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.icdSaving.set(false);
        this.loadIcd();
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không lưu được cấu hình đồng bộ ICD');
        this.icdSaving.set(false);
      },
    });
  }

  syncIcdNow(): void {
    this.icdSyncing.set(true);
    this.icdApi.syncNow().subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.icdSyncing.set(false);
        this.loadIcd();
      },
      error: (e) => {
        this.notify.error(e?.error?.error ?? e?.error?.message ?? 'Không đồng bộ được danh mục ICD');
        this.icdSyncing.set(false);
      },
    });
  }

  loadSpecSummary(): void {
    this.xml130Api.fieldSpecs().subscribe({
      next: (s) => this.specSummary.set(s),
      error: () => this.specSummary.set(null),
    });
  }

  /** Người dùng chọn file đặc tả Excel → nạp lại, điều kiện kiểm tra đổi theo ngay. */
  importSpec(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.specImporting.set(true);
    this.specResult.set(null);
    this.xml130Api.importFieldSpecs(file).subscribe({
      next: (res) => {
        this.specResult.set(res);
        this.notify.success(res.message);
        this.specImporting.set(false);
        this.loadSpecSummary();
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không nạp được file đặc tả XML130');
        this.specImporting.set(false);
      },
    });
    // Cho phép chọn lại cùng một file (reset input)
    input.value = '';
  }
}
