import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard yêu cầu quyền. Route khai báo MỘT trong hai:
 *
 * - `data.permissionPrefix` (string | string[]) - có BẤT KỲ quyền nào thuộc nhóm là
 *   vào được, vd `'Catalog.'`. Đây là dạng nên dùng: một màn hình gọi nhiều endpoint,
 *   gác đúng một mã thì người chỉ được xem sẽ không vào nổi màn hình xem.
 * - `data.permissions` (string[]) - cần ÍT NHẤT một mã trong danh sách. Dùng khi màn
 *   hình gom nhiều nhóm không cùng tiền tố.
 *
 * Không khai gì = chỉ cần đăng nhập (authGuard đã lo).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const rawPrefix = route.data?.['permissionPrefix'] as string | string[] | undefined;
  const prefixes = rawPrefix ? (Array.isArray(rawPrefix) ? rawPrefix : [rawPrefix]) : [];
  const codes = (route.data?.['permissions'] as string[] | undefined) ?? [];

  if (prefixes.length === 0 && codes.length === 0) {
    return true;
  }

  // codes rỗng phải là "không thỏa" chứ không phải "thỏa": hasAny([]) trả true, gọi
  // thẳng vào đây thì route chỉ gác bằng permissionPrefix sẽ mở toang cho mọi người.
  if (prefixes.some((p) => auth.hasModule(p)) || (codes.length > 0 && auth.hasAny(codes))) {
    return true;
  }

  return router.createUrlTree(['/forbidden']);
};
