import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Trang 404. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="err-page">
      <div class="code">404</div>
      <mat-icon class="big">travel_explore</mat-icon>
      <h1>Không tìm thấy trang</h1>
      <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
      <button [matButton]="'filled'" color="primary" routerLink="/dashboard">
        <mat-icon>home</mat-icon> Về trang tổng quan
      </button>
    </div>
  `,
  styleUrl: '../forbidden/error-page.scss',
})
export class NotFound {}
