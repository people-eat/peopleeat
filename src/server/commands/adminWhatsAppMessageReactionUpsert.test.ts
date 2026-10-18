import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { whatsAppConversations, whatsAppMessageReactions, whatsAppMessages } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminWhatsAppMessageReactionUpsert } from './adminWhatsAppMessageReactionUpsert';

describe('adminWhatsAppMessageReactionUpsert', () => {
    it('rejects reacting to outbound messages', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        const conversationId = idCreate();
        const messageId = idCreate();
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phoneNumberCreate(),
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
        });
        await testDb.insert(whatsAppMessages).values({
            whatsAppMessageId: messageId,
            whatsAppConversationId: conversationId,
            direction: 'OUTBOUND',
            messageKind: 'TEXT',
            body: 'Hi',
            providerMessageId: `wamid.${idCreate()}`,
        });

        await expect(
            adminWhatsAppMessageReactionUpsert(
                adminMutationParent(admin.user.userId),
                { whatsAppMessageId: messageId, emoji: '👍' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/inbound customer messages/);
    });

    it('sends a reaction and persists the outbound row', async () => {
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        const conversationId = idCreate();
        const messageId = idCreate();
        const phone = phoneNumberCreate();
        const targetProviderMessageId = `wamid.${idCreate()}`;
        const reactionProviderMessageId = `wamid.${idCreate()}`;

        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phone,
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
        });
        await testDb.insert(whatsAppMessages).values({
            whatsAppMessageId: messageId,
            whatsAppConversationId: conversationId,
            direction: 'INBOUND',
            messageKind: 'TEXT',
            body: 'Danke',
            providerMessageId: targetProviderMessageId,
        });

        vi.mocked(admin.serverRuntime.whatsapp.sendReaction).mockResolvedValue({
            providerMessageId: reactionProviderMessageId,
        });

        const result = await adminWhatsAppMessageReactionUpsert(
            adminMutationParent(admin.user.userId),
            { whatsAppMessageId: messageId, emoji: '👍' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: messageId });
        expect(admin.serverRuntime.whatsapp.sendReaction).toHaveBeenCalledWith({
            toPhoneNumber: phone,
            providerMessageId: targetProviderMessageId,
            emoji: '👍',
        });

        const [reaction] = await testDb
            .select()
            .from(whatsAppMessageReactions)
            .where(eq(whatsAppMessageReactions.whatsAppMessageId, messageId));
        expect(reaction?.emoji).toBe('👍');
        expect(reaction?.direction).toBe('OUTBOUND');
        expect(reaction?.providerMessageId).toBe(reactionProviderMessageId);

        vi.mocked(admin.serverRuntime.whatsapp.sendReaction).mockResolvedValue({
            providerMessageId: `wamid.${idCreate()}`,
        });
        await adminWhatsAppMessageReactionUpsert(
            adminMutationParent(admin.user.userId),
            { whatsAppMessageId: messageId, emoji: '' },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const [cleared] = await testDb
            .select()
            .from(whatsAppMessageReactions)
            .where(eq(whatsAppMessageReactions.whatsAppMessageId, messageId));
        expect(cleared?.emoji).toBeNull();
        expect(cleared?.direction).toBe('OUTBOUND');
    });
});
