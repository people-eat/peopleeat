import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminCookMenuCopy } from './adminCookMenuCopy';
import { adminCookMenuCreate } from './adminCookMenuCreate';
import { adminCookMenuDelete } from './adminCookMenuDelete';
import { adminCookMenuUpdate } from './adminCookMenuUpdate';

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

describe('adminCookMenuUpdate', () => {
    it('patches title for an inventory menu', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMenuCreate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const menuId = created.referenceId!;

        const result = await adminCookMenuUpdate(
            adminMutationParent(admin.user.userId),
            { menuId, menu: { title: '  tasting menu  ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: menuId });
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row?.title).toBe('Tasting menu');
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cookUser.user.userId });
    });

    it('patches an offer-scoped copy and rejects publishedAt', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });
        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Guest' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        const offerId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId,
            cookId: cookUser.user.userId,
            cookAccepted: true,
            userAccepted: null,
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
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: cookUser.user.userId,
            title: 'Offer copy',
            description: '',
            bookingRequestOfferId: offerId,
        });

        const result = await adminCookMenuUpdate(
            adminMutationParent(admin.user.userId),
            { menuId, menu: { title: '  guest menu  ' } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: menuId });
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row?.title).toBe('Guest menu');

        await expect(
            adminCookMenuUpdate(
                adminMutationParent(admin.user.userId),
                { menuId, menu: { publishedAt: new Date() } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/publishedAt is inventory-only/);
    });
});

describe('adminCookMenuDelete', () => {
    it('soft-deletes an inventory menu', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMenuCreate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const menuId = created.referenceId!;

        const result = await adminCookMenuDelete(
            adminMutationParent(admin.user.userId),
            { menuId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result).toEqual({ success: true, referenceId: menuId });

        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row?.deletedAt).not.toBeNull();
    });
});

describe('adminCookMenuCopy', () => {
    it('deep-copies to a new draft', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Menu', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const cookUser = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });

        const created = await adminCookMenuCreate(
            adminMutationParent(admin.user.userId),
            { cookId: cookUser.user.userId },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const menuId = created.referenceId!;

        const result = await adminCookMenuCopy(
            adminMutationParent(admin.user.userId),
            { menuId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        expect(result.referenceId).not.toBe(menuId);
        const [copy] = await testDb.select().from(menus).where(eq(menus.menuId, result.referenceId!));
        expect(copy?.cookId).toBe(cookUser.user.userId);
        expect(copy?.publishedAt).toBeNull();
        expect(copy?.deletedAt).toBeNull();
    });
});
