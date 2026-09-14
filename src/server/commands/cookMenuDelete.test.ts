import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menus } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMenuCreate } from './cookMenuCreate';
import { cookMenuDelete } from './cookMenuDelete';

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

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMenuDelete', () => {
    it('soft-deletes an inventory menu and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        const menuId = created.referenceId!;
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMenuDelete(cookMutationParent(user.userId), { menuId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: menuId });
        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row!.deletedAt).not.toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects a missing menu without publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();

        // Act + Assert
        await expect(
            cookMenuDelete(cookMutationParent(user.userId), { menuId: idCreate() }, requestingSession, serverRuntime),
        ).rejects.toThrow(/menu not found/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error' && /menu not found/.test(row.message))).toBe(true);
    });

    it('rejects a menu owned by another cook', async () => {
        // Arrange
        const owner = await setupCook();
        const other = await setupCook();
        const created = await cookMenuCreate(cookMutationParent(owner.user.userId), owner.requestingSession, owner.serverRuntime);

        // Act + Assert
        await expect(
            cookMenuDelete(
                cookMutationParent(other.user.userId),
                { menuId: created.referenceId! },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(/menu not found/);

        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, created.referenceId!));
        expect(row!.deletedAt).toBeNull();
        expect(other.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects a second delete on an already soft-deleted menu', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        const menuId = created.referenceId!;
        await cookMenuDelete(cookMutationParent(user.userId), { menuId }, requestingSession, serverRuntime);
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(cookMenuDelete(cookMutationParent(user.userId), { menuId }, requestingSession, serverRuntime)).rejects.toThrow(
            /menu not found/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects deleting an offer-scoped menu copy', async () => {
        // Arrange — attach menu to a booking request offer so bookingRequestOfferId is set.
        const { serverRuntime, requestingSession, user } = await setupCook();
        const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
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
            cookId: user.userId,
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
            cookId: user.userId,
            bookingRequestOfferId: offerId,
            title: 'Offer menu',
            description: '',
        });

        // Act + Assert
        await expect(cookMenuDelete(cookMutationParent(user.userId), { menuId }, requestingSession, serverRuntime)).rejects.toThrow(
            /menu not found/,
        );

        const [row] = await testDb.select().from(menus).where(eq(menus.menuId, menuId));
        expect(row!.deletedAt).toBeNull();
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
