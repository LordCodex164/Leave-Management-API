export class HolidayCalculator {
  /**
   * Parse a date string in YYYY-MM-DD format into a UTC Date object.
   * This avoids local timezone offset shift issues.
   */
  static parseDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(`Invalid date values in: ${dateStr}`);
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Format a UTC Date object into a YYYY-MM-DD string.
   */
  static formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if a given Date falls on a weekend (Saturday or Sunday).
   */
  static isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Calculate the number of working days between startDateStr and endDateStr (inclusive),
   * excluding weekends and any holidays present in the holidayDates set.
   */
  static calculateWorkingDays(
    startDateStr: string,
    endDateStr: string,
    holidayDates: Set<string>,
  ): number {
    if (startDateStr > endDateStr) {
      throw new Error(`startDate ${startDateStr} cannot be after endDate ${endDateStr}`);
    }

    const start = this.parseDate(startDateStr);
    const end = this.parseDate(endDateStr);

    let workingDays = 0;
    const current = new Date(start.getTime());

    while (current.getTime() <= end.getTime()) {
      const currentStr = this.formatDate(current);

      if (!this.isWeekend(current) && !holidayDates.has(currentStr)) {
        workingDays++;
      }

      // Add one day in UTC
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return workingDays;
  }
}
