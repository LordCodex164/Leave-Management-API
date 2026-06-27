export declare class HolidayCalculator {
    static parseDate(dateStr: string): Date;
    static formatDate(date: Date): string;
    static isWeekend(date: Date): boolean;
    static calculateWorkingDays(startDateStr: string, endDateStr: string, holidayDates: Set<string>): number;
}
