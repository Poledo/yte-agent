import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpEvent } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CatalogApi } from '../../core/api/catalog.api';
import { FacilityApi } from '../../core/api/facility.api';
import { CatalogSourceDto, FacilityDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../shared/confirm.service';
import { HasPermissionDirective } from '../../shared/permission.directive';
import { PageHeader } from '../../shared/page-header/page-header';
import { FileUpload } from '../../shared/file-upload/file-upload';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { ColumnHeaderDefDirective } from '../../shared/data-table/column-header-def.directive';
import { fileTypeIcon } from '../../shared/file-type-icon';
import {
  CatalogDetailDialog,
  CatalogDetailDialogData,
} from './catalog-detail-dialog/catalog-detail-dialog';

/** Trang danh mục HIS: nạp file Excel và quản lý nguồn danh mục (gỡ mềm / khôi phục). */
@Component({
  selector: 'app-catalog',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatTooltipModule,
    PageHeader,
    FileUpload,
    DataTable,
    ColumnDefDirective,
    ColumnHeaderDefDirective,
    HasPermissionDirective,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog {
  private readonly api = inject(CatalogApi);
  private readonly facilityApi = inject(FacilityApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  /** Quyền nạp/gỡ danh mục vào kho tri thức — ẩn checkbox chọn + nút nạp nếu thiếu. */
  readonly canKnowledge = computed(() => this.auth.hasPermission('Catalog.AddManyToKnowledge'));

  readonly loading = signal(true);
  readonly sources = signal<CatalogSourceDto[]>([]);
  readonly showUpload = signal(false);
  /** Hiện cả danh mục đã gỡ (để khôi phục). */
  readonly showInactive = signal(false);

  /** Tìm nhanh trong danh mục đã nạp: theo tên danh mục / tên file / loại / mã cơ sở. */
  readonly searchCtrl = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.searchCtrl.valueChanges, { initialValue: '' });

  readonly filtered = computed(() => {
    const t = this.term().trim().toLowerCase();
    if (!t) return this.sources();
    return this.sources().filter(
      (s) =>
        s.displayName.toLowerCase().includes(t) ||
        (s.fileName ?? '').toLowerCase().includes(t) ||
        (s.catalogType ?? '').toLowerCase().includes(t) ||
        (s.facilityCode ?? '').toLowerCase().includes(t),
    );
  });

  /** Cột bảng — cột "select" (nạp kho tri thức hàng loạt) chỉ hiện khi có quyền Catalog.Knowledge. */
  readonly columns = computed<TableColumn[]>(() => [
    ...(this.canKnowledge()
      ? [{ key: 'select', header: '', width: '48px', align: 'center' } as TableColumn]
      : []),
    { key: 'displayName', header: 'Danh mục', sortable: true },
    { key: 'catalogType', header: 'Loại', sortable: true, width: '150px' },
    // Quản trị cơ sở chỉ thấy danh mục của nhánh mình nên cột này chỉ tốn chỗ.
    ...(this.auth.isSystemScope()
      ? [{ key: 'facilityCode', header: 'Cơ sở KCB', sortable: true, width: '180px' } as TableColumn]
      : []),
    { key: 'rowCount', header: 'Số dòng', align: 'end', width: '100px', sortable: true },
    { key: 'importedAt', header: 'Ngày nạp', width: '120px', sortable: true },
    { key: 'status', header: 'Trạng thái', align: 'center', width: '150px' },
    { key: 'actions', header: '', align: 'end', width: '150px' },
  ]);

  /** Id các danh mục đang được tick chọn (để nạp kho tri thức hàng loạt). */
  readonly selected = signal<Set<number>>(new Set());
  readonly selectedCount = computed(() => this.selected().size);
  readonly allVisibleSelected = computed(() => {
    const rows = this.filtered();
    return rows.length > 0 && rows.every((s) => this.selected().has(s.id));
  });
  /** Có chọn nhưng chưa chọn hết — checkbox header ở trạng thái "gạch ngang". */
  readonly selectIndeterminate = computed(
    () => this.selectedCount() > 0 && !this.allVisibleSelected(),
  );

  /** Icon + màu theo loại file của danh mục. */
  readonly fileIcon = fileTypeIcon;

  /** Mã cơ sở → tên đơn vị, để bảng hiện tên chứ không bắt người dùng nhớ mã. */
  private readonly facilityNames = computed(() => {
    const map = new Map<string, string>();
    for (const f of this.facilities()) {
      map.set(f.code, f.name);
    }
    return map;
  });

  /** Tên đơn vị theo mã; đơn vị chưa khai trong cây thì trả về rỗng. */
  facilityName(code?: string | null): string {
    return (code && this.facilityNames().get(code)) || '';
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.filtered().map((s) => s.id)));
    }
  }

  /**
   * Đơn vị áp cho file sắp nạp.
   *
   * Vì sao cần? Danh mục nào có cột mã cơ sở (DVTT) thì hệ thống tự đọc, nhưng
   * danh mục Nhân viên và Đơn vị chuyển tuyến KHÔNG có cột đó. Không chọn đơn vị
   * thì hai danh mục này nằm ngoài mọi cơ sở, các rule đối chiếu theo cơ sở
   * (sai thông tin người ký, sai đơn vị chuyển tuyến) sẽ bỏ qua chúng.
   */
  readonly facilityCtrl = new FormControl('', { nonNullable: true });
  readonly facilities = signal<FacilityDto[]>([]);

  readonly uploadFn = (file: File): Observable<HttpEvent<unknown>> =>
    this.api.import(file, this.facilityCtrl.value || undefined);

  constructor() {
    this.load();
    this.facilityApi.list().subscribe({
      next: (list) => this.facilities.set(list),
      // Chưa có cây đơn vị vẫn nạp được danh mục (ô chọn để trống) — không báo lỗi ồn ào
      error: () => this.facilities.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.sources(this.showInactive()).subscribe({
      next: (list) => {
        this.sources.set(list);
        // Bỏ chọn các id không còn trong danh sách để tránh nạp nhầm
        const ids = new Set(list.map((s) => s.id));
        this.selected.update((sel) => new Set([...sel].filter((id) => ids.has(id))));
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh mục');
        this.loading.set(false);
      },
    });
  }

  toggleInactive(show: boolean): void {
    this.showInactive.set(show);
    this.load();
  }

  onUploaded(): void {
    this.load();
  }

  remove(source: CatalogSourceDto): void {
    this.confirm
      .open({
        title: 'Gỡ danh mục',
        message:
          `Gỡ danh mục "${source.displayName}" (${source.rowCount} dòng)? ` +
          'Danh mục sẽ ngừng hiệu lực đối chiếu nhưng vẫn có thể khôi phục sau.',
        danger: true,
        confirmText: 'Gỡ bỏ',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.removeSource(source.id).subscribe({
          next: () => {
            this.notify.success('Đã gỡ danh mục. Có thể khôi phục khi cần.');
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không gỡ được'),
        });
      });
  }

  openDetail(source: CatalogSourceDto): void {
    const data: CatalogDetailDialogData = { source };
    this.dialog.open(CatalogDetailDialog, { data, width: '860px', maxWidth: '95vw', autoFocus: false });
  }

  restore(source: CatalogSourceDto): void {
    this.api.restoreSource(source.id).subscribe({
      next: (res) => {
        const msg = (res as { message?: string })?.message;
        this.notify.success(msg ?? 'Đã khôi phục danh mục');
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không khôi phục được'),
    });
  }

  /** Nạp một danh mục vào kho tri thức. */
  toKnowledge(source: CatalogSourceDto): void {
    this.api.addToKnowledge(source.id).subscribe({
      next: (res) => {
        this.notify.success(res?.message ?? 'Đã nạp vào kho tri thức');
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không nạp được vào kho tri thức'),
    });
  }

  /** Gỡ một danh mục khỏi kho tri thức (có xác nhận). */
  fromKnowledge(source: CatalogSourceDto): void {
    this.confirm
      .open({
        title: 'Gỡ khỏi kho tri thức',
        message:
          `Gỡ danh mục "${source.displayName}" khỏi kho tri thức? ` +
          'Trợ lý hỏi–đáp sẽ không còn tra ra nội dung danh mục này. Dữ liệu đối chiếu vẫn giữ nguyên.',
        confirmText: 'Gỡ khỏi kho tri thức',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.removeFromKnowledge(source.id).subscribe({
          next: (res) => {
            this.notify.success(res?.message ?? 'Đã gỡ khỏi kho tri thức');
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không gỡ được'),
        });
      });
  }

  /** Nạp các danh mục đang chọn vào kho tri thức. */
  addSelectedToKnowledge(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.api.addManyToKnowledge(ids).subscribe({
      next: (res) => {
        if (res.failed?.length) {
          const names = res.failed.map((f) => f.name ?? `#${f.id}`).join(', ');
          this.notify.info(`${res.message} Không nạp được: ${names}`);
        } else {
          this.notify.success(res.message);
        }
        this.selected.set(new Set());
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không nạp được vào kho tri thức'),
    });
  }
}
