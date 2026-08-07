import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Tiêu đề trang: icon + tiêu đề + mô tả + vùng action (ng-content). */
@Component({
  selector: 'app-page-header',
  imports: [MatIconModule],
  template: `
    <div class="page-header">
      <div class="left">
        @if (icon()) {
          <div class="icon-box"><mat-icon>{{ icon() }}</mat-icon></div>
        }
        <div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .left {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .icon-box {
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        border-radius: 12px;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      h1 {
        margin: 0;
        font: var(--mat-sys-headline-small);
      }
      p {
        margin: 2px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-medium);
      }
      .actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    `,
  ],
})
export class PageHeader {
  readonly title = input('');
  readonly subtitle = input('');
  readonly icon = input('');
}
