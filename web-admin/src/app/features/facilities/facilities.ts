import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { FacilityApi } from '../../core/api/facility.api';
import {
  FACILITY_TUYEN_LABELS,
  FACILITY_TUYEN_ORDER,
  FACILITY_TUYEN_SHORT,
  FacilityCatalogScopeDto,
  FacilityDto,
  FacilityTuyen,
} from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { HasPermissionDirective } from '../../shared/permission.directive';
import { PageHeader } from '../../shared/page-header/page-header';
import {
  FacilityDialog,
  FacilityDialogData,
  FacilityDialogResult,
} from './facility-dialog/facility-dialog';

/**
 * Màn hình cây đơn vị: Sở Y tế → Trung tâm Y tế huyện → Trạm Y tế xã.
 *
 * Cây này trả lời câu hỏi "hồ sơ của cơ sở X đối chiếu bằng danh mục HIS nào":
 * ưu tiên danh mục của CHÍNH cơ sở đó, loại nào chưa tự nạp thì mượn của đơn vị
 * cấp trên — trừ khi đơn vị tắt cờ "được dùng danh mục của đơn vị cấp trên".
 * Bấm vào một đơn vị để xem thực tế đang mượn của ai.
 */
@Component({
  selector: 'app-facilities',
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    PageHeader,
    HasPermissionDirective,
  ],
  templateUrl: './facilities.html',
  styleUrl: './facilities.scss',
})
export class Facilities {
  private readonly api = inject(FacilityApi);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly tree = signal<FacilityDto[]>([]);
  /** Danh sách phẳng — dùng cho ô chọn đơn vị cấp trên trong dialog. */
  readonly flat = signal<FacilityDto[]>([]);
  readonly showInactive = signal(false);

  /** Lọc theo tuyến; 'all' = không lọc. */
  readonly tuyenFilter = signal<FacilityTuyen | 'all'>('all');
  readonly tuyenOptions = FACILITY_TUYEN_ORDER;
  readonly tuyenLabels = FACILITY_TUYEN_LABELS;

  /** Các nút đang thu gọn (mặc định mở hết cho thấy ngay toàn cảnh). */
  private readonly collapsed = signal<Set<number>>(new Set());

  /** Đơn vị đang xem chi tiết danh mục đang dùng. */
  readonly scopeOf = signal<FacilityDto | null>(null);
  readonly scope = signal<FacilityCatalogScopeDto | null>(null);
  readonly scopeLoading = signal(false);

  /**
   * Cây sau khi lọc tuyến. Giữ lại cả đơn vị không khớp tuyến nếu bên dưới nó còn
   * đơn vị khớp — cắt luôn cấp trên thì các trạm y tế tìm được sẽ hiện lơ lửng,
   * không còn biết thuộc bệnh viện nào.
   */
  readonly visibleTree = computed<FacilityDto[]>(() => {
    const want = this.tuyenFilter();
    if (want === 'all') return this.tree();

    const prune = (nodes: FacilityDto[]): FacilityDto[] =>
      nodes.reduce<FacilityDto[]>((acc, n) => {
        const children = prune(n.children);
        if (n.tuyen === want || children.length > 0) acc.push({ ...n, children });
        return acc;
      }, []);
    return prune(this.tree());
  });

  readonly isEmpty = computed(() => !this.loading() && this.visibleTree().length === 0);
  readonly isFiltered = computed(() => this.tuyenFilter() !== 'all');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      tree: this.api.tree(this.showInactive()),
      flat: this.api.list(this.showInactive()),
    }).subscribe({
      next: ({ tree, flat }) => {
        this.tree.set(tree);
        this.flat.set(flat);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được cây đơn vị');
        this.loading.set(false);
      },
    });
  }

  toggleInactive(show: boolean): void {
    this.showInactive.set(show);
    this.load();
  }

  /** Ngữ cảnh của ng-template đệ quy không có kiểu, nên tra bảng qua hàm cho gọn. */
  shortTuyen(tuyen: FacilityTuyen): string {
    return FACILITY_TUYEN_SHORT[tuyen];
  }

  filterTuyen(tuyen: FacilityTuyen | 'all'): void {
    this.tuyenFilter.set(tuyen);
  }

  isCollapsed(id: number): boolean {
    return this.collapsed().has(id);
  }

  toggleCollapse(id: number): void {
    const next = new Set(this.collapsed());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.collapsed.set(next);
  }

  add(parent: FacilityDto | null = null): void {
    this.openDialog({ facility: null, all: this.flat(), defaultParentId: parent?.id ?? null });
  }

  edit(facility: FacilityDto): void {
    this.openDialog({ facility, all: this.flat() });
  }

  private openDialog(data: FacilityDialogData): void {
    this.dialog
      .open(FacilityDialog, { data, width: '520px', maxWidth: '95vw', autoFocus: false })
      .afterClosed()
      .subscribe((res?: FacilityDialogResult) => {
        if (!res) return;
        // Snackbar chỉ hiện được một cái: gọi liên tiếp thì toast sau nuốt mất toast
        // trước. Có cảnh báo lệch tuyến thì gộp chung vào một toast màu vàng.
        if (res.warning) this.notify.warning(`${res.message} ${res.warning}`);
        else this.notify.success(res.message);
        this.load();
      });
  }

  remove(facility: FacilityDto): void {
    const childNote =
      facility.children.length > 0
        ? ` ${facility.children.length} đơn vị cấp dưới sẽ chuyển thành đơn vị gốc (không bị xóa theo).`
        : '';
    this.confirm
      .open({
        title: 'Xóa đơn vị',
        message:
          `Xóa đơn vị "${facility.name}" (mã ${facility.code})?${childNote} ` +
          'Danh mục đã nạp của đơn vị vẫn giữ nguyên, chỉ mất quan hệ kế thừa với cấp trên.',
        danger: true,
        confirmText: 'Xóa',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.remove(facility.id).subscribe({
          next: (res) => {
            this.notify.success(res.message);
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không xóa được đơn vị'),
        });
      });
  }

  /** Xem đơn vị này thực tế dùng danh mục của ai, theo từng loại danh mục. */
  openScope(facility: FacilityDto): void {
    // Bấm lại chính đơn vị đang mở → đóng bảng chi tiết
    if (this.scopeOf()?.id === facility.id) {
      this.scopeOf.set(null);
      this.scope.set(null);
      return;
    }

    this.scopeOf.set(facility);
    this.scope.set(null);
    this.scopeLoading.set(true);
    this.api.catalogScope(facility.code).subscribe({
      next: (res) => {
        this.scope.set(res);
        this.scopeLoading.set(false);
      },
      error: () => {
        this.notify.error('Không tra được danh mục đang dùng của đơn vị');
        this.scopeLoading.set(false);
      },
    });
  }
}
