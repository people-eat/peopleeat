import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { outboundWhatsAppMessages, whatsAppConversations, whatsAppMessages } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { whatsappCreate } from '../whatsapp/whatsappCreate';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';
import type { Logger } from './loggerCreate';
import { whatsappTemplateOutboundSend } from './whatsappOutboundSend';

vi.mock('./featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

const silentLog: Logger = {
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    drain: async () => {},
};

describe('whatsappTemplateOutboundSend', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);
    });

    it('skips when phone is missing or invalid', async () => {
        const setup = await commandSetup.withUser();
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret: undefined,
            log: silentLog,
        });

        const skipped = await whatsappTemplateOutboundSend(setup.serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            toPhoneNumber: '0151',
            locale: 'de',
            bodyParameters: ['A', 'B', 'C'],
            bodySnapshot: 'x',
            userId: setup.user.userId,
        });
        expect(skipped).toBeNull();
    });

    it('skips when purpose has no approved Meta template name', async () => {
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ phoneNumber: phone });
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret: undefined,
            log: silentLog,
        });
        const sendTemplate = vi.spyOn(provider, 'sendTemplate');

        const skipped = await whatsappTemplateOutboundSend(customer.serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_CANCELED',
            toPhoneNumber: phone,
            locale: 'de',
            bodyParameters: ['Customer'],
            bodySnapshot: 'cancelled',
            userId: customer.user.userId,
        });

        expect(skipped).toBeNull();
        expect(sendTemplate).not.toHaveBeenCalled();
    });

    it('falls back to de Meta language when English templates toggle is off', async () => {
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ phoneNumber: phone });
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret: undefined,
            log: silentLog,
        });
        const sendTemplate = vi.spyOn(provider, 'sendTemplate');

        await whatsappTemplateOutboundSend(customer.serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            toPhoneNumber: phone,
            locale: 'en',
            bodyParameters: ['A', 'B', 'C'],
            bodySnapshot: 'Hello',
            userId: customer.user.userId,
        });

        expect(featureToggleIsEnabled).toHaveBeenCalledWith('WHATSAPP_ENGLISH_TEMPLATES', customer.serverRuntime, customer.user.userId);
        expect(sendTemplate).toHaveBeenCalledWith(
            expect.objectContaining({
                languageCode: 'de',
                templateName: 'cook_booking_request_offer_create__for_user',
            }),
        );
    });

    it('uses en Meta language when English templates toggle is on', async () => {
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ phoneNumber: phone });
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret: undefined,
            log: silentLog,
        });
        const sendTemplate = vi.spyOn(provider, 'sendTemplate');

        await whatsappTemplateOutboundSend(customer.serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            toPhoneNumber: phone,
            locale: 'en',
            bodyParameters: ['A', 'B', 'C'],
            bodySnapshot: 'Hello',
            userId: customer.user.userId,
        });

        expect(sendTemplate).toHaveBeenCalledWith(expect.objectContaining({ languageCode: 'en' }));
    });

    it('persists audit + transcript rows on console transport', async () => {
        const phone = phoneNumberCreate();
        const customer = await commandSetup.withUser({ phoneNumber: phone, firstName: 'Customer' });
        const provider = whatsappCreate({
            transport: 'console',
            accessToken: undefined,
            phoneNumberId: undefined,
            appSecret: undefined,
            log: silentLog,
        });
        const offerId = idCreate();

        const result = await whatsappTemplateOutboundSend(customer.serverRuntime, provider, {
            purpose: 'BOOKING_REQUEST_OFFER_CREATED',
            toPhoneNumber: phone,
            locale: 'de',
            bodyParameters: ['Customer', 'Chef', 'Birthday'],
            bodySnapshot: 'Hallo Customer, Chef hat ein Angebot erstellt.',
            userId: customer.user.userId,
            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: offerId },
        });

        expect(result?.outboundWhatsAppMessageId).toBeTruthy();

        const [audit] = await testDb
            .select()
            .from(outboundWhatsAppMessages)
            .where(eq(outboundWhatsAppMessages.outboundWhatsAppMessageId, result!.outboundWhatsAppMessageId));
        expect(audit?.purpose).toBe('BOOKING_REQUEST_OFFER_CREATED');
        expect(audit?.sentAt).toBeTruthy();
        expect(audit?.providerMessageId).toMatch(/^console-tpl-/);

        const [conversation] = await testDb.select().from(whatsAppConversations).where(eq(whatsAppConversations.phoneNumber, phone));
        expect(conversation?.userId).toBe(customer.user.userId);

        const messages = await testDb
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppConversationId, conversation!.whatsAppConversationId));
        expect(messages).toHaveLength(1);
        expect(messages[0]?.direction).toBe('OUTBOUND');
        expect(messages[0]?.messageKind).toBe('TEMPLATE');
        expect(messages[0]?.outboundWhatsAppMessageId).toBe(result!.outboundWhatsAppMessageId);
    });
});
