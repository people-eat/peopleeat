import { createFileRoute } from '@tanstack/react-router';

import { stripeWebhookApply } from '../../../server/commands/stripeWebhookApply';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { ingressEventTypeSet, withIngressSpan } from '../../../server/observability/withIngressSpan';

export const Route = createFileRoute('/api/webhooks/stripe')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                return withIngressSpan({ provider: 'stripe', route: '/api/webhooks/stripe' }, async (span) => {
                    if (!environmentVariables.stripeSecretKey || !environmentVariables.stripeWebhookSecret) {
                        return new Response('Stripe webhook is not configured', { status: 503 });
                    }

                    const payload = Buffer.from(await request.arrayBuffer());
                    const signatureHeader = request.headers.get('stripe-signature');
                    if (!signatureHeader) {
                        return new Response('Missing stripe-signature header', { status: 400 });
                    }

                    const serverRuntime = serverRuntimeGet();
                    let event: { id: string; type: string; dataObject: unknown };
                    try {
                        event = serverRuntime.stripe.webhookEventConstruct({ payload, signatureHeader });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Invalid webhook signature';
                        return new Response(message, { status: 400 });
                    }

                    ingressEventTypeSet(span, event.type);

                    try {
                        await stripeWebhookApply(event, serverRuntime);
                    } catch (error) {
                        serverRuntime.log.error(error);
                        return new Response('Webhook handler failed', { status: 500 });
                    }

                    return new Response(null, { status: 200 });
                });
            },
        },
    },
});
