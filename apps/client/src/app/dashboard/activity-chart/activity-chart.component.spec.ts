import { TestBed } from '@angular/core/testing';

import type { ActivityBucket } from '../dashboard.service';
import { ActivityChartComponent } from './activity-chart.component';

const bucket = (start: Date, completed: number, failed: number, notCompleted: number) => ({
  start,
  total: completed + failed + notCompleted,
  completed,
  failed,
  notCompleted,
});
const day = (date: number, completed: number, failed: number, notCompleted: number) =>
  bucket(new Date(2026, 9, date), completed, failed, notCompleted);

describe('ActivityChartComponent', () => {
  function render(
    buckets: ActivityBucket[],
    unit: 'day' | 'hour' = 'day',
    windowLabel = '7 days'
  ): HTMLElement {
    const fixture = TestBed.createComponent(ActivityChartComponent);
    fixture.componentRef.setInput('buckets', buckets);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('windowLabel', windowLabel);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('scales each column to the busiest day and stacks its outcomes', () => {
    const page = render([day(10, 2, 1, 1), day(11, 6, 1, 1)]);

    const stacks = Array.from(page.querySelectorAll<HTMLElement>('.stack'));
    expect(stacks.map((stack) => stack.style.height)).toEqual(['50%', '100%']);
    expect(
      Array.from(stacks[0].querySelectorAll('.segment'), (segment) => segment.className)
    ).toEqual(['segment failed', 'segment not-completed', 'segment completed']);
    expect(Array.from(page.querySelectorAll('.total'), (total) => total.textContent)).toEqual([
      '4',
      '8',
    ]);
  });

  it('draws no stack and no empty segments for quiet days', () => {
    const page = render([day(10, 0, 0, 0), day(11, 3, 0, 0)]);

    const columns = page.querySelectorAll('.column');
    expect(columns[0].querySelector('.stack')).toBeNull();
    expect(columns[1].querySelectorAll('.segment')).toHaveLength(1);
  });

  it('gives every number to assistive technology in a table, not in tab stops', () => {
    const page = render([day(11, 6, 1, 2)]);

    expect(page.querySelector('.column')?.getAttribute('tabindex')).toBeNull();
    expect(page.querySelector('tbody th')?.textContent?.trim()).toBe('Sun 11 Oct');
    expect(
      Array.from(page.querySelectorAll('tbody td'), (cell) => cell.textContent?.trim())
    ).toEqual(['6', '2', '1', '9']);
  });

  it('labels every third hour of an hourly chart', () => {
    const hours = Array.from({ length: 6 }, (_, index) =>
      bucket(new Date(2026, 9, 11, 10 + index), 1, 0, 0)
    );

    const page = render(hours, 'hour', '6 hours');

    expect(Array.from(page.querySelectorAll('.axis span'), (label) => label.textContent)).toEqual([
      '10',
      '',
      '',
      '13',
      '',
      '',
    ]);
    expect(page.querySelector('caption')?.textContent?.trim()).toBe('Sessions per hour by outcome');
  });

  it('says so instead of drawing empty columns when there were no sessions', () => {
    const page = render([day(10, 0, 0, 0), day(11, 0, 0, 0)], 'hour', '24 hours');

    expect(page.querySelector('.plot')).toBeNull();
    expect(page.querySelector('.empty')?.textContent?.trim()).toBe(
      'No sessions created in the last 24 hours.'
    );
  });
});
