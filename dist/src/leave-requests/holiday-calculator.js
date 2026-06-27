"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayCalculator = void 0;
class HolidayCalculator {
    static parseDate(dateStr) {
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
    static formatDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    static isWeekend(date) {
        const day = date.getUTCDay();
        return day === 0 || day === 6;
    }
    static calculateWorkingDays(startDateStr, endDateStr, holidayDates) {
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
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return workingDays;
    }
}
exports.HolidayCalculator = HolidayCalculator;
//# sourceMappingURL=holiday-calculator.js.map