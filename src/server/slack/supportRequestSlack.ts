import { eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackAdminSupportRequestUrl } from './slackAdminUrls';
import type { SlackField } from './slackBlocks';
import { slackMessageBlocksBuild } from './slackBlocks';
import { SLACK_CTA } from './slackCta';

export type SupportRequestSlackRootPostArgs = {
    supportRequestId: string;
    userId: string;
    customerName: string;
    subject: string;
    bodyPreview: string;
};

export type SupportRequestSlackThreadReplyArgs = {
    supportRequestId: string;
    header: string;
    fields?: SlackField[];
    body?: string;
    broadcast?: boolean;
};

/**
 * Posts the support-request root message and persists `{ slackTs, slackChannelId }`
 * on `SupportRequests.references`. Fail-soft.
 */
export async function supportRequestSlackRootPost(
    serverRuntime: ServerRuntime,
    args: SupportRequestSlackRootPostArgs,
): Promise<{ channelId: string; ts: string } | undefined> {
    const channelId = serverRuntime.slack.channels.supportRequests;
    if (!channelId) {
        return undefined;
    }

    const { text, blocks } = slackMessageBlocksBuild({
        header: `Neue Support-Anfrage · ${args.customerName}`,
        fields: [{ label: 'Betreff', value: args.subject }],
        body: args.bodyPreview,
        adminHref: slackAdminSupportRequestUrl(args.supportRequestId),
        adminButtonTitle: SLACK_CTA.support,
    });

    const posted = await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
    if (!posted) {
        return undefined;
    }

    try {
        await serverRuntime.db
            .update(supportRequests)
            .set({
                references: {
                    slackTs: posted.ts,
                    slackChannelId: channelId,
                },
            })
            .where(eq(supportRequests.supportRequestId, args.supportRequestId));
    } catch (error) {
        serverRuntime.log.error(error);
    }

    return { channelId, ts: posted.ts };
}

/**
 * Posts a thread reply under the support-request root (or a top-level fallback
 * in supportRequests when the root was never stored). Fail-soft.
 */
export async function supportRequestSlackThreadReply(
    serverRuntime: ServerRuntime,
    args: SupportRequestSlackThreadReplyArgs,
): Promise<void> {
    try {
        const [row] = await serverRuntime.db
            .select({
                references: supportRequests.references,
            })
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, args.supportRequestId))
            .limit(1);

        const channelId = row?.references?.slackChannelId ?? serverRuntime.slack.channels.supportRequests;
        if (!channelId) {
            return;
        }

        const { text, blocks } = slackMessageBlocksBuild({
            header: args.header,
            fields: args.fields,
            body: args.body,
            adminHref: slackAdminSupportRequestUrl(args.supportRequestId),
            adminButtonTitle: SLACK_CTA.support,
        });

        await serverRuntime.slack.postMessage({
            channel: channelId,
            text,
            blocks,
            threadTs: row?.references?.slackTs,
            broadcast: args.broadcast,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}
