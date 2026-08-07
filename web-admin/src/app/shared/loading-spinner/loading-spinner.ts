import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Spinner căn giữa cho trạng thái đang tải. */
@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="spinner-wrap">
      <mat-spinner [diameter]="diameter()"></mat-spinner>
      @if (label()) {
        <p class="label">{{ label() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .spinner-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .label {
        margin: 0;
        font: var(--mat-sys-body-medium);
      }
    `,
  ],
})
export class LoadingSpinner {
  readonly diameter = input(48);
  readonly label = input('');
}
