import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks, users } from '../db/schema';
import { adminMutationParent, commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { adminUserStatusUpdate } from './adminUserStatusUpdate';
import { cookBookingRequestOfferCreate } from './cookBookingRequestOfferCreate';

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

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Ban' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_ban_test',
        stripeAccountActive: true,
    });
    return setup;
}

describe('adminUserStatusUpdate', () => {
    it('bans an ACTIVE user and auto-declines open cook offers', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Status', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const cook = await setupCookReadyToOffer();
        const customer = await commandSetup.withUser({ firstName: 'Ban', lastName: 'Customer' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: { ...berlin, latitude: 52.53, longitude: 13.41 },
            priceClassType: 'MEDIUM',
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        });

        const created = await cookBookingRequestOfferCreate(
            cookMutationParent(cook.user.userId),
            {
                input: {
                    bookingRequestId,
                    menuPriceCents: 5000,
                    suggestedMenuIds: [],
                },
            },
            cook.requestingSession,
            cook.serverRuntime,
        );
        expect(created.success).toBe(true);
        const offerId = created.referenceId;
        expect(offerId).toBeTruthy();
        if (!offerId) throw new Error('expected offer id');

        const result = await adminUserStatusUpdate(
            adminMutationParent(admin.user.userId),
            { userId: cook.user.userId, status: 'BANNED' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: cook.user.userId });

        const [bannedUser] = await testDb.select({ status: users.status }).from(users).where(eq(users.userId, cook.user.userId));
        expect(bannedUser?.status).toBe('BANNED');

        const [offer] = await testDb.select().from(bookingRequestOffers).where(eq(bookingRequestOffers.bookingRequestOfferId, offerId));
        expect(offer?.cookAccepted).toBe(false);
        expect(offer?.cookDeclinationReason).toBe('Nutzer wurde gesperrt');

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('rejects ANONYMIZED as a target status and anonymized rows', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Status', lastName: 'Admin2' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Anon', lastName: 'Target' });
        await testDb.update(users).set({ status: 'ANONYMIZED' }).where(eq(users.userId, target.user.userId));

        await expect(
            adminUserStatusUpdate(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, status: 'BANNED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/anonymized/);

        await expect(
            adminUserStatusUpdate(
                adminMutationParent(admin.user.userId),
                { userId: target.user.userId, status: 'ANONYMIZED' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/ACTIVE or BANNED/);
    });

    it('unbans a BANNED user back to ACTIVE', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Status', lastName: 'Admin3' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const target = await commandSetup.withUser({ firstName: 'Was', lastName: 'Banned' });
        await testDb.update(users).set({ status: 'BANNED' }).where(eq(users.userId, target.user.userId));

        const result = await adminUserStatusUpdate(
            adminMutationParent(admin.user.userId),
            { userId: target.user.userId, status: 'ACTIVE' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: target.user.userId });
        const [row] = await testDb.select({ status: users.status }).from(users).where(eq(users.userId, target.user.userId));
        expect(row?.status).toBe('ACTIVE');
    });
});
