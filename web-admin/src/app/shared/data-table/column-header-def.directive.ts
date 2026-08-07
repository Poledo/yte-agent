import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Đánh dấu template tùy biến cho Ô TIÊU ĐỀ (header) một cột của app-data-table.
 * Dùng: <ng-template appColumnHeaderDef="select"> ... </ng-template>
 * Nếu không khai báo, header dùng chuỗi col.header như mặc định.
 */
@Directive({
  selector: '[appColumnHeaderDef]',
})
export class ColumnHeaderDefDirective {
  readonly appColumnHeaderDef = input.required<string>();
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
