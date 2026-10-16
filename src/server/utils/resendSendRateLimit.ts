/**
 * Sliding 1s window limiter for Resend API calls.
 *
 * Resend's default team limit is 10 requests/second with no burst allowance.
 * Bulk paths (e.g. `bookingRequestCooksNotify` via `Promise.all`) exceed that
 * unless starts are paced. Cap below 10 so concurrent OTP / lifecycle traffic
 * still has headroom.
 */
const RESEND_SEND_MAX_PER_SECOND = 8;

export type ResendSendRateLimit = {
    acquire: () => Promise<void>;
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resendSendRateLimitCreate(
    maxPerSecond: number = RESEND_SEND_MAX_PER_SECOND,
    deps: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): ResendSendRateLimit {
    if (maxPerSecond < 1) {
        throw new Error('resendSendRateLimitCreate: maxPerSecond must be >= 1');
    }

    const nowFn = deps.now ?? Date.now;
    const sleepFn = deps.sleep ?? sleep;
    const recentStartsMs: number[] = [];
    let gate: Promise<void> = Promise.resolve();

    function acquire(): Promise<void> {
        const run = gate.then(async () => {
            for (;;) {
                const now = nowFn();
                while (recentStartsMs.length > 0 && now - recentStartsMs[0]! >= 1000) {
                    recentStartsMs.shift();
                }
                if (recentStartsMs.length < maxPerSecond) {
                    recentStartsMs.push(now);
                    return;
                }
                const waitMs = 1000 - (now - recentStartsMs[0]!) + 1;
                await sleepFn(waitMs);
            }
        });
        gate = run.catch(() => undefined);
        return run;
    }

    return { acquire };
}

/** Process-wide limiter shared by `serverRuntime.email.send`. */
export const resendSendRateLimit = resendSendRateLimitCreate();
