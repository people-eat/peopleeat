import { describe, expect, it } from 'vitest';

import { whatsappMessageText } from './whatsappMessageText';

describe('whatsappMessageText', () => {
    it('uses the saved snapshot rather than fabricated display text', () => {
        // Arrange
        const message = {
            direction: 'OUTBOUND' as const,
            messageKind: 'TEMPLATE' as const,
            body: 'Incorrect summary',
            templateSnapshot: {
                name: 'previous_version',
                languageCode: 'en' as const,
                header: 'Original header',
                body: 'Exact sent body 👋',
                bodyParameters: [],
                buttons: [],
            },
        };
        // Act
        const text = whatsappMessageText(message);
        // Assert
        expect(text).toBe('Original header\n\nExact sent body 👋');
    });
    it('marks missing historical parameters honestly and preserves actual free-form text', () => {
        // Arrange
        const legacy = {
            direction: 'OUTBOUND' as const,
            messageKind: 'TEMPLATE' as const,
            body: 'Invented old summary',
            templateSnapshot: null,
        };
        // Act
        const text = whatsappMessageText(legacy);
        const actual = whatsappMessageText({ ...legacy, messageKind: 'TEXT' });
        // Assert
        expect(text).toContain('wording unverified');
        expect(text).not.toContain('Invented old summary');
        expect(actual).toBe(legacy.body);
    });
});
