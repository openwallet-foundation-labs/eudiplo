import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { formatDate } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { ActivityBucket } from '../dashboard.service';

/** Stacked columns of the outcome of the sessions created in each day or hour. */
@Component({
  selector: 'app-activity-chart',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './activity-chart.component.html',
  styleUrl: './activity-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  @Input({ required: true }) buckets: ActivityBucket[] = [];
  @Input({ required: true }) unit: 'day' | 'hour' = 'day';
  /** The whole window, for example "7 days". */
  @Input({ required: true }) windowLabel = '';

  get maxTotal(): number {
    return Math.max(0, ...this.buckets.map((bucket) => bucket.total));
  }

  /** Column height relative to the busiest bucket. */
  heightOf(bucket: ActivityBucket): number {
    return this.maxTotal === 0 ? 0 : (bucket.total / this.maxTotal) * 100;
  }

  /** Axis label; hourly charts label every third hour to stay readable. */
  axisLabel(bucket: ActivityBucket, index: number): string {
    if (this.unit === 'day') return formatDate(bucket.start, 'EEE d', 'en-US');
    return index % 3 === 0 ? formatDate(bucket.start, 'HH', 'en-US') : '';
  }

  /** Full name of the bucket, for the tooltip and the table. */
  bucketName(bucket: ActivityBucket): string {
    return this.unit === 'day'
      ? formatDate(bucket.start, 'EEE d MMM', 'en-US')
      : formatDate(bucket.start, 'EEE d MMM, HH:mm', 'en-US');
  }

  describe(bucket: ActivityBucket): string {
    return `${this.bucketName(bucket)}: ${bucket.total} ${bucket.total === 1 ? 'session' : 'sessions'}, ${bucket.completed} completed, ${bucket.notCompleted} not completed, ${bucket.failed} failed`;
  }
}
