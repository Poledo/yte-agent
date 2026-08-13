import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { LicenseApi } from '../../core/api/license.api';
import { FacilityApi } from '../../core/api/facility.api';
import { FacilityDto, IssuedLicenseDto, LicenseDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { HasPermissionDirective } from '../../shared/permission.directive';
import { LicenseDialog, LicenseDialogData } from './license-dialog/license-dialog';
import { LicenseKeyDialog } from './license-key-dialog/license-key-dialog';

/**
 * Màn hình hợp đồng: dịch vụ bán theo TỪNG CƠ SỞ KCB, mỗi cơ sở một khóa bản quyền.
 *
 * Khóa là thứ duy nhất trả lời "ai đang gọi" và "ai chịu tiền" — mã cơ sở khai trong
 * file XML 130 do người dùng tự nhập nên không dùng để tính tiền được. Vì vậy màn
 * hình này quản lý vòng đời khóa (cấp, cấp lại, thu hồi), còn sản lượng và tiền xem
 * ở màn hình Tính tiền.
 */
@Component({
  selector: 'app-licenses',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
    HasPermissionDirective,
  ],
  templateUrl: './licenses.html',
  styleUrl: './licenses.scss',
})
export class Licenses {
  private readonly api = inject(LicenseApi);
  private readonly facilityApi = inject(FacilityApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly licenses = signal<LicenseDto[]>([]);
  readonly facilities = signal<FacilityDto[]>([]);
  /** Hiện cả hợp đồng đã thu hồi (để khôi phục / đối chiếu sản lượng cũ). */
  readonly showRevoked = signal(false);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.searchCtrl.valueChanges, { initialValue: '' });

  readonly filtered = computed(() => {
    const t = this.term().trim().toLowerCase();
    if (!t) return this.licenses();
    return this.licenses().filter(
      (l) =>
        l.facilityName.toLowerCase().includes(t) ||
        l.facilityCode.toLowerCase().includes(t) ||
        l.plan.toLowerCase().includes(t) ||
        l.keyPrefix.toLowerCase().includes(t),
    );
  });

  readonly columns: TableColumn[] = [
    { key: 'facility', header: 'Cơ sở KCB', sortable: true, value: (r: LicenseDto) => r.facilityName },
    { key: 'plan', header: 'Gói cước', sortable: true, width: '160px' },
    { key: 'quota', header: 'Sản lượng kỳ này', align: 'end', width: '170px' },
    { key: 'price', header: 'Giá', align: 'end', width: '170px' },
    { key: 'validity', header: 'Hiệu lực', width: '170px' },
    { key: 'status', header: 'Trạng thái', align: 'center', width: '150px' },
    { key: 'actions', header: '', align: 'end', width: '160px' },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      licenses: this.api.list(this.showRevoked()),
      facilities: this.facilityApi.list(),
    }).subscribe({
      next: ({ licenses, facilities }) => {
        this.licenses.set(licenses);
        this.facilities.set(facilities);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách hợp đồng');
        this.loading.set(false);
      },
    });
  }

  toggleRevoked(show: boolean): void {
    this.showRevoked.set(show);
    this.load();
  }

  add(): void {
    this.openDialog({
      license: null,
      facilities: this.facilities(),
      // Đơn vị đã có hợp đồng CÒN HIỆU LỰC thì không cấp thêm được khóa thứ hai:
      // hai khóa cùng lúc thì không biết sản lượng thuộc hợp đồng nào.
      takenFacilityIds: this.licenses().filter((l) => !l.revokedAt).map((l) => l.facilityId),
    });
  }

  edit(license: LicenseDto): void {
    this.openDialog({ license, facilities: this.facilities(), takenFacilityIds: [] });
  }

  private openDialog(data: LicenseDialogData): void {
    this.dialog
      .open(LicenseDialog, { data, width: '600px', maxWidth: '95vw', autoFocus: false })
      .afterClosed()
      .subscribe((result?: { message?: string; issued?: IssuedLicenseDto }) => {
        if (!result) return;
        if (result.issued) {
          this.showKey(result.issued);
        } else if (result.message) {
          this.notify.success(result.message);
        }
        this.load();
      });
  }

  /** Cấp lại khóa — khóa cũ chết ngay, nên phải xác nhận trước. */
  rotate(license: LicenseDto): void {
    this.confirm
      .open({
        title: 'Cấp lại khóa bản quyền',
        message:
          `Cấp khóa mới cho "${license.facilityName}" (${license.facilityCode})? ` +
          'Khóa cũ NGỪNG HOẠT ĐỘNG ngay khi lưu — mọi máy trạm của đơn vị sẽ không kiểm được ' +
          'hồ sơ cho tới khi khai khóa mới. Sản lượng và hóa đơn đã ghi giữ nguyên.',
        danger: true,
        confirmText: 'Cấp lại khóa',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.rotate(license.id).subscribe({
          next: (issued) => {
            this.showKey(issued);
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không cấp lại được khóa'),
        });
      });
  }

  revoke(license: LicenseDto): void {
    this.confirm
      .open({
        title: 'Thu hồi hợp đồng',
        message:
          `Thu hồi hợp đồng của "${license.facilityName}" (${license.facilityCode})? ` +
          'Khóa ngừng hoạt động ngay. Sản lượng đã ghi vẫn giữ để đối soát và chốt sổ.',
        danger: true,
        confirmText: 'Thu hồi',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.revoke(license.id).subscribe({
          next: (res) => {
            this.notify.success(res.message);
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không thu hồi được hợp đồng'),
        });
      });
  }

  restore(license: LicenseDto): void {
    this.api.restore(license.id).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không khôi phục được hợp đồng'),
    });
  }

  /**
   * Hộp chép khóa: chặn đóng bằng Esc / bấm ra ngoài. Khóa gốc chỉ hiện lần này,
   * đóng nhầm là phải cấp lại khóa cho cả đơn vị.
   */
  private showKey(issued: IssuedLicenseDto): void {
    this.dialog.open(LicenseKeyDialog, {
      data: issued,
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
    });
  }

  /** Nhãn hạn mức: 0 = không giới hạn. */
  quotaLabel(license: LicenseDto): string {
    return license.monthlyQuota > 0 ? `/ ${license.monthlyQuota.toLocaleString('vi-VN')}` : '/ không giới hạn';
  }

  /** Vượt hạn mức trong kỳ đang chạy → tô đậm cảnh báo trên bảng. */
  isOverQuota(license: LicenseDto): boolean {
    return license.monthlyQuota > 0 && license.currentPeriodUnits > license.monthlyQuota;
  }
}
