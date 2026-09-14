import { DEFAULT_TIME_ZONE } from './timeZone';

/**
 * Fallback wall-clock timezone for cook call-availability minute-of-day windows
 * when a cook's `Users.timeZone` is unavailable. Prefer the cook's persisted zone.
 */
export const COOK_CALL_AVAILABILITY_TIME_ZONE = DEFAULT_TIME_ZONE;

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

export interface DerivedCallSlot {
    startAt: Date;
    endAt: Date;
}

interface MinuteWindow {
    start: number;
    end: number;
}

interface BookingInterval {
    start: number;
    end: number;
}

type RuleInput = {
    dayOfWeek: number;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
};

type ExceptionInput = {
    date: string;
    type: 'BLOCK' | 'OPEN';
    startMinuteOfDay: number | null;
    endMinuteOfDay: number | null;
};

type BookingInput = {
    startAt: Date;
    endAt: Date;
    status: string;
};

function toWindow(start: number | null, end: number | null): MinuteWindow {
    return {
        start: start ?? 0,
        end: end ?? MINUTES_PER_DAY,
    };
}

function mergeWindows(windows: MinuteWindow[]): MinuteWindow[] {
    if (windows.length === 0) {
        return [];
    }
    const sorted = [...windows].sort((left, right) => left.start - right.start);
    const merged: MinuteWindow[] = [{ ...sorted[0]! }];
    for (let index = 1; index < sorted.length; index += 1) {
        const tail = merged[merged.length - 1]!;
        const next = sorted[index]!;
        if (next.start <= tail.end) {
            tail.end = Math.max(tail.end, next.end);
        } else {
            merged.push({ ...next });
        }
    }
    return merged;
}

function subtractWindow(windows: MinuteWindow[], cut: MinuteWindow): MinuteWindow[] {
    const result: MinuteWindow[] = [];
    for (const window of windows) {
        const isDisjoint = cut.end <= window.start || cut.start >= window.end;
        if (isDisjoint) {
            result.push(window);
        } else {
            if (cut.start > window.start) {
                result.push({ start: window.start, end: cut.start });
            }
            if (cut.end < window.end) {
                result.push({ start: cut.end, end: window.end });
            }
        }
    }
    return result;
}

/** Calendar date `YYYY-MM-DD` for `instant` in `timeZone`. */
function calendarDateInTimeZone(instant: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(instant);
}

/**
 * UTC instant of local midnight for `YYYY-MM-DD` in `timeZone`.
 * Uses a binary search over UTC candidates (handles DST).
 */
export function zonedMidnightToUtc(isoDate: string, timeZone: string): Date {
    const [yearString, monthString, dayString] = isoDate.split('-');
    const year = Number(yearString);
    const month = Number(monthString);
    const day = Number(dayString);
    // Midday UTC guess for the civil date, then walk to local midnight.
    let low = Date.UTC(year, month - 1, day, 0, 0, 0) - 14 * 60 * MS_PER_MINUTE;
    let high = Date.UTC(year, month - 1, day, 0, 0, 0) + 14 * 60 * MS_PER_MINUTE;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const midDate = calendarDateInTimeZone(new Date(mid), timeZone);
        if (midDate < isoDate) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return new Date(low);
}

function dayOfWeekInTimeZone(instant: Date, timeZone: string): number {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[weekday] ?? 0;
}

function addCalendarDays(isoDate: string, days: number): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const utc = new Date(Date.UTC(y!, m! - 1, d! + days));
    const yearString = utc.getUTCFullYear().toString().padStart(4, '0');
    const monthString = (utc.getUTCMonth() + 1).toString().padStart(2, '0');
    const dayString = utc.getUTCDate().toString().padStart(2, '0');
    return `${yearString}-${monthString}-${dayString}`;
}

function overlapsAny(start: number, end: number, intervals: BookingInterval[]): boolean {
    for (const interval of intervals) {
        if (start < interval.end && end > interval.start) {
            return true;
        }
    }
    return false;
}

function groupRulesByDay(rules: RuleInput[]): Map<number, MinuteWindow[]> {
    const rulesByDay = new Map<number, MinuteWindow[]>();
    for (const rule of rules) {
        if (rule.startMinuteOfDay < rule.endMinuteOfDay) {
            const list = rulesByDay.get(rule.dayOfWeek) ?? [];
            list.push({ start: rule.startMinuteOfDay, end: rule.endMinuteOfDay });
            rulesByDay.set(rule.dayOfWeek, list);
        }
    }
    return rulesByDay;
}

function groupExceptionsByDate(exceptions: ExceptionInput[]): Map<string, ExceptionInput[]> {
    const exceptionsByDate = new Map<string, ExceptionInput[]>();
    for (const exception of exceptions) {
        const key = exception.date.slice(0, 10);
        const list = exceptionsByDate.get(key) ?? [];
        list.push(exception);
        exceptionsByDate.set(key, list);
    }
    return exceptionsByDate;
}

function activeBookingIntervals(bookings: BookingInput[]): BookingInterval[] {
    return bookings
        .filter((booking) => booking.status === 'PENDING' || booking.status === 'CONFIRMED')
        .map((booking) => ({ start: booking.startAt.getTime(), end: booking.endAt.getTime() }));
}

function applyExceptionsToWindows(initialWindows: MinuteWindow[], dayExceptions: ExceptionInput[]): MinuteWindow[] {
    const opens = dayExceptions.filter((exception) => exception.type === 'OPEN');
    const blocks = dayExceptions.filter((exception) => exception.type === 'BLOCK');

    let windows = initialWindows;
    if (opens.length > 0) {
        const openWindows = opens.map((exception) => toWindow(exception.startMinuteOfDay, exception.endMinuteOfDay));
        windows = mergeWindows([...windows, ...openWindows]);
    }
    for (const block of blocks) {
        windows = subtractWindow(windows, toWindow(block.startMinuteOfDay, block.endMinuteOfDay));
    }
    return windows;
}

function sliceWindowToSlots(args: {
    window: MinuteWindow;
    dayStartMs: number;
    callDurationMinutes: number;
    from: Date;
    to: Date;
    now: Date;
    activeBookings: BookingInterval[];
}): DerivedCallSlot[] {
    const { window, dayStartMs, callDurationMinutes, from, to, now, activeBookings } = args;
    const slots: DerivedCallSlot[] = [];
    for (let minute = window.start; minute + callDurationMinutes <= window.end; minute += callDurationMinutes) {
        const startAt = new Date(dayStartMs + minute * MS_PER_MINUTE);
        const endAt = new Date(startAt.getTime() + callDurationMinutes * MS_PER_MINUTE);
        const inPast = startAt < now;
        const outOfRange = startAt < from || endAt > to;
        const collides = overlapsAny(startAt.getTime(), endAt.getTime(), activeBookings);
        if (!inPast && !outOfRange && !collides) {
            slots.push({ startAt, endAt });
        }
    }
    return slots;
}

/**
 * Derive bookable call slots for a cook in `[from, to)`.
 *
 * Minute-of-day rules/exceptions are interpreted in {@link COOK_CALL_AVAILABILITY_TIME_ZONE}
 * (Europe/Berlin). Returned `startAt` / `endAt` are absolute UTC instants.
 */
export function deriveCookCallSlots(args: {
    callDurationMinutes: number;
    rules: RuleInput[];
    exceptions: ExceptionInput[];
    bookings: BookingInput[];
    from: Date;
    to: Date;
    now?: Date;
    timeZone?: string;
}): DerivedCallSlot[] {
    const { callDurationMinutes, rules, exceptions, bookings, from, to } = args;
    const now = args.now ?? new Date();
    const timeZone = args.timeZone ?? COOK_CALL_AVAILABILITY_TIME_ZONE;

    if (callDurationMinutes <= 0 || from >= to) {
        return [];
    }

    const rulesByDay = groupRulesByDay(rules);
    const exceptionsByDate = groupExceptionsByDate(exceptions);
    const activeBookings = activeBookingIntervals(bookings);

    const slots: DerivedCallSlot[] = [];

    let dateKey = calendarDateInTimeZone(from, timeZone);
    const lastDateKey = calendarDateInTimeZone(new Date(to.getTime() - 1), timeZone);

    while (dateKey <= lastDateKey) {
        const dayStart = zonedMidnightToUtc(dateKey, timeZone);
        const dayOfWeek = dayOfWeekInTimeZone(dayStart, timeZone);

        const baseWindows = mergeWindows(rulesByDay.get(dayOfWeek) ?? []);
        const dayExceptions = exceptionsByDate.get(dateKey) ?? [];
        const windows = applyExceptionsToWindows(baseWindows, dayExceptions);

        const dayStartMs = dayStart.getTime();
        for (const window of windows) {
            slots.push(...sliceWindowToSlots({ window, dayStartMs, callDurationMinutes, from, to, now, activeBookings }));
        }

        dateKey = addCalendarDays(dateKey, 1);
    }

    return slots;
}
