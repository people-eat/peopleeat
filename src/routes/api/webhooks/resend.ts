import { createFileRoute } from '@tanstack/react-router';

import { outboundEmailProviderEventApply } from '../../../server/commands/outboundEmailProviderEventApply';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';

export const Route = createFileRoute('/api/webhooks/resend')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const webhookSecret = environmentVariables.resendWebhookSecret;
                if (!webhookSecret) {
                    return new Response('RESEND_WEBHOOK_SECRET is not configured', { status: 503 });
                }

                const payload = await request.text();
                const svixId = request.headers.get('svix-id');
                const svixTimestamp = request.headers.get('svix-timestamp');
                const svixSignature = request.headers.get('svix-signature');
                if (!svixId || !svixTimestamp || !svixSignature) {
                    return new Response('Missing Svix signature headers', { status: 400 });
                }

                let verified: {
                    type: string;
                    created_at: string;
                    data: { email_id?: string; error?: { message?: string } };
                };
                try {
                    const { Resend } = await import('resend');
                    const resend = new Resend(environmentVariables.resendApiKey ?? 're_webhook_verify_only');
                    verified = resend.webhooks.verify({
                        payload,
                        headers: {
                            id: svixId,
                            timestamp: svixTimestamp,
                            signature: svixSignature,
                        },
                        webhookSecret,
                    }) as typeof verified;
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Invalid webhook signature';
                    return new Response(message, { status: 400 });
                }

                const emailId = verified.data.email_id;
                if (!emailId) {
                    return new Response(null, { status: 200 });
                }

                const serverRuntime = serverRuntimeGet();
                try {
                    await outboundEmailProviderEventApply(
                        {
                            type: verified.type,
                            emailId,
                            createdAt: new Date(verified.created_at),
                            failureReason: verified.data.error?.message ?? null,
                        },
                        serverRuntime,
                    );
                } catch (error) {
                    serverRuntime.log.error(error);
                    return new Response('Webhook handler failed', { status: 500 });
                }

                return new Response(null, { status: 200 });
            },
        },
    },
});
