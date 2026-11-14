import { z } from 'zod';

import { BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK } from './bookingRequestOfferPrice';

/** When the inviter’s reward mints for this attributed invitee. */
const cookInviteUnlockKinds = ['SIGN_UP', 'ADMIN_APPROVED', 'FIRST_OFFER_CREATED', 'FIRST_EVENT'] as const;

export type CookInviteUnlockKind = (typeof cookInviteUnlockKinds)[number];

const cookInviteBenefitCookPlatformFeeBookingsSchema = z.object({
    kind: z.literal('COOK_PLATFORM_FEE_BOOKINGS'),
    platformFeePercentCook: z.number().int().min(0).max(100),
    bookingCount: z.number().int().positive(),
});

const cookInviteBenefitCookPlatformFeeDaysSchema = z.object({
    kind: z.literal('COOK_PLATFORM_FEE_DAYS'),
    platformFeePercentCook: z.number().int().min(0).max(100),
    dayCount: z.number().int().positive(),
});

const cookInviteBenefitSchema = z.discriminatedUnion('kind', [
    cookInviteBenefitCookPlatformFeeBookingsSchema,
    cookInviteBenefitCookPlatformFeeDaysSchema,
]);

export type CookInviteBenefit = z.infer<typeof cookInviteBenefitSchema>;

/** Frozen program snapshot on `Cooks.inviteReward` (and copied onto reward ledger terms). */
const cookInviteRewardSchema = z.object({
    unlockKind: z.enum(cookInviteUnlockKinds),
    benefit: cookInviteBenefitSchema,
});

export type CookInviteReward = z.infer<typeof cookInviteRewardSchema>;

const cookInviteConsumptionFeeBookingsSchema = z.object({
    kind: z.literal('COOK_PLATFORM_FEE_BOOKINGS'),
    remainingBookingCount: z.number().int().min(0),
});

const cookInviteConsumptionFeeDaysSchema = z.object({
    kind: z.literal('COOK_PLATFORM_FEE_DAYS'),
    endsAt: z.iso.datetime(),
});

const cookInviteConsumptionSchema = z.discriminatedUnion('kind', [
    cookInviteConsumptionFeeBookingsSchema,
    cookInviteConsumptionFeeDaysSchema,
]);

export type CookInviteConsumption = z.infer<typeof cookInviteConsumptionSchema>;

const cookInviteRewardStatuses = ['OPEN', 'EXHAUSTED', 'REVOKED'] as const;

export type CookInviteRewardStatus = (typeof cookInviteRewardStatuses)[number];

/** Half of the marketplace default cook fee (18 → 9). Provisional until commercial confirms. */
export const COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK = Math.floor(BOOKING_REQUEST_OFFER_PLATFORM_FEE_PERCENT_COOK / 2);

export const COOK_INVITE_LIVE_BOOKING_COUNT = 3;

/** Soft stack cap: refuse minting when open remaining fee-credit bookings would exceed this. */
export const COOK_INVITE_STACK_MAX_REMAINING_BOOKINGS = 9;

export function cookInviteRewardLiveProgramCreate(): CookInviteReward {
    return {
        unlockKind: 'FIRST_EVENT',
        benefit: {
            kind: 'COOK_PLATFORM_FEE_BOOKINGS',
            platformFeePercentCook: COOK_INVITE_LIVE_PLATFORM_FEE_PERCENT_COOK,
            bookingCount: COOK_INVITE_LIVE_BOOKING_COUNT,
        },
    };
}

export function cookInviteRewardParse(value: unknown): CookInviteReward | null {
    const parsed = cookInviteRewardSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export function cookInviteConsumptionFromBenefit(benefit: CookInviteBenefit, now = new Date()): CookInviteConsumption {
    if (benefit.kind === 'COOK_PLATFORM_FEE_BOOKINGS') {
        return { kind: 'COOK_PLATFORM_FEE_BOOKINGS', remainingBookingCount: benefit.bookingCount };
    }
    const endsAt = new Date(now);
    endsAt.setUTCDate(endsAt.getUTCDate() + benefit.dayCount);
    return { kind: 'COOK_PLATFORM_FEE_DAYS', endsAt: endsAt.toISOString() };
}

export function cookInviteMilestoneFromUnlockKind(
    unlockKind: CookInviteUnlockKind,
): 'registered' | 'approved' | 'firstOfferCreated' | 'firstEvent' {
    switch (unlockKind) {
        case 'SIGN_UP':
            return 'registered';
        case 'ADMIN_APPROVED':
            return 'approved';
        case 'FIRST_OFFER_CREATED':
            return 'firstOfferCreated';
        case 'FIRST_EVENT':
            return 'firstEvent';
    }
}
