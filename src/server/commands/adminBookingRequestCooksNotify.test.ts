import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestCooksNotify } from './adminBookingRequestCooksNotify';

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

const stripeReady = {
    stripeAccountId: 'acct_test',
    stripeAccountActive: true,
    stripeAccountActiveWasReset: false,
};

describe('adminBookingRequestCooksNotify', () => {
    it('notifies eligible cooks on a published request', async () => {
        const admin = await commandSetup.withUser({ firstName: 'notify-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({ firstName: 'notify-customer', lastName: 'Customer' });
        const cook = await commandSetup.withUser({ firstName: 'notify-cook', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlin,
            maximumTravelDistance: 50,
            ...stripeReady,
        });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 86_400_000),
            exactEventAddress: berlin,
            originalMessage: 'hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const result = await adminBookingRequestCooksNotify(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, cookIds: [cook.user.userId] },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBe(bookingRequestId);

        const [row] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.bookingRequestId, bookingRequestId), eq(bookingRequestCooks.cookId, cook.user.userId)));
        expect(row?.notifiedAt).toBeTruthy();
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
        expect(admin.serverRuntime.email.send).toHaveBeenCalled();
    });

    it('rejects when publication is still blocked', async () => {
        const admin = await commandSetup.withUser({ firstName: 'notify-blocked-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const customer = await commandSetup.withUser({ firstName: 'blocked-customer', lastName: 'Customer' });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Large party',
            dateTime: new Date(Date.now() + 86_400_000),
            exactEventAddress: berlin,
            originalMessage: 'hello',
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            preferences: [],
        });

        await expect(
            adminBookingRequestCooksNotify(
                adminMutationParent(admin.user.userId),
                { bookingRequestId, cookIds: [idCreate()] },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/not published/);
    });
});
