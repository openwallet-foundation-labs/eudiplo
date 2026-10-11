import { fromDay, lastDays, lastHours, toDay } from './local-day';

describe('local days', () => {
  it('formats and parses a local calendar day', () => {
    expect(toDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(fromDay('2026-01-05')).toEqual(new Date(2026, 0, 5));
    expect(fromDay('5.1.2026')).toBeNull();
  });

  it('counts the last days back from today, oldest first', () => {
    const days = lastDays(3, new Date(2026, 9, 11, 15, 30));

    expect(days).toEqual([new Date(2026, 9, 9), new Date(2026, 9, 10), new Date(2026, 9, 11)]);
  });

  it('counts the last hours back from the current hour, across midnight', () => {
    const hours = lastHours(3, new Date(2026, 9, 11, 1, 30));

    expect(hours).toEqual([
      new Date(2026, 9, 10, 23),
      new Date(2026, 9, 11, 0),
      new Date(2026, 9, 11, 1),
    ]);
  });

  describe('when clocks change', () => {
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
      .process.env;
    let timeZone: string | undefined;

    beforeEach(() => {
      timeZone = env['TZ'];
      env['TZ'] = 'Europe/Berlin';
    });

    afterEach(() => {
      if (timeZone === undefined) delete env['TZ'];
      else env['TZ'] = timeZone;
    });

    it('counts each real hour once when clocks move forward', () => {
      // 2:00 does not exist in Berlin on 29 March 2026.
      const hours = lastHours(24, new Date(2026, 2, 29, 10, 30));

      expect(new Set(hours.map(Number)).size).toBe(24);
      expect(hours.at(-1)).toEqual(new Date(2026, 2, 29, 10));
      expect(hours.slice(1).every((hour, index) => +hour - +hours[index] === 3_600_000)).toBe(true);
    });
  });
});
