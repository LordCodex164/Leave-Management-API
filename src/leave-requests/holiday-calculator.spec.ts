import { HolidayCalculator } from './holiday-calculator';

describe('HolidayCalculator', () => {
  describe('parseDate', () => {
    it('should parse valid YYYY-MM-DD date in UTC', () => {
      const date = HolidayCalculator.parseDate('2026-06-01');
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(5); // 0-indexed, so June is 5
      expect(date.getUTCDate()).toBe(1);
    });

    it('should throw error for invalid format', () => {
      expect(() => HolidayCalculator.parseDate('2026/06/01')).toThrow();
      expect(() => HolidayCalculator.parseDate('abc')).toThrow();
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday and Sunday', () => {
      const sat = HolidayCalculator.parseDate('2026-06-06'); // Saturday
      const sun = HolidayCalculator.parseDate('2026-06-07'); // Sunday
      expect(HolidayCalculator.isWeekend(sat)).toBe(true);
      expect(HolidayCalculator.isWeekend(sun)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const mon = HolidayCalculator.parseDate('2026-06-01'); // Monday
      const fri = HolidayCalculator.parseDate('2026-06-05'); // Friday
      expect(HolidayCalculator.isWeekend(mon)).toBe(false);
      expect(HolidayCalculator.isWeekend(fri)).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should calculate correct working days in a week without holidays', () => {
      const holidayDates = new Set<string>();
      // 2026-06-01 (Mon) to 2026-06-05 (Fri) -> 5 working days
      const days = HolidayCalculator.calculateWorkingDays(
        '2026-06-01',
        '2026-06-05',
        holidayDates,
      );
      expect(days).toBe(5);
    });

    it('should exclude weekends', () => {
      const holidayDates = new Set<string>();
      // 2026-05-30 (Sat) to 2026-06-08 (Mon) -> includes Sat/Sun (30/31), Sat/Sun (6/7)
      // Days counted: June 1, 2, 3, 4, 5, 8 -> 6 working days
      const days = HolidayCalculator.calculateWorkingDays(
        '2026-05-30',
        '2026-06-08',
        holidayDates,
      );
      expect(days).toBe(6);
    });

    it('should exclude public holidays', () => {
      // 2026-06-01 (Mon) to 2026-06-05 (Fri)
      // If Wed (June 3) is a holiday -> 4 working days
      const holidayDates = new Set<string>(['2026-06-03']);
      const days = HolidayCalculator.calculateWorkingDays(
        '2026-06-01',
        '2026-06-05',
        holidayDates,
      );
      expect(days).toBe(4);
    });

    it('should return 0 if range contains only weekends and holidays', () => {
      const holidayDates = new Set<string>(['2026-06-03']);
      const days = HolidayCalculator.calculateWorkingDays(
        '2026-06-06', // Saturday
        '2026-06-07', // Sunday
        holidayDates,
      );
      expect(days).toBe(0);
    });

    it('should throw error if startDate is after endDate', () => {
      expect(() =>
        HolidayCalculator.calculateWorkingDays('2026-06-05', '2026-06-01', new Set()),
      ).toThrow();
    });
  });
});
