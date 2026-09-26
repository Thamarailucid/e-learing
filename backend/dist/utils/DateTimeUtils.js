"use strict";
/**
 * DateTimeUtils
 * Backend Date and Timezone conversion utilities.
 * Ensures strict UTC persistence and bi-directional UTC <-> IST/Local conversions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateTimeUtils = void 0;
class DateTimeUtils {
    /**
     * Converts any date/time input to a strict UTC ISO-8601 string (e.g. 2026-09-11T09:05:00.000Z)
     */
    static toUtcIsoString(dateInput) {
        if (!dateInput) {
            return new Date().toISOString();
        }
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) {
            return new Date().toISOString();
        }
        return d.toISOString();
    }
    /**
     * Returns current Date in UTC
     */
    static getCurrentUtcDate() {
        return new Date();
    }
    /**
     * Returns time string in UTC: HH:MM:SS
     */
    static formatTimeUtc(dateInput) {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime()))
            return '00:00:00';
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    /**
     * Converts a UTC timestamp directly to Indian Standard Time (IST, UTC+05:30)
     * Format: DD-MM-YYYY HH:mm:ss (IST) or HH:mm:ss
     */
    static formatUtcToIst(utcDate, includeSeconds = true) {
        if (!utcDate)
            return 'N/A';
        const d = new Date(utcDate);
        if (isNaN(d.getTime()))
            return 'Invalid Date';
        // IST is UTC + 5 hours 30 minutes = +330 minutes
        const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
        const istTime = new Date(d.getTime() + istOffsetMs);
        const day = String(istTime.getUTCDate()).padStart(2, '0');
        const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
        const year = istTime.getUTCFullYear();
        const hours = String(istTime.getUTCHours()).padStart(2, '0');
        const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');
        if (includeSeconds) {
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (IST)`;
        }
        return `${day}-${month}-${year} ${hours}:${minutes} (IST)`;
    }
    /**
     * Converts UTC date to a specified offset in minutes (e.g. +330 for +05:30, -300 for -05:00)
     */
    static convertUtcToOffset(utcDate, offsetMinutes) {
        const d = new Date(utcDate);
        const targetTime = new Date(d.getTime() + offsetMinutes * 60 * 1000);
        const day = String(targetTime.getUTCDate()).padStart(2, '0');
        const month = String(targetTime.getUTCMonth() + 1).padStart(2, '0');
        const year = targetTime.getUTCFullYear();
        const hours = String(targetTime.getUTCHours()).padStart(2, '0');
        const minutes = String(targetTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(targetTime.getUTCSeconds()).padStart(2, '0');
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const absMinutes = Math.abs(offsetMinutes);
        const offsetH = String(Math.floor(absMinutes / 60)).padStart(2, '0');
        const offsetM = String(absMinutes % 60).padStart(2, '0');
        const tzLabel = `UTC${sign}${offsetH}:${offsetM}`;
        return {
            formatted: `${day}-${month}-${year} ${hours}:${minutes}:${seconds} (${tzLabel})`,
            date: targetTime,
        };
    }
    /**
     * Returns start-of-day and end-of-day in UTC ISO string for a given date
     * Ideal for filtering database records between startOfDayUtc and endOfDayUtc
     */
    static getUtcDayRange(dateInput) {
        const base = dateInput ? new Date(dateInput) : new Date();
        const year = base.getUTCFullYear();
        const month = base.getUTCMonth();
        const date = base.getUTCDate();
        const start = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
        return {
            startOfDayUtc: start.toISOString(),
            endOfDayUtc: end.toISOString(),
        };
    }
}
exports.DateTimeUtils = DateTimeUtils;
