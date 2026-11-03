import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundWhatsAppMessages, whatsAppMessages } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import type { WhatsApp } from '../whatsapp/WhatsApp';
import { whatsappTemplateOutboundSend } from './whatsappOutboundSend';

function providerCreate() {
    return { sendTemplate: vi.fn(async () => ({ providerMessageId: `test-${idCreate()}` })) } as unknown as WhatsApp;
}

describe('whatsappTemplateOutboundSend', () => {
    it('skips invalid phones and email-only purposes without contacting the provider', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const provider = providerCreate();
        // Act
        const invalid = await whatsappTemplateOutboundSend(serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_CREATED',
            locale: 'de',
            toPhoneNumber: '0151',
            bodyParameters: [],
        });
        const emailOnly = await whatsappTemplateOutboundSend(serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_CANCELED',
            locale: 'de',
            toPhoneNumber: phoneNumberCreate(),
            bodyParameters: [],
        });
        // Assert
        expect(invalid).toBeNull();
        expect(emailOnly).toBeNull();
        expect(provider.sendTemplate).not.toHaveBeenCalled();
    });

    it.each(['de', 'en'] as const)('persists the exact %s rendering and opaque URL sent to Meta', async (locale) => {
        // Arrange
        const phone = phoneNumberCreate();
        const { serverRuntime, user } = await commandSetup.withUser({ phoneNumber: phone, locale });
        const provider = providerCreate();
        const requestId = idCreate();
        const linkPath = `${locale === 'en' ? '/en' : ''}/profile/booking-requests/${requestId}`;
        // Act
        const result = await whatsappTemplateOutboundSend(serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_CREATED',
            locale,
            toPhoneNumber: phone,
            bodyParameters: [' Anna ', '2026-12-12', '18:00'],
            linkPath,
            userId: user.userId,
        });
        // Assert
        expect(result).not.toBeNull();
        expect(provider.sendTemplate).toHaveBeenCalledWith({
            toPhoneNumber: phone,
            templateName: 'booking_request_received_customer_v2',
            languageCode: locale,
            bodyParameters: ['Anna', '2026-12-12', '18:00'],
            buttonUrlParameter: result!.outboundWhatsAppMessageId,
        });
        const [audit] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, result!.outboundWhatsAppMessageId));
        const [message] = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.outboundWhatsAppMessageId, result!.outboundWhatsAppMessageId));
        expect(audit?.templateSnapshot?.languageCode).toBe(locale);
        expect(audit?.templateSnapshot?.body).toContain(
            locale === 'de' ? 'danke für deine Buchungsanfrage' : 'thanks for your booking request',
        );
        expect(audit?.templateSnapshot?.body).toContain('🙌');
        expect(audit?.templateSnapshot?.body).not.toContain('{{');
        expect(audit?.templateSnapshot?.buttons[0]?.url).toContain(`/api/whatsapp/links/${result!.outboundWhatsAppMessageId}`);
        expect(audit?.linkPath).toBe(linkPath);
        expect(audit?.sentAt).not.toBeNull();
        expect(message?.templateSnapshot).toEqual(audit?.templateSnapshot);
        expect(message?.body).toBe(audit?.bodySnapshot);
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('rejects incorrect parameters before creating audit history or sending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const provider = providerCreate();
        const phone = phoneNumberCreate();
        // Act
        const result = whatsappTemplateOutboundSend(serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_CREATED',
            locale: 'de',
            toPhoneNumber: phone,
            bodyParameters: ['Anna'],
            linkPath: `/profile/booking-requests/${idCreate()}`,
        });
        // Assert
        await expect(result).rejects.toThrow('Invalid body parameters');
        expect(provider.sendTemplate).not.toHaveBeenCalled();
        expect(await testDb.select().from(outboundWhatsAppMessages).where(eq(outboundWhatsAppMessages.toPhoneNumber, phone))).toEqual([]);
    });

    it('records a provider failure without inventing a sent transcript message', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const provider = providerCreate();
        vi.mocked(provider.sendTemplate).mockRejectedValueOnce(new Error('Template is pending approval'));
        const phone = phoneNumberCreate();
        // Act
        const result = whatsappTemplateOutboundSend(serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_REACTION_REMINDER',
            locale: 'de',
            toPhoneNumber: phone,
            bodyParameters: ['Anna', '2026-12-12'],
        });
        // Assert
        await expect(result).rejects.toThrow('pending approval');
        const [audit] = await testDb.select().from(outboundWhatsAppMessages).where(eq(outboundWhatsAppMessages.toPhoneNumber, phone));
        expect(audit?.failedAt).not.toBeNull();
        expect(audit?.sentAt).toBeNull();
        expect(
            await testDb
                .select()
                .from(whatsAppMessages)
                .where(eq(whatsAppMessages.outboundWhatsAppMessageId, audit!.outboundWhatsAppMessageId)),
        ).toEqual([]);
    });
    it('does not mark a sent message failed when the admin refresh notification fails', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        vi.mocked(serverRuntime.publish.adminUpdates).mockRejectedValueOnce(new Error('Refresh unavailable'));
        const phone = phoneNumberCreate();
        // Act
        const result = await whatsappTemplateOutboundSend(serverRuntime, providerCreate(), {
            purpose: 'BOOKING_REQUEST_CREATED',
            locale: 'en',
            toPhoneNumber: phone,
            bodyParameters: ['Anna', '2026-12-12', '18:00'],
            linkPath: `/profile/booking-requests/${idCreate()}`,
        });
        const [audit] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, result!.outboundWhatsAppMessageId));
        // Assert
        expect(audit?.sentAt).not.toBeNull();
        expect(audit?.failedAt).toBeNull();
    });
});
