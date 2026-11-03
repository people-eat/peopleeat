import { describe, expect, it } from 'vitest';

import { whatsappTemplateNameByPurpose } from './whatsapp';
import { whatsappTemplateDefinitionFind, whatsappTemplateDefinitions, whatsappTemplateSnapshotCreate } from './whatsappTemplates';

describe('WhatsApp template catalog', () => {
    it('covers every configured purpose with both locales and exact parameter contracts', () => {
        // Arrange
        const names = Object.values(whatsappTemplateNameByPurpose).filter((name) => name !== null);
        // Act
        const definitions = names.map(whatsappTemplateDefinitionFind);
        // Assert
        expect(new Set(whatsappTemplateDefinitions.map((entry) => entry.name)).size).toBe(21);
        for (const definition of definitions) {
            expect(definition.category).toBe('UTILITY');
            expect(definition.name).toMatch(/^[a-z_]+_v\d+$/u);
            for (const locale of ['de', 'en'] as const) {
                const tokens = [...new Set(definition[locale].body.match(/\{\{\d+\}\}/gu))];
                expect(tokens).toEqual(definition.parameters.map((_parameter, index) => `{{${index + 1}}}`));
                const snapshot = whatsappTemplateSnapshotCreate(
                    definition,
                    locale,
                    definition.examples,
                    definition[locale].buttonLabel ? 'https://people-eat.com/api/whatsapp/links/example' : undefined,
                );
                expect(snapshot.body).not.toMatch(/\{\{\d+\}\}/u);
                expect(snapshot.body).toMatch(/\p{Extended_Pictographic}/u);
                expect(definition[locale].body.length).toBeLessThanOrEqual(1024);
                expect(definition[locale].header.length).toBeLessThanOrEqual(60);
            }
        }
    });

    it('keeps post-payment notifications and closures email-only', () => {
        // Arrange
        const purposes = [
            'BOOKING_REQUEST_OFFER_ACCEPTED',
            'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
            'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
            'BOOKING_REQUEST_CANCELED',
            'BOOKING_REQUEST_CANCELED_COOK',
        ] as const;
        // Act
        const names = purposes.map((purpose) => whatsappTemplateNameByPurpose[purpose]);
        // Assert
        expect(names).toEqual(purposes.map(() => null));
    });

    it('does not recursively substitute placeholder-like customer text', () => {
        // Arrange
        const definition = whatsappTemplateDefinitionFind('offer_chat_message_received_customer_v1');
        // Act
        const snapshot = whatsappTemplateSnapshotCreate(
            definition,
            'en',
            ['{{2}}', 'Michael'],
            'https://people-eat.com/api/whatsapp/links/example',
        );
        // Assert
        expect(snapshot.body).toContain('*Hello {{2}},*');
        expect(snapshot.body).toContain('from Michael');
    });
});
