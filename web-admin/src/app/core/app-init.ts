import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStore } from './token.store';

/**
 * Khi khởi động, nếu còn access token thì gọi /me để nạp lại thông tin user
 * (giữ phiên khi F5). Lỗi thì bỏ qua để interceptor/guard xử lý sau.
 */
export function provideAuthBootstrap() {
  return provideAppInitializer(async () => {
    const tokens = inject(TokenStore);
    const auth = inject(AuthService);
    if (!tokens.accessToken) return;
    try {
      await firstValueFrom(auth.loadMe());
    } catch {
      // Token hỏng/hết hạn: xóa phiên, để guard chuyển về /login
      auth.clearSession();
    }
  });
}
