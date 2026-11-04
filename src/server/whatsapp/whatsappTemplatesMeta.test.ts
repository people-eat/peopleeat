import { afterEach, describe, expect, it, vi } from 'vitest';

import { whatsappTemplateDefinitionFind } from '../domain/whatsappTemplates';
import { whatsappTemplateBlockReason, whatsappTemplateMetaPayloadCreate, whatsappTemplatesMetaCreate } from './whatsappTemplatesMeta';

afterEach(() => vi.restoreAllMocks());

describe('whatsappTemplatesMetaCreate', () => {
    it('includes the Meta reason when the template list is rejected', async () => {
        // Arrange
        const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: {
                        message: '(#100) Tried accessing nonexisting field (message_templates) on node type (WhatsAppBusinessPhoneNumber)',
                        code: 100,
                        error_subcode: 33,
                        fbtrace_id: 'AHUox',
                    },
                }),
                { status: 400 },
            ),
        );
        const client = whatsappTemplatesMetaCreate({ accessToken: ' token ', businessAccountId: ' 12345 ' });
        // Act
        const result = client.findMany('booking_request_received_customer_v2');
        // Assert
        await expect(result).rejects.toThrow(
            'Meta template management failed (400, code 100, subcode 33): (#100) Tried accessing nonexisting field (message_templates) on node type (WhatsAppBusinessPhoneNumber) fbtrace_id=AHUox',
        );
        expect(String(fetch.mock.calls[0]![0])).toContain('/v22.0/12345/message_templates');
        expect(fetch.mock.calls[0]![1]?.headers).toEqual({ Authorization: 'Bearer token' });
    });

    it('names a button url that leaves the tracking path', () => {
        // Arrange
        const definition = whatsappTemplateDefinitionFind('booking_request_received_customer_v2');
        const payload = whatsappTemplateMetaPayloadCreate(definition, 'de', 'https://demo.people-eat.com');
        const buttons = payload.components[2]?.buttons;
        if (!buttons?.[0] || !('url' in buttons[0])) throw new Error('expected a URL button');
        buttons[0].url = 'https://example.com/other/{{1}}';
        // Act
        const reason = whatsappTemplateBlockReason(
            { ...payload, id: 'template-id', status: 'APPROVED', category: 'UTILITY' },
            definition,
            'de',
            'https://demo.people-eat.com',
        );
        // Assert
        expect(reason).toContain('https://example.com/other/{{1}}');
    });
});
