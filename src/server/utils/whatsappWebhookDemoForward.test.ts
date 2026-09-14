import { afterEach, describe, expect, it, vi } from 'vitest';

import { whatsappWebhookDemoForward } from './whatsappWebhookDemoForward';

describe('whatsappWebhookDemoForward', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('forwards the raw body and signature when not on demo', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const warn = vi.fn();

        whatsappWebhookDemoForward({
            rawBody: '{"object":"whatsapp_business_account"}',
            signatureHeader: 'sha256=abc',
            webPageUrl: 'https://people-eat.com',
            log: { warn },
        });

        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(fetchMock).toHaveBeenCalledWith('https://demo.people-eat.com/api/webhooks/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': 'sha256=abc',
            },
            body: '{"object":"whatsapp_business_account"}',
        });
        expect(warn).not.toHaveBeenCalled();
    });

    it('skips when WEB_PAGE_URL is already the demo host', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        whatsappWebhookDemoForward({
            rawBody: '{}',
            signatureHeader: null,
            webPageUrl: 'https://demo.people-eat.com',
            log: { warn: vi.fn() },
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('logs a warn and does not throw when fetch rejects', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);
        const warn = vi.fn();

        whatsappWebhookDemoForward({
            rawBody: '{}',
            signatureHeader: null,
            webPageUrl: 'https://people-eat.com',
            log: { warn },
        });

        await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
        expect(warn.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
});
