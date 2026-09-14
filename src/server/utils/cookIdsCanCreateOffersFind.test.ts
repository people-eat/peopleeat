import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestCookNotifiedUpsert, cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';
import { cookIsInTravelRadius } from '../utils/cookIsInTravelRadius';

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

const nearby = { latitude: 52.53, longitude: 13.41 };

const stripeReady = {
    stripeAccountId: 'acct_test',
    stripeAccountActive: true,
    stripeAccountActiveWasReset: false,
};

describe('cookIsInTravelRadius', () => {
    it('ignores isVisible and isApprovedByAdmin', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Hidden', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isVisible: false,
            isApprovedByAdmin: false,
            exactTravelOriginAddress: berlin,
            maximumTravelDistance: 50,
        });

        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, setup.user.userId));
        expect(cookIsInTravelRadius(cook!, nearby)).toBe(true);
    });
});

describe('cookIdsCanCreateOffersFind', () => {
    it('includes offer-capable cooks within maximumTravelDistance regardless of isVisible', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Radius', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isVisible: false,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });

        const ids = await cookIdsCanCreateOffersFind(setup.serverRuntime, nearby);
        expect(ids).toContain(setup.user.userId);
    });

    it('excludes cooks who cannot create offers', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Pending', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            maximumTravelDistance: 50,
            stripeAccountId: null,
            stripeAccountActive: false,
        });

        const ids = await cookIdsCanCreateOffersFind(setup.serverRuntime, nearby);
        expect(ids).not.toContain(setup.user.userId);
    });

    it('upserts notifiedAt without clobbering on conflict', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Notify', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: setup.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });

        const bookingRequestId = idCreate();
        const { bookingRequests } = await import('../db/schema');
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: setup.user.userId,
            occasion: 'Test',
            dateTime: new Date(Date.now() + 86_400_000),
            exactEventAddress: berlin,
            originalMessage: 'hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        await bookingRequestCookNotifiedUpsert(setup.serverRuntime, {
            cookId: setup.user.userId,
            bookingRequestId,
        });
        await bookingRequestCookNotifiedUpsert(setup.serverRuntime, {
            cookId: setup.user.userId,
            bookingRequestId,
        });

        const [row] = await testDb.select().from(bookingRequestCooks).where(eq(bookingRequestCooks.bookingRequestId, bookingRequestId));
        expect(row?.notifiedAt).toBeTruthy();
    });
});
