import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RolesApi } from '../../core/api/roles.api';
import { PermissionGroupDto, RoleDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { PermissionEditor } from './permission-editor/permission-editor';
import { RoleDialog } from './role-dialog/role-dialog';

/** Trang quản lý vai trò và phân quyền. */
@Component({
  selector: 'app-roles',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeader,
    LoadingSpinner,
    PermissionEditor,
  ],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles {
  private readonly api = inject(RolesApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly roles = signal<RoleDto[]>([]);
  readonly groups = signal<PermissionGroupDto[]>([]);
  readonly selectedId = signal<string | null>(null);

  get selectedRole(): RoleDto | null {
    return this.roles().find((r) => r.id === this.selectedId()) ?? null;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      roles: this.api.list(),
      groups: this.api.listPermissions(),
    }).subscribe({
      next: ({ roles, groups }) => {
        this.roles.set(roles);
        this.groups.set(groups);
        // Giữ lựa chọn nếu còn, nếu không chọn role đầu
        if (!this.selectedId() || !roles.some((r) => r.id === this.selectedId())) {
          this.selectedId.set(roles[0]?.id ?? null);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách vai trò');
        this.loading.set(false);
      },
    });
  }

  select(role: RoleDto): void {
    this.selectedId.set(role.id);
  }

  openCreate(): void {
    this.dialog
      .open(RoleDialog, { data: { role: null }, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  openEdit(role: RoleDto, event: Event): void {
    event.stopPropagation();
    this.dialog
      .open(RoleDialog, { data: { role }, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe((ok) => ok && this.load());
  }

  remove(role: RoleDto, event: Event): void {
    event.stopPropagation();
    this.confirm
      .open({
        title: 'Xóa vai trò',
        message: `Xóa vai trò "${role.name}"? Người dùng đang giữ vai trò này sẽ mất các quyền tương ứng.`,
        danger: true,
        confirmText: 'Xóa',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.remove(role.id).subscribe({
          next: () => {
            this.notify.success('Đã xóa vai trò');
            if (this.selectedId() === role.id) this.selectedId.set(null);
            this.load();
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không xóa được'),
        });
      });
  }

  onPermissionsSaved(codes: string[]): void {
    // Cập nhật cục bộ số quyền hiển thị trên thẻ
    this.roles.update((list) =>
      list.map((r) => (r.id === this.selectedId() ? { ...r, permissions: codes } : r)),
    );
  }
}
