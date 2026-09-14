import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bookingRequests, promoCodes } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { userBookingRequestCancel } from './userBookingRequestCancel';
import { userBookingRequestChurnPromoCodeCreate } from './userBookingRequestChurnPromoCodeCreate';
import { userBookingRequestCreate } from './userBookingRequestCreate';
import { userBookingRequestDiscountUpdate } from './userBookingRequestDiscountUpdate';
import { userBookingRequestRequestRecall } from './userBookingRequestRequestRecall';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

async function createOwnedBookingRequest(setup: Awaited<ReturnType<typeof commandSetup.withUser>>) {
    const result = await userBookingRequestCreate(
        userMutationParent(setup.user.userId),
        {
            input: {
                occasion: 'Birthday',
                dateTime: new Date('2030-06-15T18:00:00.000Z'),
                exactEventAddress: sampleAddress,
                originalMessage: 'Please cook for us.',
                preferences: [],
                participants: [{ type: 'ADULT', name: 'Participant', restrictions: [] }],
                priceClassType: 'MEDIUM',
            },
        },
        setup.requestingSession,
        setup.serverRuntime,
    );
    expect(result.referenceId).toBeTruthy();
    return result.referenceId!;
}

describe('userBookingRequestChurnPromoCodeCreate', () => {
    it('creates a €50 / 30-day scoped promo and is idempotent', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);

        const first = await userBookingRequestChurnPromoCodeCreate(
            userMutationParent(setup.user.userId),
            { bookingRequestId },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(first.success).toBe(true);
        expect(first.referenceId).toBeTruthy();

        const [row] = await testDb.select().from(promoCodes).where(eq(promoCodes.bookingRequestId, bookingRequestId));
        expect(row?.amountCents).toBe(5000);
        expect(row?.redeemCode).toBe(first.referenceId);
        expect(row?.bookingRequestId).toBe(bookingRequestId);

        const second = await userBookingRequestChurnPromoCodeCreate(
            userMutationParent(setup.user.userId),
            { bookingRequestId },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(second.referenceId).toBe(first.referenceId);

        const all = await testDb.select().from(promoCodes).where(eq(promoCodes.bookingRequestId, bookingRequestId));
        expect(all).toHaveLength(1);
    });
});

describe('userBookingRequestDiscountUpdate', () => {
    it('applies a churn promo via redeem code', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);
        const churn = await userBookingRequestChurnPromoCodeCreate(
            userMutationParent(setup.user.userId),
            { bookingRequestId },
            setup.requestingSession,
            setup.serverRuntime,
        );

        const result = await userBookingRequestDiscountUpdate(
            userMutationParent(setup.user.userId),
            { bookingRequestId, redeemCode: churn.referenceId! },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.promoCodeId).toBeTruthy();
    });
});

describe('userBookingRequestCancel', () => {
    it('cancels an open booking request', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);

        const result = await userBookingRequestCancel(
            userMutationParent(setup.user.userId),
            { bookingRequestId, reason: 'Changed plans' },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.canceledAt).toBeTruthy();
        expect(row?.cancellationReason).toBe('Changed plans');
    });
});

describe('userBookingRequestRequestRecall', () => {
    it('succeeds for an owned booking request', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);

        const result = await userBookingRequestRequestRecall(
            userMutationParent(setup.user.userId),
            { bookingRequestId },
            setup.requestingSession,
            setup.serverRuntime,
        );
        expect(result.success).toBe(true);
        expect(setup.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });
});
