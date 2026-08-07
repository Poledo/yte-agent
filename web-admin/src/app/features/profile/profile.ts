import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';

/** Trang hồ sơ cá nhân + đổi mật khẩu. */
@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    PageHeader,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  readonly user = this.auth.currentUser;
  readonly saving = signal(false);
  readonly hideCur = signal(true);
  readonly hideNew = signal(true);

  readonly initials = () => {
    const name = this.user()?.fullName ?? this.user()?.email ?? '';
    return name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  };

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [matchPasswords] },
  );

  changePassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Đổi mật khẩu thành công');
        this.form.reset();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.error?.message ?? 'Mật khẩu hiện tại không đúng');
      },
    });
  }
}

function matchPasswords(group: AbstractControl): Record<string, boolean> | null {
  const pw = group.get('newPassword')?.value;
  const cf = group.get('confirmPassword')?.value;
  return pw && cf && pw !== cf ? { mismatch: true } : null;
}
