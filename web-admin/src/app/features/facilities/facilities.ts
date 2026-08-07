import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { FacilityApi } from '../../core/api/facility.api';
import { FacilityCatalogScopeDto, FacilityDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { HasPermissionDirective } from '../../shared/permission.directive';
import { PageHeader } from '../../shared/page-header/page-header';
import { FacilityDialog, FacilityDialogData } from './facility-dialog/facility-dialog';

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

  /** Các nút đang thu gọn (mặc định mở hết cho thấy ngay toàn cảnh). */
  private readonly collapsed = signal<Set<number>>(new Set());

  /** Đơn vị đang xem chi tiết danh mục đang dùng. */
  readonly scopeOf = signal<FacilityDto | null>(null);
  readonly scope = signal<FacilityCatalogScopeDto | null>(null);
  readonly scopeLoading = signal(false);

  readonly isEmpty = computed(() => !this.loading() && this.tree().length === 0);

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
      .subscribe((message?: string) => {
        if (!message) return;
        this.notify.success(message);
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
