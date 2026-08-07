import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App {
  // Khởi tạo ThemeService để áp dụng dark mode ngay khi app chạy
  private readonly theme = inject(ThemeService);
}
