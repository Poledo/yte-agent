import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard yêu cầu quyền. Route khai báo data.permissions = string[]
 * (chỉ cần có ÍT NHẤT một quyền trong danh sách).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const required = (route.data?.['permissions'] as string[] | undefined) ?? [];
  if (auth.hasAny(required)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};
