import { describe, expect, it } from 'vitest';

import type { WhatsAppMessage } from '../db/schema';
import { toGqlWhatsAppMessages } from './toGqlWhatsAppMessages';

const customer = { display: 'Customer', status: 'ACTIVE' as const, createdAt: new Date(0), profilePicture: null };

function messageCreate(overrides: Partial<WhatsAppMessage> = {}): WhatsAppMessage {
    return {
        whatsAppMessageId: 'message',
        whatsAppConversationId: 'conversation',
        direction: 'OUTBOUND',
        messageKind: 'TEMPLATE',
        body: 'Saved message at send time 👋',
        templateSnapshot: null,
        linkClickedAt: null,
        buttonPayload: null,
        providerMessageId: null,
        outboundWhatsAppMessageId: null,
        sentByAdminUserId: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        createdAt: new Date(0),
        ...overrides,
    };
}

describe('toGqlWhatsAppMessages', () => {
    it('preserves historical template text without requiring a structured snapshot', () => {
        // Arrange
        const message = messageCreate({ body: '  Original stored text\n\nwith formatting and emojis 👨🏻‍🍳  ' });
        // Act
        const messages = toGqlWhatsAppMessages({ messages: [message], customer, attachmentsByMessageId: new Map() });
        // Assert
        expect(messages).toMatchObject([{ body: message.body, isOwn: true, deliveryStatus: 'SENT' }]);
    });

    it('keeps plain text authoritative when snapshot formatting or contents differ', () => {
        // Arrange
        const message = messageCreate({
            templateSnapshot: {
                name: 'saved_template_version',
                languageCode: 'en',
                header: 'Different header',
                body: 'Different structured text',
                bodyParameters: [],
                buttons: [],
            },
        });
        // Act
        const messages = toGqlWhatsAppMessages({ messages: [message], customer, attachmentsByMessageId: new Map() });
        // Assert
        expect(messages).toMatchObject([{ body: 'Saved message at send time 👋' }]);
    });

    it('preserves received webhook text as stored', () => {
        // Arrange
        const message = messageCreate({ direction: 'INBOUND', messageKind: 'TEXT', body: 'Received from customer 💬' });
        // Act
        const messages = toGqlWhatsAppMessages({ messages: [message], customer, attachmentsByMessageId: new Map() });
        // Assert
        expect(messages).toMatchObject([{ body: message.body, isOwn: false, deliveryStatus: null, author: customer }]);
    });
});
