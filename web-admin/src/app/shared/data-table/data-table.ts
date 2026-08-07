import {
  AfterContentInit,
  Component,
  ContentChildren,
  QueryList,
  computed,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ColumnDefDirective } from './column-def.directive';
import { ColumnHeaderDefDirective } from './column-header-def.directive';
import { EmptyState } from '../empty-state/empty-state';

export interface TableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  /** Hàm lấy giá trị text mặc định (nếu không có template tùy biến). */
  value?: (row: any) => string;
  width?: string;
  align?: 'start' | 'center' | 'end';
}

/** Wrapper MatTable: sort + phân trang + loading + empty. */
@Component({
  selector: 'app-data-table',
  imports: [
    NgTemplateOutlet,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    EmptyState,
  ],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
})
export class DataTable<T> implements AfterContentInit {
  readonly columns = input.required<TableColumn[]>();
  readonly data = input<T[]>([]);
  readonly loading = input(false);
  readonly pageSize = input(10);
  readonly emptyIcon = input('inbox');
  readonly emptyTitle = input('Không có dữ liệu');
  readonly emptyDescription = input('');

  @ContentChildren(ColumnDefDirective) templates!: QueryList<ColumnDefDirective>;
  private readonly tplMap = signal<Map<string, ColumnDefDirective>>(new Map());

  @ContentChildren(ColumnHeaderDefDirective) headerTemplates!: QueryList<ColumnHeaderDefDirective>;
  private readonly headerTplMap = signal<Map<string, ColumnHeaderDefDirective>>(new Map());

  readonly displayedColumns = computed(() => this.columns().map((c) => c.key));

  // Sort + phân trang thuần signal: mọi bước dẫn xuất từ input data()
  // để bảng tự render lại khi dữ liệu về (MatTableDataSource không phải
  // signal nên computed sẽ không bao giờ tính lại — bug bảng trống).
  private readonly sortState = signal<Sort | null>(null);
  readonly pageIndex = signal(0);

  readonly total = computed(() => this.data().length);

  private readonly sorted = computed(() => {
    const rows = [...this.data()];
    const sort = this.sortState();
    if (!sort || !sort.active || sort.direction === '') return rows;
    const col = this.columns().find((c) => c.key === sort.active);
    const dir = sort.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = col?.value ? col.value(a) : (a as Record<string, unknown>)[sort.active];
      const bv = col?.value ? col.value(b) : (b as Record<string, unknown>)[sort.active];
      return String(av).localeCompare(String(bv), 'vi', { numeric: true }) * dir;
    });
    return rows;
  });

  readonly paged = computed(() => {
    const rows = this.sorted();
    const size = this.pageSize();
    // Kẹp pageIndex khi dữ liệu co lại (vd xóa hết dòng ở trang cuối)
    const maxPage = Math.max(0, Math.ceil(rows.length / size) - 1);
    const start = Math.min(this.pageIndex(), maxPage) * size;
    return rows.slice(start, start + size);
  });

  ngAfterContentInit(): void {
    const map = new Map<string, ColumnDefDirective>();
    this.templates.forEach((t) => map.set(t.appColumnDef(), t));
    this.tplMap.set(map);

    const hmap = new Map<string, ColumnHeaderDefDirective>();
    this.headerTemplates.forEach((t) => hmap.set(t.appColumnHeaderDef(), t));
    this.headerTplMap.set(hmap);
  }

  templateFor(key: string): ColumnDefDirective | undefined {
    return this.tplMap().get(key);
  }

  headerTemplateFor(key: string): ColumnHeaderDefDirective | undefined {
    return this.headerTplMap().get(key);
  }

  cellValue(col: TableColumn, row: T): string {
    return col.value ? col.value(row) : ((row as Record<string, unknown>)[col.key] as string) ?? '';
  }

  onSort(sort: Sort): void {
    this.sortState.set(sort);
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
  }
}
