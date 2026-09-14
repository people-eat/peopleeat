import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { whatsAppConversations } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminWhatsAppMessageCreate } from './adminWhatsAppMessageCreate';

describe('adminWhatsAppMessageCreate', () => {
    it('rejects when the customer-service window is closed', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        const conversationId = idCreate();
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phoneNumberCreate(),
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
            customerServiceWindowExpiresAt: new Date(Date.now() - 60_000),
        });

        await expect(
            adminWhatsAppMessageCreate(
                adminMutationParent(admin.user.userId),
                { whatsAppConversationId: conversationId, message: 'Hello' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/customer-service window is closed/);
    });

    it('sends a session reply when the window is open', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        const conversationId = idCreate();
        const phone = phoneNumberCreate();
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phone,
            lastMessageAt: new Date(),
            adminUnreadCount: 1,
            customerServiceWindowExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        const whatsAppMessageId = idCreate();
        vi.mocked(admin.serverRuntime.whatsapp.sendText).mockResolvedValue({
            outboundWhatsAppMessageId: idCreate(),
            whatsAppMessageId,
        });

        const result = await adminWhatsAppMessageCreate(
            adminMutationParent(admin.user.userId),
            { whatsAppConversationId: conversationId, message: 'hello there' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: whatsAppMessageId });
        expect(admin.serverRuntime.whatsapp.sendText).toHaveBeenCalledWith(
            expect.objectContaining({
                purpose: 'CONCIERGE_SESSION_REPLY',
                toPhoneNumber: phone,
                body: 'Hello there',
                whatsAppConversationId: conversationId,
                sentByAdminUserId: admin.user.userId,
            }),
        );
    });
});
