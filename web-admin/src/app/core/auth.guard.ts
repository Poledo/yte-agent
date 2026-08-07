import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenStore } from './token.store';

/** Chặn truy cập khi chưa đăng nhập -> chuyển /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tokens = inject(TokenStore);
  const router = inject(Router);

  // Còn token (F5) coi như đã đăng nhập; /me sẽ nạp lại thông tin sau
  if (auth.isAuthenticated() || tokens.accessToken) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
