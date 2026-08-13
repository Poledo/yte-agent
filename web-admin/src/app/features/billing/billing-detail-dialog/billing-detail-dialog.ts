import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BillingApi } from '../../../core/api/billing.api';
import { BillingDetailDto, BillingLineDto } from '../../../core/api/models';

export interface BillingDetailDialogData {
  line: BillingLineDto;
  period: number;
}

/**
 * Chi tiết sản lượng một hợp đồng trong kỳ: theo ngày, theo đơn vị phát sinh,
 * theo nhân viên.
 *
 * Đây là màn hình dùng khi khách hàng thắc mắc con số trên hóa đơn - phải chỉ ra
 * được sản lượng đến từ đơn vị nào, ngày nào, ai kiểm.
 */
@Component({
  selector: 'app-billing-detail-dialog',
  imports: [
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './billing-detail-dialog.html',
  styleUrl: './billing-detail-dialog.scss',
})
export class BillingDetailDialog {
  private readonly api = inject(BillingApi);
  readonly data = inject<BillingDetailDialogData>(MAT_DIALOG_DATA);

  readonly loading = signal(true);
  readonly detail = signal<BillingDetailDto | null>(null);
  readonly error = signal('');

  /** Ngày cao nhất trong kỳ — dùng làm mốc 100% cho biểu đồ cột. */
  readonly peakDay = computed(() =>
    Math.max(1, ...(this.detail()?.byDay ?? []).map((d) => d.units)),
  );

  readonly periodLabel = computed(() => {
    const p = this.data.period;
    return `${String(p % 100).padStart(2, '0')}/${Math.floor(p / 100)}`;
  });

  constructor() {
    this.api.detail(this.data.line.licenseId, this.data.period).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không tra được chi tiết sản lượng của hợp đồng này.');
        this.loading.set(false);
      },
    });
  }

  /** Chiều cao cột theo ngày, tính theo % của ngày cao nhất. */
  barHeight(units: number): string {
    return `${Math.max(4, Math.round((units / this.peakDay()) * 100))}%`;
  }

  /** "2026-08-03" → "03/08" cho nhãn trục ngang. */
  dayLabel(day: string): string {
    const parts = day.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : day;
  }
}
