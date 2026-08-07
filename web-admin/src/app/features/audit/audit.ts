import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditApi } from '../../core/api/audit.api';
import { AuditLogDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { DataTable, TableColumn } from '../../shared/data-table/data-table';
import { ColumnDefDirective } from '../../shared/data-table/column-def.directive';

/** Trang nhật ký kiểm toán: đọc từ GET /api/admin/audit. */
@Component({
  selector: 'app-audit',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeader,
    DataTable,
    ColumnDefDirective,
  ],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
})
export class Audit {
  private readonly api = inject(AuditApi);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly logs = signal<AuditLogDto[]>([]);
  readonly search = new FormControl('', { nonNullable: true });
  readonly actionFilter = new FormControl('', { nonNullable: true });

  /** Nhóm hành động để lọc nhanh (khớp tiền tố mã action). */
  readonly actionGroups = [
    { value: '', label: 'Tất cả hành động' },
    { value: 'Auth', label: 'Đăng nhập / tài khoản' },
    { value: 'User', label: 'Quản lý người dùng' },
    { value: 'Role', label: 'Vai trò & quyền' },
  ];

  readonly columns: TableColumn[] = [
    { key: 'createdAt', header: 'Thời điểm', sortable: true, width: '170px' },
    { key: 'action', header: 'Hành động', sortable: true, width: '170px' },
    { key: 'userName', header: 'Người thao tác', sortable: true },
    { key: 'target', header: 'Đối tượng' },
    { key: 'ipAddress', header: 'IP', width: '120px' },
  ];

  constructor() {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load());
    this.actionFilter.valueChanges.subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api
      .list({
        action: this.actionFilter.value || undefined,
        search: this.search.value || undefined,
        pageSize: 100,
      })
      .subscribe({
        next: (page) => {
          this.logs.set(page.items);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Không tải được nhật ký kiểm toán');
          this.loading.set(false);
        },
      });
  }
}
