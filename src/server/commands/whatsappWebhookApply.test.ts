import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundWhatsAppMessages, whatsAppConversations, whatsAppMessageReactions, whatsAppMessages } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import type { Logger } from '../utils/loggerCreate';
import { whatsappCreate } from '../whatsapp/whatsappCreate';
import { whatsappWebhookApply } from './whatsappWebhookApply';

const silentLog: Logger = {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    drain: async () => {},
};

describe('whatsappWebhookApply', () => {
    it('upserts inbound text, matches user by phone, and bumps unread', async () => {
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({
            firstName: 'Ina',
            lastName: 'Bound',
            phoneNumber: phone,
        });
        const providerMessageId = `wamid.${idCreate()}`;

        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: providerMessageId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'text',
                                            text: { body: 'Hallo Concierge' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            customer.serverRuntime,
        );

        expect(result.messagesApplied).toBe(1);

        const [conversation] = await testDb.select().from(whatsAppConversations).where(eq(whatsAppConversations.phoneNumber, phone));
        expect(conversation?.userId).toBe(customer.user.userId);
        expect(conversation?.adminUnreadCount).toBe(1);
        expect(conversation?.customerServiceWindowExpiresAt).toBeTruthy();

        const messages = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppConversationId, conversation!.whatsAppConversationId));
        expect(messages).toHaveLength(1);
        expect(messages[0]?.body).toBe('Hallo Concierge');
        expect(messages[0]?.direction).toBe('INBOUND');

        const again = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: providerMessageId,
                                            from: phone.slice(1),
                                            type: 'text',
                                            text: { body: 'Hallo Concierge' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            customer.serverRuntime,
        );
        expect(again.messagesApplied).toBe(0);
    });

    it('applies delivered status first-write-wins on outbound audit rows', async () => {
        const setup = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        const outboundWhatsAppMessageId = idCreate();
        const providerMessageId = `wamid.${idCreate()}`;
        await testDb.insert(outboundWhatsAppMessages).values({
            outboundWhatsAppMessageId,
            provider: 'console',
            providerMessageId,
            purpose: 'CONCIERGE_SESSION_REPLY',
            toPhoneNumber: '+491511111111',
            bodySnapshot: 'Hi',
            locale: 'de',
            sentAt: new Date(),
        });

        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    statuses: [
                                        {
                                            id: providerMessageId,
                                            status: 'delivered',
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            setup.serverRuntime,
        );
        expect(result.statusesApplied).toBe(1);

        const [row] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, outboundWhatsAppMessageId));
        expect(row?.deliveredAt).toBeTruthy();
    });

    it('applies emoji reaction onto the target message without a transcript row', async () => {
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({
            firstName: 'Ria',
            lastName: 'React',
            phoneNumber: phone,
        });
        const conversationId = idCreate();
        const targetMessageId = idCreate();
        const targetProviderMessageId = `wamid.${idCreate()}`;
        const reactionProviderMessageId = `wamid.${idCreate()}`;

        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phone,
            userId: customer.user.userId,
            adminUnreadCount: 0,
            lastMessageAt: new Date(),
        });
        await testDb.insert(whatsAppMessages).values({
            whatsAppMessageId: targetMessageId,
            whatsAppConversationId: conversationId,
            direction: 'OUTBOUND',
            messageKind: 'TEXT',
            body: 'Angebot bereit',
            providerMessageId: targetProviderMessageId,
        });

        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: reactionProviderMessageId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'reaction',
                                            reaction: { message_id: targetProviderMessageId, emoji: '👍' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            customer.serverRuntime,
        );

        expect(result.messagesApplied).toBe(1);

        const transcript = await testDb.select().from(whatsAppMessages).where(eq(whatsAppMessages.whatsAppConversationId, conversationId));
        expect(transcript).toHaveLength(1);

        const reactions = await testDb
            .select()
            .from(whatsAppMessageReactions)
            .where(eq(whatsAppMessageReactions.whatsAppMessageId, targetMessageId));
        expect(reactions).toHaveLength(1);
        expect(reactions[0]?.emoji).toBe('👍');
        expect(reactions[0]?.direction).toBe('INBOUND');

        const [conversation] = await testDb
            .select()
            .from(whatsAppConversations)
            .where(eq(whatsAppConversations.whatsAppConversationId, conversationId));
        expect(conversation?.adminUnreadCount).toBe(1);
        expect(conversation?.customerServiceWindowExpiresAt).toBeTruthy();

        const again = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: reactionProviderMessageId,
                                            from: phone.slice(1),
                                            type: 'reaction',
                                            reaction: { message_id: targetProviderMessageId, emoji: '👍' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            customer.serverRuntime,
        );
        expect(again.messagesApplied).toBe(0);

        const clearProviderMessageId = `wamid.${idCreate()}`;
        const cleared = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: clearProviderMessageId,
                                            from: phone.slice(1),
                                            type: 'reaction',
                                            reaction: { message_id: targetProviderMessageId, emoji: '' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            customer.serverRuntime,
        );
        expect(cleared.messagesApplied).toBe(1);
        const [clearedReaction] = await testDb
            .select()
            .from(whatsAppMessageReactions)
            .where(eq(whatsAppMessageReactions.whatsAppMessageId, targetMessageId));
        expect(clearedReaction?.emoji).toBeNull();
    });
});

describe('whatsappCreate webhookSignatureVerify', () => {
    it('accepts a valid X-Hub-Signature-256 and rejects a bad one', () => {
        const appSecret = 'test-app-secret';
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret,
            log: silentLog,
        });
        const rawBody = '{"object":"whatsapp_business_account"}';
        const signature = `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`;
        expect(provider.webhookSignatureVerify({ rawBody, signatureHeader: signature })).toBe(true);
        expect(provider.webhookSignatureVerify({ rawBody, signatureHeader: 'sha256=deadbeef' })).toBe(false);
        expect(provider.webhookSignatureVerify({ rawBody, signatureHeader: null })).toBe(false);
    });
});
