import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Trạng thái rỗng: icon + tiêu đề + mô tả (+ nội dung chiếu). */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon>{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 8px;
        padding: 56px 24px;
        color: var(--mat-sys-on-surface-variant);
      }
      mat-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        opacity: 0.55;
      }
      h3 {
        margin: 8px 0 0;
        font: var(--mat-sys-title-medium);
        color: var(--mat-sys-on-surface);
      }
      p {
        margin: 0;
        max-width: 420px;
      }
    `,
  ],
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input('Chưa có dữ liệu');
  readonly description = input('');
}
