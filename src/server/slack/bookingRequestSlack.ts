import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import { LARGE_GROUP_PARTICIPANT_THRESHOLD } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackAdminBookingRequestOfferUrl, slackAdminBookingRequestUrl } from './slackAdminUrls';
import type { SlackField } from './slackBlocks';
import { slackMessageBlocksBuild } from './slackBlocks';
import { SLACK_CTA } from './slackCta';

export { LARGE_GROUP_PARTICIPANT_THRESHOLD };

export type BookingRequestSlackRootPostArgs = {
    bookingRequestId: string;
    customerName: string;
    participantCount: number;
    publicationBlocked: boolean;
    fields: SlackField[];
    body?: string;
    cooksNotifiedCount?: number;
};

export type BookingRequestSlackThreadReplyArgs = {
    bookingRequestId: string;
    header: string;
    fields?: SlackField[];
    body?: string;
    adminOfferId?: string;
    /** Override deep-link URL + CTA (e.g. Admin Call page). */
    adminHref?: string;
    adminButtonTitle?: string;
};

function channelForParticipantCount(serverRuntime: ServerRuntime, participantCount: number): string | undefined {
    if (participantCount >= LARGE_GROUP_PARTICIPANT_THRESHOLD) {
        return serverRuntime.slack.channels.cashCows ?? serverRuntime.slack.channels.bookingRequests;
    }
    return serverRuntime.slack.channels.bookingRequests;
}

/**
 * Posts the booking-request root message and persists `{ slackTs, slackChannelId }`
 * on `BookingRequests.references`. Fail-soft.
 */
export async function bookingRequestSlackRootPost(
    serverRuntime: ServerRuntime,
    args: BookingRequestSlackRootPostArgs,
): Promise<{ channelId: string; ts: string } | undefined> {
    const channelId = channelForParticipantCount(serverRuntime, args.participantCount);
    if (!channelId) {
        return undefined;
    }

    const contextParts = [
        args.participantCount >= LARGE_GROUP_PARTICIPANT_THRESHOLD ? 'Großgruppe' : undefined,
        args.publicationBlocked ? 'Review nötig' : undefined,
        args.cooksNotifiedCount != null
            ? `${args.cooksNotifiedCount} ${args.cooksNotifiedCount === 1 ? 'Koch' : 'Köche'} benachrichtigt`
            : undefined,
    ].filter(Boolean);

    const { text, blocks } = slackMessageBlocksBuild({
        header: `Neue Buchungsanfrage · ${args.customerName}`,
        fields: args.fields,
        body: args.body,
        contextLines: contextParts.length > 0 ? [contextParts.join(' · ')] : undefined,
        adminHref: slackAdminBookingRequestUrl(args.bookingRequestId),
        adminButtonTitle: SLACK_CTA.request,
    });

    const posted = await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
    if (!posted) {
        return undefined;
    }

    try {
        await serverRuntime.db
            .update(bookingRequests)
            .set({
                references: {
                    slackTs: posted.ts,
                    slackChannelId: channelId,
                },
            })
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId));
    } catch (error) {
        serverRuntime.log.error(error);
    }

    return { channelId, ts: posted.ts };
}

/**
 * Posts a thread reply under the booking request root (or a top-level fallback
 * in bookingRequests when the root was never stored). Fail-soft.
 */
export async function bookingRequestSlackThreadReply(
    serverRuntime: ServerRuntime,
    args: BookingRequestSlackThreadReplyArgs,
): Promise<void> {
    try {
        const [row] = await serverRuntime.db
            .select({
                references: bookingRequests.references,
            })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);

        const channelId = row?.references?.slackChannelId ?? serverRuntime.slack.channels.bookingRequests;
        if (!channelId) {
            return;
        }

        const adminHref =
            args.adminHref ??
            (args.adminOfferId
                ? slackAdminBookingRequestOfferUrl(args.bookingRequestId, args.adminOfferId)
                : slackAdminBookingRequestUrl(args.bookingRequestId));
        const adminButtonTitle = args.adminButtonTitle ?? (args.adminOfferId ? SLACK_CTA.offer : SLACK_CTA.request);

        const { text, blocks } = slackMessageBlocksBuild({
            header: args.header,
            fields: args.fields,
            body: args.body,
            adminHref,
            adminButtonTitle,
        });

        await serverRuntime.slack.postMessage({
            channel: channelId,
            text,
            blocks,
            threadTs: row?.references?.slackTs,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}
