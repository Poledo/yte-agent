import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog/confirm-dialog';

/** Mở confirm dialog và trả về Observable<boolean>. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  open(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialog, { data, width: '420px', autoFocus: false })
      .afterClosed();
  }
}
