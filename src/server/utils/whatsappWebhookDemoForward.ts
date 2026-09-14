import type { Logger } from './loggerCreate';

/** Temporary test mirror: Meta allows one callback URL per app. */
const WHATSAPP_WEBHOOK_DEMO_FORWARD_URL = 'https://demo.people-eat.com/api/webhooks/whatsapp';
const WHATSAPP_WEBHOOK_DEMO_FORWARD_HOST = 'demo.people-eat.com';

/**
 * Non-blocking copy of a Meta WhatsApp webhook POST to the demo deploy.
 * Skips when this process already serves demo (avoids a forward loop).
 * Failures are logged and never affect the primary webhook response.
 */
export function whatsappWebhookDemoForward({
    rawBody,
    signatureHeader,
    webPageUrl,
    log,
}: {
    rawBody: string;
    signatureHeader: string | null;
    webPageUrl: string;
    log: Pick<Logger, 'warn'>;
}): void {
    let currentHost: string;
    try {
        currentHost = new URL(webPageUrl).hostname;
    } catch {
        return;
    }
    if (currentHost === WHATSAPP_WEBHOOK_DEMO_FORWARD_HOST) {
        return;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (signatureHeader) {
        headers['X-Hub-Signature-256'] = signatureHeader;
    }

    void fetch(WHATSAPP_WEBHOOK_DEMO_FORWARD_URL, {
        method: 'POST',
        headers,
        body: rawBody,
    }).catch((error) => {
        log.warn(error instanceof Error ? error : new Error(String(error)));
    });
}
