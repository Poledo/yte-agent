import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RobotConfigApi } from '../../core/api/robot-config.api';
import { ExtensionConfigDto, RobotRendererId, RobotStageThreshold } from '../../core/api/models';
import { NotificationService } from '../../core/notification.service';
import { PageHeader } from '../../shared/page-header/page-header';

/** Một hình hài robot chọn được (khớp ROBOT_RENDERERS của extension). */
interface RendererOption {
  id: RobotRendererId;
  name: string;
  desc: string;
  icon: string;
}

/** Một stage trong hệ sinh hoạt: nhãn tiếng Việt + mốc mặc định (ms). */
interface StageMeta {
  id: string;
  label: string;
  defaultMs: number;
}

/** Một nhóm stage để dựng bảng chỉnh ngưỡng. */
interface StageCategory {
  key: 'waitEscalation' | 'seasons' | 'aging';
  title: string;
  hint: string;
  stages: StageMeta[];
}

/**
 * Trang cấu hình robot trợ lý (task-003 §1.6 + Part 2): chọn 1 trong 3 hình hài
 * (Nút thường / Trợ lý động / Trợ lý 3D) và tinh chỉnh mốc thời gian hệ sinh hoạt. Extension nạp
 * cấu hình này qua GET /api/extension-config khi trang HIS tải xong.
 *
 * Nhãn/ngưỡng mặc định phản chiếu RobotLifeConfig của extension — nếu extension
 * đổi id stage, cập nhật danh mục ở đây; API tự bỏ id lạ nên không gây lỗi.
 */
@Component({
  selector: 'app-robot-config',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    PageHeader,
  ],
  templateUrl: './robot-config.html',
  styleUrl: './robot-config.scss',
})
export class RobotConfig {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RobotConfigApi);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  /** Ba hình hài (nguồn sự thật khớp extension). */
  readonly renderers: RendererOption[] = [
    {
      id: 'svg',
      name: 'Nút thường',
      desc: 'Chỉ nút tròn mở trợ lý — không robot',
      icon: 'smart_button',
    },
    {
      id: 'svgAnim',
      name: 'Trợ lý động',
      desc: 'Robot Pé Pi dễ thương — nhẹ, không cần tải model',
      icon: 'sentiment_very_satisfied',
    },
    {
      id: 'three',
      name: 'Trợ lý 3D',
      desc: 'Robot Pé Q 3D — tải riêng khi chọn, sinh động nhất',
      icon: 'view_in_ar',
    },
  ];

  /** Danh mục stage: nhãn + mốc mặc định (ms) phản chiếu RobotLifeConfig. */
  readonly categories: StageCategory[] = [
    {
      key: 'waitEscalation',
      title: 'Leo thang khi chờ AI',
      hint: 'Chờ càng lâu robot càng đổi hoạt động (giây kể từ lúc bắt đầu chờ).',
      stages: [
        { id: 'think', label: 'Suy nghĩ', defaultMs: 0 },
        { id: 'sit', label: 'Ngồi xuống', defaultMs: 3_000 },
        { id: 'magnifier', label: 'Lấy kính lúp', defaultMs: 10_000 },
        { id: 'tea', label: 'Uống trà', defaultMs: 20_000 },
        { id: 'read', label: 'Đọc sách', defaultMs: 40_000 },
        { id: 'meditate', label: 'Ngồi thiền', defaultMs: 60_000 },
        { id: 'fishing', label: 'Câu cá', defaultMs: 120_000 },
        { id: 'camp', label: 'Dựng lều', defaultMs: 300_000 },
        { id: 'campfire', label: 'Đốt lửa', defaultMs: 600_000 },
        { id: 'buildHouse', label: 'Dựng nhà', defaultMs: 1_200_000 },
        { id: 'aged', label: 'Già đi', defaultMs: 1_800_000 },
      ],
    },
    {
      key: 'seasons',
      title: 'Bốn mùa (chờ cực lâu)',
      hint: 'Nền đổi theo mùa khi chờ rất lâu (giây).',
      stages: [
        { id: 'spring', label: 'Mùa xuân', defaultMs: 0 },
        { id: 'summer', label: 'Mùa hè', defaultMs: 45_000 },
        { id: 'autumn', label: 'Mùa thu', defaultMs: 90_000 },
        { id: 'winter', label: 'Mùa đông', defaultMs: 135_000 },
      ],
    },
    {
      key: 'aging',
      title: 'Hoá già theo thời gian chờ',
      hint: 'Robot cũ/già dần khi chờ lâu (giây).',
      stages: [
        { id: 'dust', label: 'Bám bụi', defaultMs: 10_000 },
        { id: 'dustMore', label: 'Bụi nhiều hơn', defaultMs: 30_000 },
        { id: 'rust', label: 'Rỉ sét', defaultMs: 45_000 },
        { id: 'loose', label: 'Ốc vít lỏng', defaultMs: 60_000 },
        { id: 'grayHair', label: 'Đầu bạc', defaultMs: 90_000 },
        { id: 'cane', label: 'Chống gậy', defaultMs: 120_000 },
        { id: 'slow', label: 'Đi rất chậm', defaultMs: 150_000 },
        { id: 'elder', label: 'Thành ông lão', defaultMs: 180_000 },
      ],
    },
  ];

  /** Màu xanh VNPT mặc định — dùng khi không bật màu tuỳ chỉnh. */
  static readonly DEFAULT_COLOR = '#0068b3';
  /** Giới hạn độ dài data URL logo (khớp hạn 700K của backend, chừa biên) — ~500KB ảnh. */
  private static readonly MAX_LOGO_LEN = 690_000;

  /** Logo tuỳ chỉnh (data URL) — quản lý ngoài form vì đến từ tải tệp. */
  readonly logoDataUrl = signal<string | null>(null);
  /** Thông báo lỗi khi chọn logo (định dạng/kích thước). */
  readonly logoError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    robotRenderer: ['svg' as RobotRendererId, Validators.required],
    /** Bật: robot đổi hoạt động NGẪU NHIÊN theo thời gian ngẫu nhiên (thay leo thang cố định). */
    waitEscalationRandom: [false],
    waitEscalation: this.buildStageGroup('waitEscalation'),
    seasons: this.buildStageGroup('seasons'),
    aging: this.buildStageGroup('aging'),
    // --- Diện mạo robot 3D (chỉ áp cho hình hài "three") ---
    /** Bật màu thương hiệu tuỳ chỉnh; tắt → dùng xanh VNPT mặc định. */
    useCustomColor: [false],
    appearanceColor: [RobotConfig.DEFAULT_COLOR],
    /** Cỡ robot theo phần trăm (40–200). */
    appearanceScale: [100, [Validators.required, Validators.min(40), Validators.max(200)]],
    /** Hiện logo trên ngực robot (mặc định tắt; bật khi upload logo riêng). */
    appearanceShowLogo: [false],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get().subscribe({
      next: (cfg) => {
        this.form.controls.robotRenderer.setValue(cfg.robotRenderer);
        this.form.controls.waitEscalationRandom.setValue(cfg.life?.waitEscalationRandom ?? false);
        this.patchCategory('waitEscalation', cfg.life?.waitEscalation);
        this.patchCategory('seasons', cfg.life?.seasons);
        this.patchCategory('aging', cfg.life?.aging);
        this.patchAppearance(cfg.appearance);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Không tải được cấu hình robot');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body: ExtensionConfigDto = {
      robotRenderer: this.form.controls.robotRenderer.value,
      life: {
        waitEscalationRandom: this.form.controls.waitEscalationRandom.value,
        waitEscalation: this.collectCategory('waitEscalation'),
        seasons: this.collectCategory('seasons'),
        aging: this.collectCategory('aging'),
      },
      appearance: {
        color: this.form.controls.useCustomColor.value
          ? this.form.controls.appearanceColor.value
          : null,
        scale: this.form.controls.appearanceScale.value,
        showLogo: this.form.controls.appearanceShowLogo.value,
        logoDataUrl: this.logoDataUrl(),
      },
    };
    this.api.update(body).subscribe({
      next: (res) => {
        this.notify.success(res.message);
        this.saving.set(false);
      },
      error: (e) => {
        this.notify.error(e?.error?.message ?? 'Không lưu được cấu hình robot');
        this.saving.set(false);
      },
    });
  }

  /** Đưa mốc về mặc định của danh mục (chỉ đổi form, chưa lưu). */
  resetDefaults(): void {
    for (const cat of this.categories) {
      for (const stage of cat.stages) {
        this.form.controls[cat.key].controls[stage.id].setValue(this.toSeconds(stage.defaultMs));
      }
    }
  }

  /** Dựng FormGroup {[id]: giây} cho một nhóm stage, khởi tạo bằng mặc định. */
  private buildStageGroup(key: StageCategory['key']) {
    const stages = this.categories.find((c) => c.key === key)!.stages;
    const controls: Record<string, FormControl<number>> = {};
    for (const s of stages) {
      controls[s.id] = this.fb.nonNullable.control(this.toSeconds(s.defaultMs), [
        Validators.required,
        Validators.min(0),
      ]);
    }
    return this.fb.nonNullable.group(controls);
  }

  /** Áp override từ API (ms) lên form (giây); bỏ id không có trong danh mục. */
  private patchCategory(key: StageCategory['key'], overrides?: RobotStageThreshold[]): void {
    if (!overrides?.length) return;
    const group = this.form.controls[key];
    for (const o of overrides) {
      const control = group.controls[o.id];
      if (control) {
        control.setValue(this.toSeconds(o.atMs));
      }
    }
  }

  /** Áp diện mạo (màu/cỡ/logo) từ API lên form + signal logo. */
  private patchAppearance(ap?: ExtensionConfigDto['appearance']): void {
    this.form.controls.useCustomColor.setValue(!!ap?.color);
    this.form.controls.appearanceColor.setValue(ap?.color ?? RobotConfig.DEFAULT_COLOR);
    this.form.controls.appearanceScale.setValue(ap?.scale ?? 100);
    this.form.controls.appearanceShowLogo.setValue(ap?.showLogo ?? false);
    this.logoDataUrl.set(ap?.logoDataUrl ?? null);
    this.logoError.set(null);
  }

  /** Chọn tệp logo → đọc thành data URL (kiểm định dạng ảnh + kích thước) rồi lưu vào signal. */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoError.set(null);
    if (!file.type.startsWith('image/')) {
      this.logoError.set('Tệp phải là ảnh (PNG, JPG, SVG…).');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (url.length > RobotConfig.MAX_LOGO_LEN) {
        this.logoError.set('Logo quá lớn (tối đa ~500KB). Hãy chọn ảnh nhỏ hơn.');
      } else {
        this.logoDataUrl.set(url);
        this.form.controls.appearanceShowLogo.setValue(true);
      }
    };
    reader.onerror = () => this.logoError.set('Không đọc được tệp ảnh.');
    reader.readAsDataURL(file);
    input.value = ''; // cho phép chọn lại cùng tệp
  }

  /** Xoá logo tuỳ chỉnh → về logo VNPT mặc định. */
  clearLogo(): void {
    this.logoDataUrl.set(null);
    this.logoError.set(null);
  }

  /** Gom form (giây) của một nhóm về mảng override (ms). */
  private collectCategory(key: StageCategory['key']): RobotStageThreshold[] {
    const stages = this.categories.find((c) => c.key === key)!.stages;
    const group = this.form.controls[key];
    return stages.map((s) => ({ id: s.id, atMs: Math.round(group.controls[s.id].value * 1000) }));
  }

  private toSeconds(ms: number): number {
    return Math.round(ms / 1000);
  }
}
