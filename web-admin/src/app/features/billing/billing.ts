import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { BillingApi } from '../../core/api/billing.api';
import { BillingLineDto, BillingPeriodDto, InvoiceDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { HasPermissionDirective } from '../../shared/permission.directive';
import {
  BillingDetailDialog,
  BillingDetailDialogData,
} from './billing-detail-dialog/billing-detail-dialog';

/**
 * Màn hình tính tiền theo cơ sở KCB.
 *
 * Hai con số KHÁC NHAU trên cùng màn hình:
 * - Bảng kê: tính lại từ sổ mỗi lần mở, nên luôn theo số hiện tại. Kỳ đang chạy còn
 *   tăng tiếp.
 * - Hóa đơn: đóng băng con số tại lúc chốt sổ. Sổ phát sinh thêm sau đó KHÔNG làm
 *   hóa đơn đổi — chứng từ đã phát hành không được tự chạy.
 */
@Component({
  selector: 'app-billing',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
    HasPermissionDirective,
  ],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class Billing {
  private readonly api = inject(BillingApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly usage = signal<BillingPeriodDto | null>(null);
  readonly invoices = signal<InvoiceDto[]>([]);
  readonly activeTab = signal(0);

  /** Kỳ đang chạy theo GIỜ VIỆT NAM — trùng cách máy chủ đánh kỳ cho sổ. */
  readonly currentPeriod = Billing.periodOf(new Date());

  readonly periodCtrl = new FormControl<number>(this.currentPeriod, { nonNullable: true });

  /** 24 kỳ gần nhất, mới nhất trước — đủ cho đối soát mà không phải gõ tay yyyyMM. */
  readonly periodOptions = computed<number[]>(() => {
    const out: number[] = [];
    let year = Math.floor(this.currentPeriod / 100);
    let month = this.currentPeriod % 100;
    for (let i = 0; i < 24; i++) {
      out.push(year * 100 + month);
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
    }
    return out;
  });

  readonly selectedPeriod = signal(this.currentPeriod);
  readonly isCurrentPeriod = computed(() => this.selectedPeriod() === this.currentPeriod);

  readonly lines = computed(() => this.usage()?.lines ?? []);

  readonly columns: TableColumn[] = [
    {
      key: 'facility',
      header: 'Cơ sở KCB',
      sortable: true,
      value: (r: BillingLineDto) => r.facilityName,
    },
    { key: 'plan', header: 'Gói cước', sortable: true, width: '140px' },
    { key: 'units', header: 'Hồ sơ đã kiểm', align: 'end', width: '150px', sortable: true },
    { key: 'overage', header: 'Vượt hạn mức', align: 'end', width: '130px', sortable: true },
    { key: 'askCount', header: 'Hỏi đáp', align: 'end', width: '100px', sortable: true },
    { key: 'totalAmount', header: 'Thành tiền', align: 'end', width: '150px', sortable: true },
    { key: 'closed', header: 'Chốt sổ', align: 'center', width: '110px' },
    { key: 'actions', header: '', align: 'end', width: '70px' },
  ];

  readonly invoiceColumns: TableColumn[] = [
    {
      key: 'facility',
      header: 'Cơ sở KCB',
      sortable: true,
      value: (r: InvoiceDto) => r.facilityName,
    },
    { key: 'plan', header: 'Gói cước', sortable: true, width: '140px' },
    { key: 'units', header: 'Hồ sơ / vượt', align: 'end', width: '150px' },
    { key: 'price', header: 'Đơn giá', align: 'end', width: '170px' },
    { key: 'totalAmount', header: 'Thành tiền', align: 'end', width: '150px', sortable: true },
    { key: 'closedAt', header: 'Chốt lúc', width: '170px', sortable: true },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    const period = this.periodCtrl.value;
    this.selectedPeriod.set(period);
    this.loading.set(true);
    forkJoin({
      usage: this.api.usage(period),
      invoices: this.api.invoices(period),
    }).subscribe({
      next: ({ usage, invoices }) => {
        this.usage.set(usage);
        this.invoices.set(invoices);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được bảng kê tính tiền');
        this.loading.set(false);
      },
    });
  }

  openDetail(line: BillingLineDto): void {
    const data: BillingDetailDialogData = { line, period: this.selectedPeriod() };
    this.dialog.open(BillingDetailDialog, {
      data,
      width: '760px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  /**
   * Chốt sổ kỳ đang chọn. Chốt kỳ ĐANG CHẠY phải xác nhận thêm một lần vì hồ sơ
   * còn phát sinh tiếp sau khi hóa đơn đã phát hành.
   */
  close(): void {
    const period = this.selectedPeriod();
    const running = this.isCurrentPeriod();
    const total = this.usage()?.totalAmount ?? 0;

    this.confirm
      .open({
        title: `Chốt sổ kỳ ${this.periodLabel(period)}`,
        message: running
          ? `Kỳ ${this.periodLabel(period)} ĐANG CHẠY — hồ sơ vẫn phát sinh tiếp sau khi chốt, ` +
            'phần phát sinh thêm sẽ KHÔNG vào hóa đơn này. Chỉ chốt sớm khi thực sự cần. ' +
            `Tạm tính hiện tại: ${total.toLocaleString('vi-VN')} đ.`
          : `Sinh hóa đơn cho ${this.lines().length} hợp đồng có phát sinh trong kỳ. ` +
            'Hóa đơn đã chốt KHÔNG sửa được và không tự đổi theo sổ. ' +
            `Tổng tạm tính: ${total.toLocaleString('vi-VN')} đ.`,
        danger: running,
        confirmText: 'Chốt sổ',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.close(period, running).subscribe({
          next: (res) => {
            this.notify.success(res.message);
            // Chốt xong nhảy sang tab hóa đơn để người dùng thấy ngay chứng từ vừa sinh
            this.activeTab.set(1);
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không chốt sổ được'),
        });
      });
  }

  /** 202608 → "08/2026". */
  periodLabel(period: number): string {
    return `${String(period % 100).padStart(2, '0')}/${Math.floor(period / 100)}`;
  }

  /**
   * Kỳ (yyyyMM) của một mốc thời gian, theo giờ Việt Nam.
   * Trình duyệt của người dùng có thể để múi giờ khác — dùng giờ máy thì đầu tháng
   * và cuối tháng sẽ chọn nhầm kỳ so với máy chủ.
   */
  private static periodOf(now: Date): number {
    const vn = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60_000);
    return vn.getFullYear() * 100 + vn.getMonth() + 1;
  }
}
