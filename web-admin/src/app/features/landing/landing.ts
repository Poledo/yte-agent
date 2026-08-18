import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

/**
 * Trang giới thiệu ("/gioi-thieu-du-an") — nhúng bản trình chiếu tĩnh public/gioi-thieu.html
 * và phủ hàng menu nổi góc trên phải (Đăng nhập / Trang quản trị).
 * Không cần đăng nhập; vào khu quản trị sẽ qua authGuard như cũ.
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly auth = inject(AuthService);

  /** Đã đăng nhập → chỉ hiện nút vào trang quản trị. */
  readonly loggedIn = computed(() => this.auth.isAuthenticated());
}
