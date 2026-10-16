import { describe, expect, it, vi } from 'vitest';

import { resendSendRateLimitCreate } from './resendSendRateLimit';

describe('resendSendRateLimitCreate', () => {
    it('allows up to maxPerSecond acquires without waiting', async () => {
        const sleepFn = vi.fn(async () => undefined);
        const limit = resendSendRateLimitCreate(3, { now: () => 1_000, sleep: sleepFn });

        await Promise.all([limit.acquire(), limit.acquire(), limit.acquire()]);

        expect(sleepFn).not.toHaveBeenCalled();
    });

    it('waits when the sliding window is full', async () => {
        let now = 5_000;
        const sleepFn = vi.fn(async (ms: number) => {
            now += ms;
        });
        const limit = resendSendRateLimitCreate(2, { now: () => now, sleep: sleepFn });

        await limit.acquire();
        await limit.acquire();
        await limit.acquire();

        expect(sleepFn).toHaveBeenCalled();
        expect(sleepFn.mock.calls[0]![0]).toBeGreaterThan(0);
    });
});
