import { describe, expect, it } from 'vitest';

import {
    COOK_INVITE_LIVE_BOOKING_COUNT,
    COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK,
    cookInviteConsumptionFromBenefit,
    cookInviteRewardLiveProgramCreate,
    cookInviteRewardParse,
} from './cookInviteReward';

describe('cookInviteReward', () => {
    it('writes the live first-event fee-bookings program', () => {
        const live = cookInviteRewardLiveProgramCreate();
        expect(live.unlockKind).toBe('FIRST_EVENT');
        expect(live.benefit).toEqual({
            kind: 'COOK_PLATFORM_FEE_BOOKINGS',
            platformFeePercentCook: COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK,
            bookingCount: COOK_INVITE_LIVE_BOOKING_COUNT,
        });
    });

    it('parses a signup unlock snapshot for future programs', () => {
        const parsed = cookInviteRewardParse({
            unlockKind: 'SIGN_UP',
            benefit: {
                kind: 'COOK_PLATFORM_FEE_BOOKINGS',
                platformFeePercentCook: 9,
                bookingCount: 1,
            },
        });
        expect(parsed?.unlockKind).toBe('SIGN_UP');
    });

    it('builds booking consumption from the benefit', () => {
        expect(
            cookInviteConsumptionFromBenefit({
                kind: 'COOK_PLATFORM_FEE_BOOKINGS',
                platformFeePercentCook: 9,
                bookingCount: 3,
            }),
        ).toEqual({ kind: 'COOK_PLATFORM_FEE_BOOKINGS', remainingBookingCount: 3 });
    });
});
