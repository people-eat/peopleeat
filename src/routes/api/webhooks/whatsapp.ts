import { createFileRoute } from '@tanstack/react-router';

import { whatsappWebhookApply } from '../../../server/commands/whatsappWebhookApply';
import type { WhatsAppWebhookPayload } from '../../../server/commands/whatsappWebhookApply';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { withIngressSpan } from '../../../server/observability/withIngressSpan';
import { featureToggleIsEnabled } from '../../../server/utils/featureToggleIsEnabled';

export const Route = createFileRoute('/api/webhooks/whatsapp')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const serverRuntime = serverRuntimeGet();
                const url = new URL(request.url);
                const mode = url.searchParams.get('hub.mode');
                const token = url.searchParams.get('hub.verify_token');
                const challenge = url.searchParams.get('hub.challenge');
                const expected = environmentVariables.whatsappWebhookVerifyToken;

                if (mode === 'subscribe' && expected && token === expected && challenge) {
                    serverRuntime.log.info('whatsapp webhook: GET verify challenge accepted');
                    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
                }
                serverRuntime.log.warn(
                    `whatsapp webhook: GET verify rejected (mode=${mode ?? 'null'} tokenMatch=${Boolean(expected && token === expected)} hasChallenge=${Boolean(challenge)})`,
                );
                return new Response('Forbidden', { status: 403 });
            },
            POST: async ({ request }) => {
                return withIngressSpan({ provider: 'whatsapp', route: '/api/webhooks/whatsapp' }, async () => {
                    const serverRuntime = serverRuntimeGet();
                    const rawBody = await request.text();
                    const signatureHeader = request.headers.get('x-hub-signature-256');

                    if (environmentVariables.whatsappTransport === 'meta') {
                        const signatureValidationEnabled = await featureToggleIsEnabled(
                            'WHATSAPP_WEBHOOK_SIGNATURE_VALIDATION',
                            serverRuntime,
                        );
                        if (signatureValidationEnabled) {
                            const valid = serverRuntime.whatsapp.webhookSignatureVerify({ rawBody, signatureHeader });
                            if (!valid) {
                                serverRuntime.log.warn(
                                    `whatsapp webhook: POST rejected (invalid signature; hasHeader=${Boolean(signatureHeader)} bodyBytes=${Buffer.byteLength(rawBody, 'utf8')}). Confirm WHATSAPP_APP_SECRET matches the Meta app secret, or disable WHATSAPP_WEBHOOK_SIGNATURE_VALIDATION until verified.`,
                                );
                                return new Response('Invalid signature', { status: 400 });
                            }
                        }
                    }

                    let payload: WhatsAppWebhookPayload;
                    try {
                        payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
                    } catch {
                        serverRuntime.log.warn('whatsapp webhook: POST rejected (invalid JSON)');
                        return new Response('Invalid JSON', { status: 400 });
                    }

                    try {
                        const result = await whatsappWebhookApply(payload, serverRuntime);
                        serverRuntime.log.info(
                            `whatsapp webhook: applied statuses=${result.statusesApplied} messages=${result.messagesApplied}`,
                        );
                    } catch (error) {
                        serverRuntime.log.error(error, null);
                        return new Response('Webhook handler failed', { status: 500 });
                    }

                    return new Response(null, { status: 200 });
                });
            },
        },
    },
});
