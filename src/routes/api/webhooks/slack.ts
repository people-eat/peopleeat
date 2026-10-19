import { createFileRoute } from '@tanstack/react-router';

import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { withIngressSpan } from '../../../server/observability/withIngressSpan';
import { slackWebhookSignatureVerify } from '../../../server/slack/slackWebhookSignatureVerify';

/**
 * Slack Interactivity Request URL.
 *
 * Ops messages use URL buttons (`In Admin öffnen`). Slack still POSTs here on
 * click and expects HTTP 200 within a few seconds — otherwise the client shows
 * "This app responded with status code …". We verify the signing secret and
 * ack; no interactive actions are handled yet.
 */
export const Route = createFileRoute('/api/webhooks/slack')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                return withIngressSpan({ provider: 'slack', route: '/api/webhooks/slack' }, async () => {
                    const serverRuntime = serverRuntimeGet();
                    const signingSecret = environmentVariables.slackSigningSecret;
                    if (!signingSecret) {
                        return new Response('SLACK_SIGNING_SECRET is not configured', { status: 503 });
                    }

                    const rawBody = await request.text();
                    const signatureHeader = request.headers.get('x-slack-signature');
                    const timestampHeader = request.headers.get('x-slack-request-timestamp');

                    // Legacy SSL check Slack may send when saving the Request URL.
                    if (rawBody === 'ssl_check=1' || new URL(request.url).searchParams.get('ssl_check') === '1') {
                        return new Response(null, { status: 200 });
                    }

                    const valid = slackWebhookSignatureVerify({
                        rawBody,
                        signatureHeader,
                        timestampHeader,
                        signingSecret,
                    });
                    if (!valid) {
                        serverRuntime.log.warn(
                            `slack webhook: POST rejected (invalid signature; hasSignature=${Boolean(signatureHeader)} hasTimestamp=${Boolean(timestampHeader)} bodyBytes=${Buffer.byteLength(rawBody, 'utf8')})`,
                        );
                        return new Response('Invalid signature', { status: 400 });
                    }

                    return new Response(null, { status: 200 });
                });
            },
        },
    },
});
