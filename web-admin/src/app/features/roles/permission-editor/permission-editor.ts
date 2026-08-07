import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PermissionGroupDto, RoleDto } from '../../../core/api/models';
import { RolesApi } from '../../../core/api/roles.api';
import { NotificationService } from '../../../core/notification.service';

/** Tên nhóm tiếng Việt để hiển thị. */
const GROUP_LABELS: Record<string, string> = {
  Document: 'Tài liệu',
  Knowledge: 'Tri thức',
  Catalog: 'Danh mục',
  Validation: 'Kiểm tra hồ sơ',
  AI: 'Trợ lý AI',
  Prompt: 'Prompt',
  User: 'Người dùng',
  Role: 'Vai trò & quyền',
  Audit: 'Kiểm toán',
  System: 'Hệ thống',
};

const GROUP_ICONS: Record<string, string> = {
  Document: 'description',
  Knowledge: 'menu_book',
  Catalog: 'inventory_2',
  Validation: 'fact_check',
  AI: 'smart_toy',
  Prompt: 'terminal',
  User: 'group',
  Role: 'admin_panel_settings',
  Audit: 'history',
  System: 'settings',
};

/** Trình gán quyền theo nhóm cho một vai trò. */
@Component({
  selector: 'app-permission-editor',
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './permission-editor.html',
  styleUrl: './permission-editor.scss',
})
export class PermissionEditor {
  private readonly api = inject(RolesApi);
  private readonly notify = inject(NotificationService);

  readonly role = input.required<RoleDto>();
  readonly groups = input.required<PermissionGroupDto[]>();
  readonly saved = output<string[]>();

  readonly selected = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly searchCtrl = new FormControl('', { nonNullable: true });
  private readonly searchTerm = toSignal(this.searchCtrl.valueChanges, { initialValue: '' });

  constructor() {
    // Nạp lại lựa chọn mỗi khi đổi role
    effect(() => {
      const r = this.role();
      this.selected.set(new Set(r.permissions ?? []));
      this.searchCtrl.setValue('', { emitEvent: false });
    });
  }

  // Nhóm đã lọc theo từ khóa
  readonly filteredGroups = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.groups();
    return this.groups()
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.displayName.toLowerCase().includes(term) || p.code.toLowerCase().includes(term),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  });

  readonly totalCount = computed(() =>
    this.groups().reduce((sum, g) => sum + g.permissions.length, 0),
  );
  readonly selectedCount = computed(() => this.selected().size);

  groupLabel(group: string): string {
    return GROUP_LABELS[group] ?? group;
  }
  groupIcon(group: string): string {
    return GROUP_ICONS[group] ?? 'folder';
  }

  isChecked(code: string): boolean {
    return this.selected().has(code);
  }

  toggle(code: string, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  groupSelectedCount(g: PermissionGroupDto): number {
    return g.permissions.filter((p) => this.selected().has(p.code)).length;
  }
  groupAllChecked(g: PermissionGroupDto): boolean {
    return g.permissions.length > 0 && this.groupSelectedCount(g) === g.permissions.length;
  }
  groupIndeterminate(g: PermissionGroupDto): boolean {
    const c = this.groupSelectedCount(g);
    return c > 0 && c < g.permissions.length;
  }
  groupProgress(g: PermissionGroupDto): number {
    if (g.permissions.length === 0) return 0;
    return (this.groupSelectedCount(g) / g.permissions.length) * 100;
  }

  toggleGroup(g: PermissionGroupDto, checked: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      for (const p of g.permissions) {
        if (checked) next.add(p.code);
        else next.delete(p.code);
      }
      return next;
    });
  }

  selectAll(): void {
    const all = new Set<string>();
    for (const g of this.groups()) for (const p of g.permissions) all.add(p.code);
    this.selected.set(all);
  }
  clearAll(): void {
    this.selected.set(new Set());
  }

  save(): void {
    this.saving.set(true);
    const codes = Array.from(this.selected());
    this.api.assignPermissions(this.role().id, { permissions: codes }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(`Đã lưu quyền cho vai trò "${this.role().name}"`);
        this.saved.emit(codes);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.error?.message ?? 'Lưu quyền thất bại');
      },
    });
  }
}
