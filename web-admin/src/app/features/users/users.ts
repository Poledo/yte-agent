import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersApi } from '../../core/api/users.api';
import { RolesApi } from '../../core/api/roles.api';
import { RoleDto, UserDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';
import { UserDialog, UserDialogData } from './user-dialog/user-dialog';

/** Trang quản lý người dùng. */
@Component({
  selector: 'app-users',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users {
  private readonly api = inject(UsersApi);
  private readonly rolesApi = inject(RolesApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly users = signal<UserDto[]>([]);
  readonly roles = signal<RoleDto[]>([]);
  readonly search = new FormControl('', { nonNullable: true });

  readonly columns: TableColumn[] = [
    { key: 'fullName', header: 'Người dùng', sortable: true },
    { key: 'roles', header: 'Vai trò' },
    { key: 'status', header: 'Trạng thái', align: 'center', width: '140px' },
    { key: 'actions', header: '', align: 'end', width: '60px' },
  ];

  constructor() {
    this.rolesApi.list().subscribe({
      next: (r) => this.roles.set(r),
      error: () => this.roles.set([]),
    });
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((v) => this.load(v));
  }

  load(search?: string): void {
    this.loading.set(true);
    this.api.list(search).subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được danh sách người dùng');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.openDialog(null);
  }

  openEdit(user: UserDto): void {
    this.openDialog(user);
  }

  private openDialog(user: UserDto | null): void {
    const data: UserDialogData = { user, roles: this.roles() };
    this.dialog
      .open(UserDialog, { data, width: '460px', autoFocus: false })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.load(this.search.value);
      });
  }

  toggleLock(user: UserDto): void {
    const req = user.isLockedOut ? this.api.unlock(user.id) : this.api.lock(user.id);
    req.subscribe({
      next: () => {
        this.notify.success(user.isLockedOut ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
        this.load(this.search.value);
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Thao tác thất bại'),
    });
  }

  remove(user: UserDto): void {
    this.confirm
      .open({
        title: 'Xóa người dùng',
        message: `Bạn chắc chắn muốn xóa "${user.fullName || user.email}"? Hành động này không thể hoàn tác.`,
        danger: true,
        confirmText: 'Xóa',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.remove(user.id).subscribe({
          next: () => {
            this.notify.success('Đã xóa người dùng');
            this.load(this.search.value);
          },
          error: (e) => this.notify.error(e?.error?.message ?? 'Không xóa được'),
        });
      });
  }
}
