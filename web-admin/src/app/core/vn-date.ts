import { Injectable, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter,
  type MatDateFormats,
} from '@angular/material/core';

/**
 * Định dạng ngày theo lối Việt Nam: 05/08/2026.
 *
 * Adapter mặc định của Material dựa vào Intl nên ra "5/8/2026" (thiếu số 0) hoặc
 * "8/5/2026" (kiểu Mỹ) tùy locale trình duyệt, và khi người dùng GÕ tay thì
 * `Date.parse("05/08/2026")` lại hiểu là tháng 5 ngày 8 - sai lặng lẽ, nguy hiểm
 * hơn cả hiển thị sai. Vì vậy tự đọc và tự in chuỗi dd/MM/yyyy, không nhờ Intl.
 */
const DATE_INPUT = 'dd/MM/yyyy';

/** Chấp nhận 5/8/2026, 05/08/2026, 05-08-2026, 05.08.2026. */
const TYPED = /^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/;

const pad2 = (n: number) => `${n}`.padStart(2, '0');

@Injectable()
export class VnDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value !== 'string') return super.parse(value, parseFormat);

    const text = value.trim();
    if (!text) return null;

    const m = TYPED.exec(text);
    if (!m) return this.invalid();

    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);

    const date = new Date(year, month - 1, day);
    // JS tự "cuộn" ngày sai sang tháng sau (31/02 -> 03/03). So lại từng thành
    // phần để bắt đúng những ngày không tồn tại thay vì âm thầm đổi ngày.
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return this.invalid();
    }
    return date;
  }

  override format(date: Date, displayFormat: unknown): string {
    if (displayFormat === DATE_INPUT && this.isValid(date)) {
      return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat as object);
  }
}

export const VN_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: DATE_INPUT },
  display: {
    dateInput: DATE_INPUT,
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

/**
 * Khai ở app.config để MỌI datepicker trong web-admin dùng chung một kiểu ngày.
 * Component nào tự khai `provideNativeDateAdapter()` hay import `MatNativeDateModule`
 * sẽ che mất provider này - đó chính là lỗi từng gặp ở màn hình Hợp đồng.
 */
export function provideVnDate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: DateAdapter, useClass: VnDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VN_DATE_FORMATS },
  ]);
}
