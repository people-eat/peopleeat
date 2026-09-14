import { toLocalCalendarDate } from './toLocalCalendarDate';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

/** Calendar days from `date1` to `date2` in `timeZone` (negative if date1 is before date2). */
export function dateDistanceInDays(date1: Date, date2: Date, timeZone: string): number {
    const local1 = toLocalCalendarDate(date1, timeZone);
    const local2 = toLocalCalendarDate(date2, timeZone);
    return Math.round((local1.getTime() - local2.getTime()) / MS_IN_DAY);
}
