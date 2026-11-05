import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY } from '../../shared/whatsappVoiceMessage';
import {
    fileUploads,
    outboundWhatsAppMessages,
    whatsAppConversations,
    whatsAppMessageAttachments,
    whatsAppMessageReactions,
    whatsAppMessages,
} from '../db/schema';
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
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();

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
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
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
        expect(setup.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();

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
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();

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
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(2);
    });

    it('applies sent, read, and failed statuses and ignores an unknown status', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Status' });
        const phone = phoneNumberCreate();
        const conversationId = idCreate();
        await testDb.insert(whatsAppConversations).values({
            whatsAppConversationId: conversationId,
            phoneNumber: phone,
            lastMessageAt: new Date(),
            adminUnreadCount: 0,
        });

        const sentId = idCreate();
        const sentProviderId = `wamid.${idCreate()}`;
        const readId = idCreate();
        const readProviderId = `wamid.${idCreate()}`;
        const failedId = idCreate();
        const failedProviderId = `wamid.${idCreate()}`;
        const unknownId = idCreate();
        const unknownProviderId = `wamid.${idCreate()}`;
        const sentAtSeconds = Math.floor(Date.now() / 1000) - 30;
        const readAtSeconds = Math.floor(Date.now() / 1000) - 10;

        await testDb.insert(outboundWhatsAppMessages).values([
            {
                outboundWhatsAppMessageId: sentId,
                provider: 'console',
                providerMessageId: sentProviderId,
                purpose: 'CONCIERGE_SESSION_REPLY',
                toPhoneNumber: phone,
                bodySnapshot: 'Sent',
                locale: 'de',
            },
            {
                outboundWhatsAppMessageId: readId,
                provider: 'console',
                providerMessageId: readProviderId,
                purpose: 'CONCIERGE_SESSION_REPLY',
                toPhoneNumber: phone,
                bodySnapshot: 'Read',
                locale: 'de',
            },
            {
                outboundWhatsAppMessageId: failedId,
                provider: 'console',
                providerMessageId: failedProviderId,
                purpose: 'CONCIERGE_SESSION_REPLY',
                toPhoneNumber: phone,
                bodySnapshot: 'Failed',
                locale: 'de',
            },
            {
                outboundWhatsAppMessageId: unknownId,
                provider: 'console',
                providerMessageId: unknownProviderId,
                purpose: 'CONCIERGE_SESSION_REPLY',
                toPhoneNumber: phone,
                bodySnapshot: 'Unknown',
                locale: 'de',
            },
        ]);
        const readTranscriptId = idCreate();
        const failedTranscriptId = idCreate();
        await testDb.insert(whatsAppMessages).values([
            {
                whatsAppMessageId: readTranscriptId,
                whatsAppConversationId: conversationId,
                direction: 'OUTBOUND',
                messageKind: 'TEXT',
                body: 'Read',
                providerMessageId: readProviderId,
                outboundWhatsAppMessageId: readId,
            },
            {
                whatsAppMessageId: failedTranscriptId,
                whatsAppConversationId: conversationId,
                direction: 'OUTBOUND',
                messageKind: 'TEXT',
                body: 'Failed',
                providerMessageId: failedProviderId,
                outboundWhatsAppMessageId: failedId,
            },
        ]);

        // Act
        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    statuses: [
                                        { id: sentProviderId, status: 'sent', timestamp: String(sentAtSeconds) },
                                        {
                                            id: readProviderId,
                                            status: 'read',
                                            timestamp: String(readAtSeconds),
                                            conversation: { id: 'conv_meta' },
                                            pricing: { category: 'service' },
                                        },
                                        {
                                            id: failedProviderId,
                                            status: 'failed',
                                            timestamp: String(sentAtSeconds),
                                            errors: [{ message: 'Message undeliverable' }],
                                        },
                                        { id: unknownProviderId, status: 'played', timestamp: String(sentAtSeconds) },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
            setup.serverRuntime,
        );
        const replay = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    statuses: [{ id: readProviderId, status: 'read', timestamp: String(Math.floor(Date.now() / 1000)) }],
                                },
                            },
                        ],
                    },
                ],
            },
            setup.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ statusesApplied: 3, messagesApplied: 0 });
        expect(replay.statusesApplied).toBe(0);
        expect(setup.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();

        const [sent] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, sentId));
        expect(sent?.sentAt).toEqual(new Date(sentAtSeconds * 1000));

        const [read] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, readId));
        expect(read?.readAt).toEqual(new Date(readAtSeconds * 1000));
        expect(read?.providerConversationId).toBe('conv_meta');
        expect(read?.pricingCategory).toBe('service');
        const [readTranscript] = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppMessageId, readTranscriptId));
        expect(readTranscript?.readAt).toEqual(new Date(readAtSeconds * 1000));

        const [failed] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, failedId));
        expect(failed?.failedAt).toEqual(new Date(sentAtSeconds * 1000));
        expect(failed?.failureReason).toBe('Message undeliverable');
        const [failedTranscript] = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppMessageId, failedTranscriptId));
        expect(failedTranscript?.failedAt).toEqual(new Date(sentAtSeconds * 1000));

        const [unknown] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, unknownId));
        expect(unknown?.sentAt).toBeNull();
        expect(unknown?.deliveredAt).toBeNull();
        expect(unknown?.readAt).toBeNull();
        expect(unknown?.failedAt).toBeNull();
    });

    it('stores button and interactive replies', async () => {
        // Arrange
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Button', phoneNumber: phone });
        const buttonId = `wamid.${idCreate()}`;
        const interactiveId = `wamid.${idCreate()}`;

        // Act
        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: buttonId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'button',
                                            button: { text: 'Ja bitte', payload: 'YES' },
                                        },
                                        {
                                            id: interactiveId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'interactive',
                                            interactive: {
                                                type: 'button_reply',
                                                button_reply: { id: 'more-time', title: 'Mehr Zeit' },
                                            },
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

        // Assert
        expect(result).toEqual({ statusesApplied: 0, messagesApplied: 2 });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        const [conversation] = await testDb.select().from(whatsAppConversations).where(eq(whatsAppConversations.phoneNumber, phone));
        const messages = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppConversationId, conversation!.whatsAppConversationId));
        expect(messages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    messageKind: 'BUTTON_REPLY',
                    body: 'Ja bitte',
                    buttonPayload: 'YES',
                    providerMessageId: buttonId,
                }),
                expect.objectContaining({
                    messageKind: 'INTERACTIVE',
                    body: 'Mehr Zeit',
                    buttonPayload: 'more-time',
                    providerMessageId: interactiveId,
                }),
            ]),
        );
    });

    it('stores downloaded image and voice media, and a fallback when download returns null', async () => {
        // Arrange
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ firstName: 'Mia', lastName: 'Media', phoneNumber: phone });
        vi.mocked(customer.serverRuntime.whatsapp.downloadMedia).mockImplementation(async (mediaId: string) => {
            if (mediaId === 'media-missing') return null;
            if (mediaId === 'voice-1') return { buffer: Buffer.from('voice'), mimeType: 'audio/ogg' };
            return { buffer: Buffer.from('image-bytes'), mimeType: 'image/jpeg' };
        });
        const imageId = `wamid.${idCreate()}`;
        const voiceId = `wamid.${idCreate()}`;
        const missingId = `wamid.${idCreate()}`;

        // Act
        const result = await whatsappWebhookApply(
            {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            id: imageId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'image',
                                            image: { id: 'media-image', caption: 'Foto' },
                                        },
                                        {
                                            id: voiceId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'voice',
                                            voice: { id: 'voice-1' },
                                        },
                                        {
                                            id: missingId,
                                            from: phone.slice(1),
                                            timestamp: String(Math.floor(Date.now() / 1000)),
                                            type: 'image',
                                            image: { id: 'media-missing' },
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

        // Assert
        expect(result).toEqual({ statusesApplied: 0, messagesApplied: 3 });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(customer.serverRuntime.whatsapp.downloadMedia).toHaveBeenCalledWith('media-image');
        expect(customer.serverRuntime.whatsapp.downloadMedia).toHaveBeenCalledWith('voice-1');
        expect(customer.serverRuntime.whatsapp.downloadMedia).toHaveBeenCalledWith('media-missing');

        const [conversation] = await testDb.select().from(whatsAppConversations).where(eq(whatsAppConversations.phoneNumber, phone));
        const messages = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppConversationId, conversation!.whatsAppConversationId));
        const image = messages.find((message) => message.providerMessageId === imageId);
        const voice = messages.find((message) => message.providerMessageId === voiceId);
        const missing = messages.find((message) => message.providerMessageId === missingId);
        expect(image).toMatchObject({ messageKind: 'MEDIA', body: 'Foto' });
        expect(voice).toMatchObject({ messageKind: 'MEDIA', body: WHATSAPP_VOICE_MESSAGE_PREVIEW_BODY });
        expect(missing).toMatchObject({ messageKind: 'MEDIA', body: '[Medien konnten nicht geladen werden]' });

        const imageJoins = await testDb
            .select()
            .from(whatsAppMessageAttachments)
            .where(eq(whatsAppMessageAttachments.whatsAppMessageId, image!.whatsAppMessageId));
        expect(imageJoins).toHaveLength(1);
        const [imageFile] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, imageJoins[0]!.fileUploadId));
        expect(imageFile).toMatchObject({ filename: 'whatsapp-media.jpg', mediaType: 'image/jpeg', userId: null });

        const voiceJoins = await testDb
            .select()
            .from(whatsAppMessageAttachments)
            .where(eq(whatsAppMessageAttachments.whatsAppMessageId, voice!.whatsAppMessageId));
        expect(voiceJoins).toHaveLength(1);
        const [voiceFile] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, voiceJoins[0]!.fileUploadId));
        expect(voiceFile).toMatchObject({ filename: 'whatsapp-media.ogg', mediaType: 'audio/ogg' });

        const missingJoins = await testDb
            .select()
            .from(whatsAppMessageAttachments)
            .where(eq(whatsAppMessageAttachments.whatsAppMessageId, missing!.whatsAppMessageId));
        expect(missingJoins).toHaveLength(0);
    });

    it('stores unsupported inbound content and still publishes', async () => {
        // Arrange
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ firstName: 'Una', lastName: 'Unsupported', phoneNumber: phone });
        const providerMessageId = `wamid.${idCreate()}`;

        // Act
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
                                            type: 'location',
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

        // Assert
        expect(result).toEqual({ statusesApplied: 0, messagesApplied: 1 });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        const [conversation] = await testDb.select().from(whatsAppConversations).where(eq(whatsAppConversations.phoneNumber, phone));
        const [message] = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppConversationId, conversation!.whatsAppConversationId));
        expect(message).toMatchObject({
            messageKind: 'UNSUPPORTED',
            body: '[Unsupported message content]',
            direction: 'INBOUND',
        });
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
