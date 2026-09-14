import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBookingRequestLookup } from './cookBookingRequestLookup';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

const munich = {
    ...berlin,
    displayText: 'Munich',
    latitude: 48.137,
    longitude: 11.575,
    city: 'Munich',
    postCode: '80331',
    state: 'BY',
};

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupPoolCook(overrides?: { maximumTravelDistance?: number | null; exactTravelOriginAddress?: typeof berlin }) {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Pool' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: overrides?.exactTravelOriginAddress ?? berlin,
        maximumTravelDistance: overrides?.maximumTravelDistance === undefined ? null : overrides.maximumTravelDistance,
    });
    return setup;
}

async function insertCustomerBookingRequest(overrides?: {
    publicationStatus?: 'PUBLICATION_AUTO_APPROVED' | 'PUBLICATION_APPROVED_BY_ADMIN' | 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW';
    exactEventAddress?: typeof berlin;
    canceledAt?: Date | null;
    expiresAt?: Date | null;
    userId?: string;
}) {
    const customer =
        overrides?.userId != null
            ? { user: { userId: overrides.userId } }
            : await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Anniversary',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: overrides?.exactEventAddress ?? { ...berlin, latitude: 52.53, longitude: 13.41 },
        priceClassType: 'HIGH',
        originalMessage: 'Special dinner',
        publicationStatus: overrides?.publicationStatus ?? 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        canceledAt: overrides?.canceledAt ?? null,
        expiresAt: overrides?.expiresAt ?? null,
    });
    return { bookingRequestId, customerUserId: customer.user.userId };
}

async function insertOffer(cookId: string, bookingRequestId: string, dualAccepted = false) {
    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId,
        cookAccepted: dualAccepted ? true : true,
        userAccepted: dualAccepted ? true : null,
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 0,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_000,
        paymentStatus: 'EMPTY',
    });
    return bookingRequestOfferId;
}

describe('cookBookingRequestLookup', () => {
    it('returns Available for an eligible open request', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result.gqlTypeName).toBe('CookBookingRequestAvailable');
        if (result.gqlTypeName !== 'CookBookingRequestAvailable') return;
        expect(result.bookingRequest.bookingRequestId).toBe(bookingRequestId);
        expect(result.bookingRequest.exactEventAddress.city).toBe(berlin.city);
        expect(result.bookingRequest.exactEventAddress.postCode).toBe(berlin.postCode);
        expect(result.bookingRequest.exactEventAddress.addressLine1).toBe('');
        expect(result.bookingRequest.exactEventAddress.displayText).not.toContain('Street');
    });

    it('returns NotFound for a random UUID', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();

        const result = await cookBookingRequestLookup(
            cookParent(user.userId),
            { bookingRequestId: idCreate() },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });

    it('returns NotFound for admin-approved request when cook was never notified (even in radius)', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({
            publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN',
        });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });

    it('returns NotFound for auto-approved request when cook is out of travel radius', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook({
            maximumTravelDistance: 10,
            exactTravelOriginAddress: berlin,
        });
        const { bookingRequestId } = await insertCustomerBookingRequest({ exactEventAddress: munich });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });

    it('returns NotFound when a non-eligible cook forged an affinity row via open/decline', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook({
            maximumTravelDistance: 10,
            exactTravelOriginAddress: berlin,
        });
        const { bookingRequestId } = await insertCustomerBookingRequest({ exactEventAddress: munich });
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId,
            firstOpenedAt: new Date(),
            declinedAt: new Date(),
            declinationReason: 'forged',
        });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });

    it('returns NotFound when the cook is the customer of the request', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({ userId: user.userId });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });

    it('returns Canceled for an eligible cook when the request was withdrawn', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({ canceledAt: new Date() });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestCanceled', _: null });
        expect(result).not.toHaveProperty('bookingRequest');
    });

    it('returns Taken for an eligible cook when another cook dual-accepted (no winning cook id)', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const other = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        await insertOffer(other.user.userId, bookingRequestId, true);

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestTaken', _: null });
        expect(JSON.stringify(result)).not.toContain(other.user.userId);
    });

    it('returns Expired for an eligible cook when expiresAt is in the past', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({
            expiresAt: new Date(Date.now() - 60_000),
        });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestExpired', _: null });
    });

    it('returns OfferAlreadyExists with offer id when this cook already offered', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest();
        const offerId = await insertOffer(user.userId, bookingRequestId, false);

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({
            gqlTypeName: 'CookBookingRequestOfferAlreadyExists',
            bookingRequestOfferId: offerId,
        });
        expect(result).not.toHaveProperty('bookingRequest');
    });

    it('prefers OfferAlreadyExists over Taken / Canceled when several apply', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const other = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({ canceledAt: new Date() });
        const ownOfferId = await insertOffer(user.userId, bookingRequestId, false);
        await insertOffer(other.user.userId, bookingRequestId, true);

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({
            gqlTypeName: 'CookBookingRequestOfferAlreadyExists',
            bookingRequestOfferId: ownOfferId,
        });
    });

    it('returns reasons for admin-approved requests only after notifiedAt is set', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({
            publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN',
            canceledAt: new Date(),
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId: user.userId,
            bookingRequestId,
            notifiedAt: new Date(),
        });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestCanceled', _: null });
    });

    it('returns NotFound for publication-blocked requests', async () => {
        const { serverRuntime, requestingSession, user } = await setupPoolCook();
        const { bookingRequestId } = await insertCustomerBookingRequest({
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
        });

        const result = await cookBookingRequestLookup(cookParent(user.userId), { bookingRequestId }, requestingSession, serverRuntime);

        expect(result).toEqual({ gqlTypeName: 'CookBookingRequestNotFound', _: null });
    });
});
