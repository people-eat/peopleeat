import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequests, supportRequestMessages, supportRequests } from '../db/schema';
import { adminMutationParent, commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { adminSupportRequestResolve } from './adminSupportRequestResolve';
import { userSupportRequestCreate } from './userSupportRequestCreate';
import { userSupportRequestMessageCreate } from './userSupportRequestMessageCreate';

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

describe('supportRequest commands', () => {
    it('creates a general support request with first message and admin unread', async () => {
        const { user, serverRuntime, requestingSession } = await commandSetup.withUser();

        const result = await userSupportRequestCreate(
            userMutationParent(user.userId),
            { subject: '  help with invoice  ', messageBody: '  please check my invoice  ', bookingRequestId: null },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();

        const [row] = await testDb.select().from(supportRequests).where(eq(supportRequests.supportRequestId, result.referenceId!));
        expect(row?.subject).toBe('Help with invoice');
        expect(row?.status).toBe('OPEN');
        expect(row?.adminUnreadNotificationCount).toBe(1);
        expect(row?.bookingRequestId).toBeNull();

        const messages = await testDb
            .select()
            .from(supportRequestMessages)
            .where(eq(supportRequestMessages.supportRequestId, result.referenceId!));
        expect(messages).toHaveLength(1);
        expect(messages[0]?.body).toBe('Please check my invoice');
        expect(vi.mocked(serverRuntime.publish.adminUpdates)).toHaveBeenCalled();
    });

    it('reopens a resolved case when the customer replies', async () => {
        const customer = await commandSetup.withUser();
        const admin = await commandSetup.withUser({ firstName: 'Admin' });

        const created = await userSupportRequestCreate(
            userMutationParent(customer.user.userId),
            { subject: 'Call issue', messageBody: 'Cannot join call', bookingRequestId: null },
            customer.requestingSession,
            customer.serverRuntime,
        );

        await adminSupportRequestResolve(
            adminMutationParent(admin.user.userId),
            { supportRequestId: created.referenceId! },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const reply = await userSupportRequestMessageCreate(
            userMutationParent(customer.user.userId),
            { supportRequestId: created.referenceId!, message: 'still broken' },
            customer.requestingSession,
            customer.serverRuntime,
        );
        expect(reply.success).toBe(true);

        const [row] = await testDb.select().from(supportRequests).where(eq(supportRequests.supportRequestId, created.referenceId!));
        expect(row?.status).toBe('OPEN');
        expect(row?.resolvedAt).toBeNull();
        expect(row?.adminUnreadNotificationCount).toBeGreaterThan(0);
    });

    it('rejects a second support request for the same booking request', async () => {
        const { user, serverRuntime, requestingSession } = await commandSetup.withUser();
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: user.userId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            originalMessage: 'Hello',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const first = await userSupportRequestCreate(
            userMutationParent(user.userId),
            { subject: 'First', messageBody: 'Body', bookingRequestId },
            requestingSession,
            serverRuntime,
        );
        expect(first.success).toBe(true);

        await expect(
            userSupportRequestCreate(
                userMutationParent(user.userId),
                { subject: 'Second', messageBody: 'Body', bookingRequestId },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/already has a support request/);
    });
});
