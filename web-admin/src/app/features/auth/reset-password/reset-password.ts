import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth.service';
import { NotificationService } from '../../../core/notification.service';

/** Trang đặt lại mật khẩu bằng token. */
@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly hide = signal(true);

  readonly form = this.fb.nonNullable.group(
    {
      email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
      token: [this.route.snapshot.queryParamMap.get('token') ?? '', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [matchPasswords] },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, token, newPassword } = this.form.getRawValue();
    this.auth.resetPassword({ email, token, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Token không hợp lệ hoặc đã hết hạn.');
      },
    });
  }
}

/** Validator xác nhận mật khẩu khớp. */
function matchPasswords(group: AbstractControl): Record<string, boolean> | null {
  const pw = group.get('newPassword')?.value;
  const cf = group.get('confirmPassword')?.value;
  return pw && cf && pw !== cf ? { mismatch: true } : null;
}
