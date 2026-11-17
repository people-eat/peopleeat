import { describe, expect, it } from 'vitest';

import { USER_ACCOUNT_DELETION_COOL_OFF_MS, userAccountDeletionScheduledForResolve } from './userDualAcceptedEventCoolOff';

describe('userAccountDeletionScheduledForResolve', () => {
    it('uses now + 7d when there is no dual-accepted event', () => {
        const now = new Date('2026-06-01T12:00:00.000Z');
        expect(userAccountDeletionScheduledForResolve(now, null).toISOString()).toBe(
            new Date(now.getTime() + USER_ACCOUNT_DELETION_COOL_OFF_MS).toISOString(),
        );
    });

    it('uses the later of now+7d and lastEvent+7d', () => {
        const now = new Date('2026-06-01T12:00:00.000Z');
        const recentEvent = new Date('2026-05-30T12:00:00.000Z');
        const futureEvent = new Date('2026-06-20T12:00:00.000Z');

        expect(userAccountDeletionScheduledForResolve(now, recentEvent).toISOString()).toBe(
            new Date(now.getTime() + USER_ACCOUNT_DELETION_COOL_OFF_MS).toISOString(),
        );
        expect(userAccountDeletionScheduledForResolve(now, futureEvent).toISOString()).toBe(
            new Date(futureEvent.getTime() + USER_ACCOUNT_DELETION_COOL_OFF_MS).toISOString(),
        );
    });
});
