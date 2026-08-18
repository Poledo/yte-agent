import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { PermissionsApi } from '../../core/api/permissions.api';
import {
  PERMISSION_AUDIT_LABELS,
  PermissionAuditLogDto,
  PermissionAuditResult,
  PermissionDto,
  PermissionFacetsDto,
  PermissionSyncStatusDto,
} from '../../core/api/models';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { HasPermissionDirective } from '../../shared/permission.directive';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { ColumnHeaderDefDirective } from '../../shared/data-table/column-header-def.directive';
import { categoryIcon, categoryLabel } from '../../shared/permission-labels';

/** Server chặn pageSize > 200; tải hết rồi lọc/phân trang tại chỗ cho nhẹ thao tác. */
const PAGE_SIZE = 200;

/**
 * Màn hình Quyền: xem bảng quyền do bộ quét endpoint sinh ra, bật/tắt hàng loạt,
 * quét lại và soi nhật ký từ chối.
 *
 * Không có nút thêm/xóa quyền: nguồn sự thật là mã nguồn. Một mã tự thêm tay sẽ
 * không gắn với endpoint nào nên vĩnh viễn không bao giờ được kiểm tới.
 */
@Component({
  selector: 'app-permissions',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatTabsModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
    ColumnHeaderDefDirective,
    HasPermissionDirective,
  ],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss',
})
export class Permissions {
  private readonly api = inject(PermissionsApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly rescanning = signal(false);
  readonly items = signal<PermissionDto[]>([]);
  readonly facets = signal<PermissionFacetsDto | null>(null);
  readonly syncStatus = signal<PermissionSyncStatusDto | null>(null);

  readonly categoryCtrl = new FormControl('', { nonNullable: true });
  readonly statusCtrl = new FormControl<'' | 'active' | 'inactive'>('', { nonNullable: true });
  readonly searchCtrl = new FormControl('', { nonNullable: true });

  /** Quyền bật/tắt hàng loạt — không có thì ẩn luôn cột chọn cho đỡ rối. */
  readonly canToggle = computed(() => this.auth.hasPermission('Permissions.BulkToggle'));
  readonly canRename = computed(() => this.auth.hasPermission('Permissions.UpdateDisplayName'));

  readonly selected = signal<Set<string>>(new Set());
  readonly selectedCount = computed(() => this.selected().size);
  readonly allVisibleSelected = computed(() => {
    const rows = this.items();
    return rows.length > 0 && rows.every((p) => this.selected().has(p.code));
  });
  readonly selectIndeterminate = computed(
    () => this.selectedCount() > 0 && !this.allVisibleSelected(),
  );

  /** Mã quyền đang sửa tên hiển thị (mỗi lúc chỉ một dòng). */
  readonly editingCode = signal<string | null>(null);
  readonly editCtrl = new FormControl('', { nonNullable: true });

  readonly columns = computed<TableColumn[]>(() => [
    ...(this.canToggle()
      ? [{ key: 'select', header: '', width: '48px', align: 'center' } as TableColumn]
      : []),
    { key: 'displayName', header: 'Quyền', sortable: true },
    { key: 'code', header: 'Mã quyền', sortable: true, width: '250px' },
    { key: 'category', header: 'Nhóm', sortable: true, width: '180px' },
    { key: 'endpoint', header: 'Endpoint', width: '300px' },
    { key: 'isActive', header: 'Trạng thái', align: 'center', width: '130px' },
  ]);

  // --- Nhật ký từ chối ---
  readonly logsLoading = signal(false);
  readonly logs = signal<PermissionAuditLogDto[]>([]);
  readonly logsTotal = signal(0);
  readonly logsLoaded = signal(false);
  readonly resultCtrl = new FormControl('', { nonNullable: true });
  readonly logSearchCtrl = new FormControl('', { nonNullable: true });

  readonly resultOptions: { value: string; label: string }[] = [
    { value: '', label: 'Tất cả lý do' },
    ...(Object.keys(PERMISSION_AUDIT_LABELS) as PermissionAuditResult[]).map((r) => ({
      value: r,
      label: PERMISSION_AUDIT_LABELS[r],
    })),
  ];

  readonly logColumns: TableColumn[] = [
    { key: 'createdAt', header: 'Thời điểm', sortable: true, width: '170px' },
    { key: 'userName', header: 'Người dùng', sortable: true, width: '200px' },
    { key: 'permissionCode', header: 'Mã quyền thiếu', sortable: true, width: '250px' },
    { key: 'path', header: 'Đường dẫn' },
    { key: 'result', header: 'Lý do', align: 'center', width: '190px' },
    { key: 'ipAddress', header: 'IP', width: '130px' },
  ];

  constructor() {
    this.load();
    this.loadFacets();
    this.loadSyncStatus();

    this.categoryCtrl.valueChanges.subscribe(() => this.load());
    this.statusCtrl.valueChanges.subscribe(() => this.load());
    this.searchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load());

    this.resultCtrl.valueChanges.subscribe(() => this.loadLogs());
    this.logSearchCtrl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.loadLogs());
  }

  groupLabel = categoryLabel;
  groupIcon = categoryIcon;

  resultLabel(r: PermissionAuditResult): string {
    return PERMISSION_AUDIT_LABELS[r] ?? r;
  }

  load(): void {
    this.loading.set(true);
    const status = this.statusCtrl.value;
    const base = {
      category: this.categoryCtrl.value || undefined,
      search: this.searchCtrl.value || undefined,
      isActive: status === '' ? null : status === 'active',
      pageSize: PAGE_SIZE,
    };

    this.api
      .list({ ...base, page: 1 })
      .pipe(
        switchMap((first) => {
          // ~110 quyền thì một trang là đủ, nhưng thêm controller là số này tăng —
          // gọi nốt các trang sau để bảng không âm thầm cụt.
          const pages = Math.ceil(first.total / PAGE_SIZE);
          if (pages <= 1) return of([first]);
          const rest = Array.from({ length: pages - 1 }, (_, i) =>
            this.api.list({ ...base, page: i + 2 }),
          );
          return forkJoin(rest).pipe(map((r) => [first, ...r]));
        }),
      )
      .subscribe({
        next: (pages) => {
          const rows = pages.flatMap((p) => p.items);
          this.items.set(rows);
          // Bỏ chọn mã không còn trong danh sách lọc để không bật/tắt nhầm dòng đã khuất.
          const codes = new Set(rows.map((p) => p.code));
          this.selected.update((sel) => new Set([...sel].filter((c) => codes.has(c))));
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Không tải được bảng quyền');
          this.loading.set(false);
        },
      });
  }

  private loadFacets(): void {
    this.api.facets().subscribe({
      next: (f) => this.facets.set(f),
      // Thiếu facet chỉ mất dropdown lọc, bảng vẫn dùng được — không báo lỗi ồn ào.
      error: () => this.facets.set(null),
    });
  }

  private loadSyncStatus(): void {
    this.api.syncStatus().subscribe({
      next: (s) => this.syncStatus.set(s),
      error: () => this.syncStatus.set(null),
    });
  }

  isSelected(code: string): boolean {
    return this.selected().has(code);
  }

  toggleSelect(code: string): void {
    const next = new Set(this.selected());
    if (next.has(code)) next.delete(code);
    else next.add(code);
    this.selected.set(next);
  }

  toggleSelectAll(): void {
    if (this.allVisibleSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.items().map((p) => p.code)));
    }
  }

  /** Bật/tắt các quyền đang chọn. Tắt là thao tác chặn API nên phải hỏi lại. */
  bulkToggle(isActive: boolean): void {
    const codes = [...this.selected()];
    if (codes.length === 0) return;

    const run = () =>
      this.api.bulkToggle({ codes, isActive }).subscribe({
        next: (res) => {
          this.notify.success(res.message);
          this.selected.set(new Set());
          this.load();
          this.loadFacets();
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Không đổi được trạng thái quyền'),
      });

    if (isActive) {
      run();
      return;
    }

    this.confirm
      .open({
        title: 'Tắt quyền',
        message:
          `Tắt ${codes.length} quyền? Mọi vai trò đang giữ các quyền này sẽ bị chặn ngay ` +
          'ở lần gọi tiếp theo, kể cả quản trị hệ thống cấp cơ sở.',
        danger: true,
        confirmText: 'Tắt quyền',
      })
      .subscribe((yes) => {
        if (yes) run();
      });
  }

  /** Bật/tắt một dòng — lối tắt của bulk-toggle cho thao tác lẻ. */
  toggleOne(p: PermissionDto): void {
    this.selected.set(new Set([p.code]));
    this.bulkToggle(!p.isActive);
  }

  startEdit(p: PermissionDto): void {
    this.editingCode.set(p.code);
    this.editCtrl.setValue(p.displayName);
  }

  cancelEdit(): void {
    this.editingCode.set(null);
  }

  saveEdit(p: PermissionDto): void {
    const name = this.editCtrl.value.trim();
    if (!name || name === p.displayName) {
      this.cancelEdit();
      return;
    }
    this.api.updateDisplayName(p.code, { displayName: name }).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.cancelEdit();
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Không đổi được tên hiển thị'),
    });
  }

  /** Quét lại endpoint và đồng bộ bảng quyền, không phải khởi động lại API. */
  rescan(): void {
    this.confirm
      .open({
        title: 'Quét lại quyền',
        message:
          'Quét toàn bộ endpoint đang chạy và đồng bộ vào bảng quyền. ' +
          'Quyền mới sẽ được cấp tự động cho vai trò quản trị hệ thống; ' +
          'endpoint đã gỡ chỉ bị tắt chứ không xóa.',
        confirmText: 'Quét lại',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.rescanning.set(true);
        this.api.rescan().subscribe({
          next: (r) => {
            this.notify.success(
              `Đã quét ${r.scanned} endpoint: thêm ${r.added}, cập nhật ${r.updated}, ` +
                `tắt ${r.deactivated}, bật lại ${r.reactivated}, tự cấp ${r.autoGranted}.`,
            );
            this.rescanning.set(false);
            this.load();
            this.loadFacets();
            this.loadSyncStatus();
          },
          error: (e) => {
            this.notify.error(e?.error?.message ?? 'Quét lại không thành công');
            this.rescanning.set(false);
          },
        });
      });
  }

  /** Nhật ký chỉ tải khi mở tab: phần lớn lần vào màn hình này là để xem bảng quyền. */
  onTabChange(index: number): void {
    if (index === 1 && !this.logsLoaded()) {
      this.loadLogs();
    }
  }

  loadLogs(): void {
    this.logsLoading.set(true);
    this.logsLoaded.set(true);
    this.api
      .auditLogs({
        result: this.resultCtrl.value || undefined,
        search: this.logSearchCtrl.value || undefined,
        pageSize: 100,
      })
      .subscribe({
        next: (page) => {
          this.logs.set(page.items);
          this.logsTotal.set(page.total);
          this.logsLoading.set(false);
        },
        error: () => {
          this.notify.error('Không tải được nhật ký từ chối');
          this.logsLoading.set(false);
        },
      });
  }
}
