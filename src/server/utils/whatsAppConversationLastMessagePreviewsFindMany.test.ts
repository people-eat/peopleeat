import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { whatsAppConversations, whatsAppMessages } from '../db/schema';
import { testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { whatsAppConversationLastMessagePreviewsFindMany } from './whatsAppConversationLastMessagePreviewsFindMany';

describe('whatsAppConversationLastMessagePreviewsFindMany', () => {
    it('previews stored legacy text and stored new text without rendering templates on read', async () => {
        // Arrange
        const legacyId = idCreate();
        const currentId = idCreate();
        const emptyId = idCreate();
        await testDb.insert(whatsAppConversations).values(
            [legacyId, currentId, emptyId].map((id) => ({
                whatsAppConversationId: id,
                phoneNumber: phoneNumberCreate(),
                lastMessageAt: new Date(),
            })),
        );
        await testDb.insert(whatsAppMessages).values([
            {
                whatsAppMessageId: idCreate(),
                whatsAppConversationId: legacyId,
                direction: 'OUTBOUND',
                messageKind: 'TEMPLATE',
                body: '  Historical stored text 👋  ',
                createdAt: new Date('2026-01-02T12:00:00Z'),
            },
            {
                whatsAppMessageId: idCreate(),
                whatsAppConversationId: legacyId,
                direction: 'INBOUND',
                messageKind: 'TEXT',
                body: 'Older message',
                createdAt: new Date('2026-01-01T12:00:00Z'),
            },
            {
                whatsAppMessageId: idCreate(),
                whatsAppConversationId: currentId,
                direction: 'OUTBOUND',
                messageKind: 'TEMPLATE',
                body: 'Saved new text 👨🏻‍🍳',
                templateSnapshot: {
                    name: 'saved_version',
                    languageCode: 'de',
                    header: 'Different header',
                    body: 'Different structured text',
                    bodyParameters: [],
                    buttons: [],
                },
            },
        ]);
        // Act
        const previews = await whatsAppConversationLastMessagePreviewsFindMany(testDb, [legacyId, currentId, emptyId]);
        // Assert
        expect(previews).toEqual(
            new Map([
                [legacyId, 'Historical stored text 👋'],
                [currentId, 'Saved new text 👨🏻‍🍳'],
            ]),
        );
    });

    it('returns no previews for an empty conversation list', async () => {
        // Arrange
        const ids: string[] = [];
        // Act
        const previews = await whatsAppConversationLastMessagePreviewsFindMany(testDb, ids);
        // Assert
        expect(previews.size).toBe(0);
    });
});
