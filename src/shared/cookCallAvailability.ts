/** Max recurring weekly windows a cook may define (server + UI). */
export const COOK_CALL_MAX_WEEKLY_RULES = 3;

/** Inclusive start / exclusive end bound for minute-of-day windows. */
export const COOK_CALL_MINUTES_PER_DAY = 1440;

/** Allowed discovery-call durations in minutes. */
export const COOK_CALL_DURATIONS_MINUTES = [15, 30, 45, 60] as const;

export type CookCallDurationMinutes = (typeof COOK_CALL_DURATIONS_MINUTES)[number];

export function isCookCallDurationMinutes(value: number): value is CookCallDurationMinutes {
    return (COOK_CALL_DURATIONS_MINUTES as readonly number[]).includes(value);
}

export function formatMinuteOfDay(minutes: number): string {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
    const remainder = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remainder}`;
}

export function parseMinuteOfDay(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) {
        return null;
    }
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
        return null;
    }
    return hours * 60 + mins;
}
