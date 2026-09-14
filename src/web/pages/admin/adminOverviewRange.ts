import { endOfMonth, parseISO, startOfMonth, subMonths } from 'date-fns';

import { formatIsoDate } from '../../../shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AdminOverviewRangeSearch = {
    from?: string;
    to?: string;
};

export type AdminOverviewDateRange = {
    from: string;
    to: string;
};

function adminOverviewRangeDefault(now = new Date()): AdminOverviewDateRange {
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const currentMonthEnd = endOfMonth(now);
    return {
        from: formatIsoDate(previousMonthStart),
        to: formatIsoDate(currentMonthEnd),
    };
}

function parseIsoDateOnly(value: unknown): string | undefined {
    if (typeof value !== 'string' || !ISO_DATE.test(value)) return undefined;
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return value;
}

export function parseAdminOverviewRangeSearch(search: Record<string, unknown>): AdminOverviewRangeSearch {
    return {
        from: parseIsoDateOnly(search.from),
        to: parseIsoDateOnly(search.to),
    };
}

export function adminOverviewRangeResolve(search: AdminOverviewRangeSearch, now = new Date()): AdminOverviewDateRange {
    const fallback = adminOverviewRangeDefault(now);
    if (!search.from || !search.to) return fallback;

    const fromDate = parseISO(search.from);
    const toDate = parseISO(search.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate.getTime() > toDate.getTime()) {
        return fallback;
    }

    return { from: search.from, to: search.to };
}

export function adminOverviewRangeToGraphQlVariables(range: AdminOverviewDateRange) {
    const startDateTime = parseISO(range.from);
    // Inclusive end-of-day for the selected calendar day.
    const endDateTime = new Date(parseISO(range.to).getTime() + 24 * 60 * 60 * 1000 - 1);
    return {
        range: {
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
        },
        granularity: 'day' as const,
    };
}
