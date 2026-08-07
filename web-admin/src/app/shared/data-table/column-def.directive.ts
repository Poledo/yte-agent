import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Đánh dấu template tùy biến cho một cột của app-data-table.
 * Dùng: <ng-template appColumnDef="status" let-row> ... </ng-template>
 */
@Directive({
  selector: '[appColumnDef]',
})
export class ColumnDefDirective {
  readonly appColumnDef = input.required<string>();
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
