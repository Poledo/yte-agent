import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../core/auth.service';

/**
 * *appHasPermission="'User.Manage'" hoặc *appHasPermission="['User.Manage','Role.Manage']"
 * Ẩn phần tử nếu user không có quyền.
 */
@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  readonly appHasPermission = input<string | string[]>('');

  private visible = false;

  constructor() {
    effect(() => {
      const req = this.appHasPermission();
      const codes = Array.isArray(req) ? req : req ? [req] : [];
      // Đọc signal permissions để tự cập nhật khi đổi
      this.auth.permissions();
      const allowed = this.auth.hasAny(codes);
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
