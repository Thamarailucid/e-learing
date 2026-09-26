import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * DateTimeUtils
 * Provides bidirectional UTC <-> Local Browser Time conversions,
 * ensuring all database/API payloads strictly conform to UTC with HH:mm:ss precision.
 */
export const DateTimeUtils = {
  /**
   * Converts any date input (local Date, Dayjs, string, timestamp) to a standard UTC ISO string.
   * Use this whenever sending dates, times, or filter values to the backend.
   */
  toUtcIso(dateInput?: string | number | Date | Dayjs | null): string {
    if (!dateInput) return dayjs().utc().toISOString();
    return dayjs(dateInput).utc().toISOString();
  },

  /**
   * Formats a UTC timestamp from the backend into the user's browser local timezone.
   * Default format: "DD-MM-YYYY HH:mm:ss"
   */
  formatLocal(
    utcDateStr?: string | Date | null,
    formatStr: string = 'DD-MM-YYYY HH:mm:ss'
  ): string {
    if (!utcDateStr) return 'N/A';
    const parsed = dayjs.utc(utcDateStr);
    if (!parsed.isValid()) return 'Invalid Date';
    return parsed.local().format(formatStr);
  },

  /**
   * Extracts formatted time (HH:mm:ss) from UTC input converted to target timezone.
   */
  formatTimeOnly(
    dateInput?: string | Date | null,
    targetZone: 'local' | 'utc' = 'local'
  ): string {
    if (!dateInput) return '00:00:00';
    const parsed = dayjs.utc(dateInput);
    if (!parsed.isValid()) return '00:00:00';

    if (targetZone === 'utc') {
      return parsed.format('HH:mm:ss');
    }
    return parsed.local().format('HH:mm:ss');
  },

  /**
   * Formats UTC timestamp in a concise, friendly display (e.g. "22 Sep 2026, 02:45 PM")
   * using the user's local timezone.
   */
  formatFriendlyLocal(utcDateStr?: string | Date | null): string {
    if (!utcDateStr) return 'Never';
    const parsed = dayjs.utc(utcDateStr);
    if (!parsed.isValid()) return 'N/A';
    return parsed.local().format('DD MMM YYYY, hh:mm:ss A');
  },

  /**
   * Converts frontend DatePicker / RangePicker selections into UTC Start-of-Day and End-of-Day
   * payload objects for API queries.
   */
  getUtcDateFilterPayload(
    startDate?: Dayjs | string | null,
    endDate?: Dayjs | string | null
  ): { startDateUtc?: string; endDateUtc?: string } {
    const payload: { startDateUtc?: string; endDateUtc?: string } = {};

    if (startDate) {
      payload.startDateUtc = dayjs(startDate).startOf('day').utc().toISOString();
    }
    if (endDate) {
      payload.endDateUtc = dayjs(endDate).endOf('day').utc().toISOString();
    }

    return payload;
  },
};

// Direct export helpers for clean inline consumption
export const toUtcIso = DateTimeUtils.toUtcIso;
export const formatLocal = DateTimeUtils.formatLocal;
export const formatTimeOnly = DateTimeUtils.formatTimeOnly;
export const formatFriendlyLocal = DateTimeUtils.formatFriendlyLocal;
