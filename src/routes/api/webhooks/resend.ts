import { createFileRoute } from '@tanstack/react-router';

import { outboundEmailProviderEventApply } from '../../../server/commands/outboundEmailProviderEventApply';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { ingressEventTypeSet, withIngressSpan } from '../../../server/observability/withIngressSpan';

export const Route = createFileRoute('/api/webhooks/resend')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                return withIngressSpan({ provider: 'resend', route: '/api/webhooks/resend' }, async (span) => {
                    const webhookSecret = environmentVariables.resendWebhookSecret;
                    if (!webhookSecret) {
                        return new Response('RESEND_WEBHOOK_SECRET is not configured', { status: 503 });
                    }

                    const serverRuntime = serverRuntimeGet();
                    const payload = await request.text();
                    const svixId = request.headers.get('svix-id');
                    const svixTimestamp = request.headers.get('svix-timestamp');
                    const svixSignature = request.headers.get('svix-signature');
                    if (!svixId || !svixTimestamp || !svixSignature) {
                        serverRuntime.log.warn(
                            `resend webhook: POST rejected (missing Svix headers; hasId=${Boolean(svixId)} hasTimestamp=${Boolean(svixTimestamp)} hasSignature=${Boolean(svixSignature)})`,
                        );
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
                        serverRuntime.log.warn(`resend webhook: POST rejected (invalid signature; ${message})`);
                        return new Response(message, { status: 400 });
                    }

                    ingressEventTypeSet(span, verified.type);

                    const emailId = verified.data.email_id;
                    if (!emailId) {
                        serverRuntime.log.warn(`resend webhook: skipping event with missing email_id type=${verified.type}`);
                        return new Response(null, { status: 200 });
                    }

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
                        serverRuntime.log.error(error, null);
                        return new Response('Webhook handler failed', { status: 500 });
                    }

                    return new Response(null, { status: 200 });
                });
            },
        },
    },
});
