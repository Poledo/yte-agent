import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatsApi, UsageEventDetail } from '../../../core/api/stats.api';

export interface ActivityDetailDialogData {
  id: number;
}

/** Nội dung một lượt hỏi đáp AI. */
interface AskDetail {
  question: string;
  answer: string;
  fromLlm: boolean;
  citations: { title: string; docNumber: string | null }[];
}

/** Một vấn đề trong kết quả kiểm tra. */
interface CheckIssue {
  ruleId: string;
  severity: string;
  group: string;
  table: string;
  field: string;
  row: number | null;
  message: string;
  suggestion: string | null;
  xuatToanRisk: boolean;
}

/** Nội dung một lượt kiểm tra XML 130. */
interface CheckDetail {
  maCskcb: string | null;
  hosoCount: number;
  totalIssues: number;
  xuatToanRisk: boolean;
  summary: string | null;
  aiAssessment: string | null;
  results: { maLk: string | null; issueCount: number; xuatToanRisk: boolean; issues: CheckIssue[] }[];
  crossIssues: { ruleId: string; severity: string; message: string; suggestion: string | null; xuatToanRisk: boolean }[];
}

/** Dialog xem lại nội dung phản hồi của một lượt trong Lịch sử hoạt động. */
@Component({
  selector: 'app-activity-detail-dialog',
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './activity-detail-dialog.html',
  styleUrl: './activity-detail-dialog.scss',
})
export class ActivityDetailDialog {
  private readonly api = inject(StatsApi);
  readonly data = inject<ActivityDetailDialogData>(MAT_DIALOG_DATA);

  readonly loading = signal(true);
  readonly detail = signal<UsageEventDetail | null>(null);
  readonly ask = signal<AskDetail | null>(null);
  readonly check = signal<CheckDetail | null>(null);
  readonly parseError = signal(false);

  constructor() {
    this.api.eventDetail(this.data.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.parsePayload(d);
        this.loading.set(false);
      },
      error: () => {
        this.parseError.set(true);
        this.loading.set(false);
      },
    });
  }

  severityLabel(s: string): string {
    return s === 'Error' ? 'LỖI' : s === 'Warning' ? 'CẢNH BÁO' : 'LƯU Ý';
  }

  private parsePayload(d: UsageEventDetail): void {
    if (!d.detailJson) return;
    try {
      const parsed = JSON.parse(d.detailJson);
      if (d.eventType === 'Ask') this.ask.set(parsed as AskDetail);
      else this.check.set(parsed as CheckDetail);
    } catch {
      this.parseError.set(true);
    }
  }
}
