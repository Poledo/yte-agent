import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CatalogApi } from '../../../core/api/catalog.api';
import { CatalogItemDto, CatalogSourceDto } from '../../../core/api/models';
import { NotificationService } from '../../../core/notification.service';

export interface CatalogDetailDialogData {
  source: CatalogSourceDto;
}

/** Dialog xem nội dung một nguồn danh mục HIS: tìm kiếm + duyệt các dòng. */
@Component({
  selector: 'app-catalog-detail-dialog',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './catalog-detail-dialog.html',
  styleUrl: './catalog-detail-dialog.scss',
})
export class CatalogDetailDialog {
  private readonly api = inject(CatalogApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<CatalogDetailDialogData>(MAT_DIALOG_DATA);

  readonly loading = signal(true);
  readonly items = signal<CatalogItemDto[]>([]);
  readonly search = new FormControl('', { nonNullable: true });

  /** Số dòng tải mỗi lần (backend giới hạn 500). */
  readonly pageSize = 100;

  constructor() {
    this.load();
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.items(this.data.source.id, this.search.value || undefined, this.pageSize).subscribe({
      next: (page) => {
        this.items.set(page.items);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được nội dung danh mục');
        this.loading.set(false);
      },
    });
  }

  openFile(): void {
    const name = encodeURIComponent(this.data.source.fileName ?? '');
    window.open(`/viewer/catalog/${this.data.source.id}?name=${name}`, '_blank');
  }
}
