import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import type { BookingRequest } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestPoolCookIdsFind, bookingRequestPoolCooksPublish } from './bookingRequestPoolCooksPublish';

/** Remote spot + tight radii so the assertions do not depend on cooks from parallel tests. */
function remoteAddress(latitude: number, longitude: number) {
    return {
        displayText: 'Remote',
        latitude,
        longitude,
        addressLine1: 'Street 1',
        addressLine2: '',
        city: 'Remote',
        postCode: '00000',
        state: '',
        country: 'XX',
    };
}

async function insertCook(address: ReturnType<typeof remoteAddress>) {
    const setup = await commandSetup.withUser({ firstName: 'Pool', lastName: 'Chef' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: address,
        maximumTravelDistance: 5,
    });
    return setup.user.userId;
}

function snapshot(
    overrides: Partial<Pick<BookingRequest, 'publicationStatus' | 'exactEventAddress'>> & { origin: ReturnType<typeof remoteAddress> },
) {
    const { origin, ...rest } = overrides;
    return {
        bookingRequestId: idCreate(),
        userId: idCreate(),
        publicationStatus: 'PUBLICATION_AUTO_APPROVED' as const,
        exactEventAddress: origin,
        ...rest,
    };
}

describe('bookingRequestPoolCookIdsFind', () => {
    it('finds cooks in radius for auto-approved requests and only notified cooks for admin-approved ones', async () => {
        // Arrange
        const latitude = -60 + Math.random() * 10;
        const longitude = -150 + Math.random() * 10;
        const near = remoteAddress(latitude, longitude);
        const far = remoteAddress(latitude + 1, longitude);
        const nearCookId = await insertCook(near);
        const farCookId = await insertCook(far);
        const autoApproved = snapshot({ origin: near });
        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
        const adminApproved = {
            ...snapshot({ origin: near, publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN' }),
            userId: customer.user.userId,
        };
        await testDb.insert(bookingRequests).values({
            ...adminApproved,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            preferences: [],
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId: farCookId,
            bookingRequestId: adminApproved.bookingRequestId,
            notifiedAt: new Date(),
        });

        // Act
        const autoApprovedCookIds = await bookingRequestPoolCookIdsFind(customer.serverRuntime, autoApproved);
        const adminApprovedCookIds = await bookingRequestPoolCookIdsFind(customer.serverRuntime, adminApproved);

        // Assert
        expect(autoApprovedCookIds).toContain(nearCookId);
        expect(autoApprovedCookIds).not.toContain(farCookId);
        expect(adminApprovedCookIds).toContain(farCookId);
        expect(adminApprovedCookIds).not.toContain(nearCookId);
    });
});

describe('bookingRequestPoolCooksPublish', () => {
    it('publishes to pool cooks of every snapshot and skips already published users', async () => {
        // Arrange
        const latitude = -60 + Math.random() * 10;
        const longitude = -150 + Math.random() * 10;
        const before = remoteAddress(latitude, longitude);
        const after = remoteAddress(latitude + 1, longitude);
        const beforeCookId = await insertCook(before);
        const afterCookId = await insertCook(after);
        const skippedCookId = await insertCook(before);
        const request = snapshot({ origin: before });
        const { serverRuntime } = await commandSetup.withUser();

        // Act
        await bookingRequestPoolCooksPublish(serverRuntime, [request, { ...request, exactEventAddress: after }], [skippedCookId]);

        // Assert
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: beforeCookId });
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: afterCookId });
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalledWith({ userId: skippedCookId });
    });
});
