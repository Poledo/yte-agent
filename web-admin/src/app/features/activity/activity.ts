import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { StatsApi, UsageEventRow } from '../../core/api/stats.api';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { ActivityDetailDialog } from './activity-detail-dialog/activity-detail-dialog';

/**
 * Màn "Lịch sử hoạt động": danh sách các lượt hỏi đáp AI và kiểm tra XML 130
 * đã ghi nhận, lọc theo loại + khoảng thời gian, bấm xem lại nội dung phản hồi.
 */
@Component({
  selector: 'app-activity',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDatepickerModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
  ],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity {
  private readonly api = inject(StatsApi);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly rows = signal<UsageEventRow[]>([]);

  /** Lọc loại: '' = tất cả. */
  readonly typeFilter = signal('');
  readonly typeOptions = [
    { key: '', label: 'Tất cả', icon: 'all_inclusive' },
    { key: 'Ask', label: 'Hỏi đáp AI', icon: 'forum' },
    { key: 'Xml130Check', label: 'Kiểm tra XML 130', icon: 'rule' },
  ];

  // ===== Chọn khoảng thời gian (cùng kiểu nút duy nhất như Dashboard) =====
  readonly presets: { key: string; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'week', label: 'Tuần này' },
    { key: '7d', label: '7 ngày' },
    { key: 'month', label: 'Tháng này' },
    { key: 'lastMonth', label: 'Tháng trước' },
    { key: '30d', label: '30 ngày' },
  ];
  readonly preset = signal('7d');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly rangeLabel = computed(() => {
    const found = this.presets.find((p) => p.key === this.preset());
    if (found) return found.label;
    const vn = (s: string) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '');
    const [f, t] = [this.customFrom(), this.customTo()];
    return f && t ? `${vn(f)} – ${vn(t)}` : 'Chọn khoảng';
  });

  readonly columns: TableColumn[] = [
    { key: 'createdAt', header: 'Thời điểm', width: '150px', sortable: true },
    { key: 'eventType', header: 'Loại', width: '150px' },
    { key: 'preview', header: 'Nội dung' },
    { key: 'facilityCode', header: 'Đơn vị', width: '110px' },
    { key: 'result', header: 'Kết quả', width: '170px', align: 'center' },
    { key: 'durationMs', header: 'Xử lý', width: '90px', align: 'end' },
    { key: 'actions', header: '', width: '70px', align: 'end' },
  ];

  constructor() {
    this.selectPreset('7d');
  }

  selectPreset(key: string): void {
    this.preset.set(key);
    const today = new Date();
    const d = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    let from = d(today);
    let to = d(today);
    switch (key) {
      case 'yesterday':
        from.setDate(from.getDate() - 1);
        to = new Date(from);
        break;
      case 'week': {
        const dow = (today.getDay() + 6) % 7;
        from.setDate(from.getDate() - dow);
        break;
      }
      case '7d':
        from.setDate(from.getDate() - 6);
        break;
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case '30d':
        from.setDate(from.getDate() - 29);
        break;
    }
    this.customFrom.set(this.fmt(from));
    this.customTo.set(this.fmt(to));
    this.load();
  }

  onRangeStart(d: Date | null): void {
    this.customFrom.set(d ? this.fmt(d) : '');
  }

  onRangeEnd(d: Date | null): void {
    this.customTo.set(d ? this.fmt(d) : '');
    if (this.customFrom() && this.customTo()) {
      this.preset.set('custom');
      this.load();
    }
  }

  setType(key: string): void {
    this.typeFilter.set(key);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.events(this.customFrom(), this.customTo(), this.typeFilter() || undefined).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được lịch sử hoạt động');
        this.loading.set(false);
      },
    });
  }

  openDetail(row: UsageEventRow): void {
    this.dialog.open(ActivityDetailDialog, {
      data: { id: row.id },
      width: '860px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  private fmt(x: Date): string {
    const m = `${x.getMonth() + 1}`.padStart(2, '0');
    const day = `${x.getDate()}`.padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
  }
}
