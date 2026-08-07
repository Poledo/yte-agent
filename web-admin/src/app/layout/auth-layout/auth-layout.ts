import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Layout cho các trang xác thực (login, quên/đặt lại mật khẩu). */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <div class="bg-decoration">
        <span class="blob b1"></span>
        <span class="blob b2"></span>
        <span class="blob b3"></span>
      </div>
      <div class="brand">
        <div class="logo"></div>
        <div class="brand-text">
          <h1>ZeroCheck AI</h1>
          <p>Hệ thống quản trị</p>
        </div>
      </div>
      <div class="card-wrap">
        <router-outlet></router-outlet>
      </div>
      <p class="foot">© 2026 ZeroCheck AI · Trợ lý kiểm tra hồ sơ y tế</p>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
