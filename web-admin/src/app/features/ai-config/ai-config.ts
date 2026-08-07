import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LlmApi } from '../../core/api/llm.api';
import { LlmConfigDto } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';

/**
 * Trang cấu hình AI: chọn chạy model ONLINE (OpenRouter cloud) hay OFFLINE
 * (Ollama local), đổi model từng chế độ, kiểm tra kết nối. Áp dụng ngay
 * không cần restart backend.
 */
@Component({
  selector: 'app-ai-config',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatProgressBarModule,
    MatTooltipModule,
    PageHeader,
  ],
  templateUrl: './ai-config.html',
  styleUrl: './ai-config.scss',
})
export class AiConfig {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LlmApi);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly testing = signal<'online' | 'offline' | null>(null);
  readonly config = signal<LlmConfigDto | null>(null);
  readonly testResult = signal<{ mode: string; ok: boolean; message: string } | null>(null);

  readonly form = this.fb.nonNullable.group({
    mode: ['online' as 'online' | 'offline', Validators.required],
    onlineModel: [''],
    onlineFallbackModels: [''],
    offlineBaseUrl: ['http://localhost:11434'],
    offlineModel: ['qwen2.5:7b-instruct'],
    offlineTimeoutSeconds: [120, [Validators.min(10), Validators.max(600)]],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.form.patchValue({
          mode: cfg.mode,
          onlineModel: cfg.onlineModel ?? cfg.effective.model,
          onlineFallbackModels: (cfg.onlineFallbackModels ?? cfg.effective.fallbackModels ?? []).join('\n'),
          offlineBaseUrl: cfg.offlineBaseUrl ?? 'http://localhost:11434',
          offlineModel: cfg.offlineModel ?? 'qwen2.5:7b-instruct',
          offlineTimeoutSeconds: cfg.offlineTimeoutSeconds ?? 120,
        });
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được cấu hình AI');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .update({
        mode: v.mode,
        onlineModel: v.onlineModel.trim() || null,
        onlineFallbackModels: v.onlineFallbackModels
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        offlineBaseUrl: v.offlineBaseUrl.trim() || null,
        offlineModel: v.offlineModel.trim() || null,
        offlineTimeoutSeconds: v.offlineTimeoutSeconds || null,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(res.message);
          this.saving.set(false);
          this.testResult.set(null);
          this.load();
        },
        error: (e) => {
          this.notify.error(e?.error?.message ?? 'Không lưu được cấu hình');
          this.saving.set(false);
        },
      });
  }

  test(mode: 'online' | 'offline'): void {
    this.testing.set(mode);
    this.testResult.set(null);
    this.api.test(mode).subscribe({
      next: (r) => {
        this.testResult.set({ mode, ok: r.ok, message: r.message });
        this.testing.set(null);
      },
      error: () => {
        this.testResult.set({ mode, ok: false, message: 'Không gọi được API kiểm tra.' });
        this.testing.set(null);
      },
    });
  }
}
