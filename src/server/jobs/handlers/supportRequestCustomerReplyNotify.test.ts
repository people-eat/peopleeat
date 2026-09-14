import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { supportRequests } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { adminSupportRequestMessageCreateEmailSend } from '../../utils/supportRequestLifecycleEmails';
import { supportRequestCustomerReplyNotify } from './supportRequestCustomerReplyNotify';

vi.mock('../../utils/supportRequestLifecycleEmails', () => ({
    adminSupportRequestMessageCreateEmailSend: vi.fn(async () => {}),
}));

describe('supportRequestCustomerReplyNotify', () => {
    it('sends the customer email when unread count is greater than zero', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser();
        const supportRequestId = idCreate();
        await testDb.insert(supportRequests).values({
            supportRequestId,
            userId: user.userId,
            subject: 'Help',
            userUnreadNotificationCount: 2,
        });

        // Act
        await supportRequestCustomerReplyNotify.handler({
            data: { supportRequestId },
            serverRuntime,
        });

        // Assert
        expect(adminSupportRequestMessageCreateEmailSend).toHaveBeenCalledWith(serverRuntime, { supportRequestId });
    });

    it('no-ops when unread count is zero', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser();
        const supportRequestId = idCreate();
        await testDb.insert(supportRequests).values({
            supportRequestId,
            userId: user.userId,
            subject: 'Help',
            userUnreadNotificationCount: 0,
        });

        // Act
        await supportRequestCustomerReplyNotify.handler({
            data: { supportRequestId },
            serverRuntime,
        });

        // Assert
        expect(adminSupportRequestMessageCreateEmailSend).not.toHaveBeenCalled();
    });

    it('no-ops when the support request id is missing', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act
        await supportRequestCustomerReplyNotify.handler({
            data: { supportRequestId: idCreate() },
            serverRuntime,
        });

        // Assert
        expect(adminSupportRequestMessageCreateEmailSend).not.toHaveBeenCalled();
    });
});
