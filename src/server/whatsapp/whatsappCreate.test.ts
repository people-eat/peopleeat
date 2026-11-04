import { afterEach, describe, expect, it, vi } from 'vitest';

import { whatsappTemplateDefinitionFind } from '../domain/whatsappTemplates';
import type { Logger } from '../utils/loggerCreate';
import { whatsappCreate } from './whatsappCreate';
import { whatsappTemplateMetaPayloadCreate } from './whatsappTemplatesMeta';

const log: Logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, drain: async () => {} };
const site = 'https://people-eat.com';
const name = 'booking_request_received_customer_v2';
function provider() {
    return whatsappCreate({
        transport: 'meta',
        accessToken: 'test-token',
        phoneNumberId: 'phone-id',
        businessAccountId: 'account-id',
        appSecret: 'test-secret',
        webPageUrl: site,
        log,
    });
}
const sendArgs = {
    toPhoneNumber: '+4915123456789',
    templateName: name,
    languageCode: 'en',
    bodyParameters: ['Anna', '2026-12-12', '18:00'],
    buttonUrlParameter: 'ExampleWhatsAppLink01',
};

afterEach(() => vi.restoreAllMocks());

describe('whatsappCreate template approval checks', () => {
    it.each([
        { status: 'PENDING', category: 'UTILITY', changed: false, reason: 'status PENDING' },
        { status: 'APPROVED', category: 'MARKETING', changed: false, reason: 'category MARKETING' },
        { status: 'APPROVED', category: 'UTILITY', changed: true, reason: 'BODY text differs' },
    ])('blocks $status/$category templates and copy drift before sending', async ({ status, category, changed, reason }) => {
        // Arrange
        const payload = whatsappTemplateMetaPayloadCreate(whatsappTemplateDefinitionFind(name), 'en', site);
        if (changed) payload.components[1]!.text = 'Different approved copy';
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(
                new Response(JSON.stringify({ data: [{ ...payload, id: 'template-id', status, category }] }), { status: 200 }),
            );
        // Act
        const result = provider().sendTemplate(sendArgs);
        // Assert
        await expect(result).rejects.toThrow(`blocked: ${reason}`);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(String(fetch.mock.calls[0]![0])).toContain('/account-id/message_templates');
    });

    it('sends only after an exact Utility approval check and passes only the URL suffix', async () => {
        // Arrange
        const payload = whatsappTemplateMetaPayloadCreate(whatsappTemplateDefinitionFind(name), 'en', site);
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ data: [{ ...payload, id: 'template-id', status: 'APPROVED', category: 'UTILITY' }] }), {
                    status: 200,
                }),
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'wamid.example' }] }), { status: 200 }));
        // Act
        const result = await provider().sendTemplate(sendArgs);
        // Assert
        expect(result.providerMessageId).toBe('wamid.example');
        expect(fetch).toHaveBeenCalledTimes(2);
        const sent = JSON.parse(String(fetch.mock.calls[1]![1]?.body));
        expect(sent.template.language.code).toBe('en');
        expect(sent.template.components).toContainEqual({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'ExampleWhatsAppLink01' }],
        });
        expect(sent.to).toBe('4915123456789');
    });

    it('sends when the approved button host is another environment on the same tracking path', async () => {
        // Arrange
        const payload = whatsappTemplateMetaPayloadCreate(whatsappTemplateDefinitionFind(name), 'en', 'https://people-eat.com');
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ data: [{ ...payload, id: 'template-id', status: 'APPROVED', category: 'UTILITY' }] }), {
                    status: 200,
                }),
            )
            .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'wamid.example' }] }), { status: 200 }));
        const demo = whatsappCreate({
            transport: 'meta',
            accessToken: 'test-token',
            phoneNumberId: 'phone-id',
            businessAccountId: 'account-id',
            appSecret: 'test-secret',
            webPageUrl: 'https://demo.people-eat.com',
            log,
        });
        // Act
        const result = await demo.sendTemplate(sendArgs);
        // Assert
        expect(result.providerMessageId).toBe('wamid.example');
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
