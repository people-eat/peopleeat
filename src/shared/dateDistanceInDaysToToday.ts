import { dateDistanceInDays } from './dateDistanceInDays';

/** Calendar days from today to `date` in `timeZone` (negative if `date` is in the past). */
export function dateDistanceInDaysToToday(date: Date, timeZone: string): number {
    return dateDistanceInDays(date, new Date(), timeZone);
}
