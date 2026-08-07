import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Trang 403 - không đủ quyền. */
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="err-page">
      <div class="code">403</div>
      <mat-icon class="big">block</mat-icon>
      <h1>Không có quyền truy cập</h1>
      <p>Bạn không đủ quyền để xem trang này. Liên hệ quản trị viên nếu cần cấp quyền.</p>
      <button [matButton]="'filled'" color="primary" routerLink="/dashboard">
        <mat-icon>home</mat-icon> Về trang tổng quan
      </button>
    </div>
  `,
  styleUrl: './error-page.scss',
})
export class Forbidden {}
