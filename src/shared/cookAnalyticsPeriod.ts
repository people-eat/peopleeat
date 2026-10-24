import { subMonths, subWeeks, subYears } from 'date-fns';

export const cookAnalyticsPeriods = ['PAST_WEEK', 'PAST_MONTH', 'PAST_QUARTER', 'PAST_YEAR'] as const;
export type CookAnalyticsPeriod = (typeof cookAnalyticsPeriods)[number];

export const COOK_ANALYTICS_PERIOD_DEFAULT: CookAnalyticsPeriod = 'PAST_MONTH';

export type CookAnalyticsDateTimeRange = {
    startDateTime: Date;
    endDateTime: Date;
};

/** Rolling window ending at `now` (UTC instants). */
export function cookAnalyticsPeriodRange(period: CookAnalyticsPeriod, now = new Date()): CookAnalyticsDateTimeRange {
    const endDateTime = now;
    switch (period) {
        case 'PAST_WEEK':
            return { startDateTime: subWeeks(now, 1), endDateTime };
        case 'PAST_MONTH':
            return { startDateTime: subMonths(now, 1), endDateTime };
        case 'PAST_QUARTER':
            return { startDateTime: subMonths(now, 3), endDateTime };
        case 'PAST_YEAR':
            return { startDateTime: subYears(now, 1), endDateTime };
    }
}

export function cookAnalyticsPeriodParse(value: unknown): CookAnalyticsPeriod | undefined {
    if (typeof value !== 'string') return undefined;
    return cookAnalyticsPeriods.includes(value as CookAnalyticsPeriod) ? (value as CookAnalyticsPeriod) : undefined;
}
