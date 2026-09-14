/**
 * At-risk detection for a Resend email quota window (daily or monthly).
 *
 * At risk when: used >= limit, used/limit >= 0.8, or linear projection through
 * `resetsAt` would meet or exceed the limit.
 */
export type ResendEmailQuotaWindow = {
    used: number;
    limit: number | null;
    resetsAt: Date;
};

export type ResendEmailQuotaRisk = {
    atRisk: boolean;
    ratio: number | null;
    projected: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function periodStart(resetsAt: Date, window: 'daily' | 'monthly'): Date {
    if (window === 'daily') {
        return new Date(resetsAt.getTime() - DAY_MS);
    }
    return new Date(
        Date.UTC(
            resetsAt.getUTCFullYear(),
            resetsAt.getUTCMonth() - 1,
            resetsAt.getUTCDate(),
            resetsAt.getUTCHours(),
            resetsAt.getUTCMinutes(),
            resetsAt.getUTCSeconds(),
            resetsAt.getUTCMilliseconds(),
        ),
    );
}

export function resendEmailQuotaAtRisk(quota: ResendEmailQuotaWindow, now: Date, window: 'daily' | 'monthly'): ResendEmailQuotaRisk {
    if (quota.limit == null || quota.limit <= 0) {
        return { atRisk: false, ratio: null, projected: null };
    }

    const ratio = quota.used / quota.limit;
    const start = periodStart(quota.resetsAt, window);
    const daysElapsed = Math.max(1, (now.getTime() - start.getTime()) / DAY_MS);
    const daysInPeriod = Math.max(1, (quota.resetsAt.getTime() - start.getTime()) / DAY_MS);
    const projected = (quota.used / daysElapsed) * daysInPeriod;
    const atRisk = quota.used >= quota.limit || ratio >= 0.8 || projected >= quota.limit;

    return { atRisk, ratio, projected };
}
