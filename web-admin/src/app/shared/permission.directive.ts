import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../core/auth.service';

/**
 * Ẩn phần tử nếu user không có quyền.
 *
 * - `*appHasPermission="'Users.Create'"` - đúng một mã.
 * - `*appHasPermission="['Users.Create','Users.Update']"` - có MỘT trong số đó là hiện.
 * - `*appHasPermission="'Users.'; prefix: true"` - có BẤT KỲ quyền nào thuộc nhóm.
 *
 * Dạng tiền tố dành cho nút mở một màn hình con: mã quyền giờ mịn tới từng endpoint,
 * liệt kê hết mã của một màn hình vào template thì thêm API mới là template lại sai.
 *
 * Đây chỉ là lớp cho đỡ rối mắt, KHÔNG phải lớp bảo mật - máy chủ luôn kiểm lại.
 */
@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  readonly appHasPermission = input<string | string[]>('');
  readonly appHasPermissionPrefix = input(false);

  private visible = false;

  constructor() {
    effect(() => {
      const req = this.appHasPermission();
      const codes = Array.isArray(req) ? req : req ? [req] : [];
      const allowed = this.appHasPermissionPrefix()
        ? codes.some((c) => this.auth.hasModule(c))
        : this.auth.hasAny(codes);

      if (allowed && !this.visible) {
        this.vcr.createEmbeddedView(this.tpl);
        this.visible = true;
      } else if (!allowed && this.visible) {
        this.vcr.clear();
        this.visible = false;
      }
    });
  }
}
