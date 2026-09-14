import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackAdminBookingRequestOfferUrl, slackAdminBookingRequestUrl } from './slackAdminUrls';
import type { SlackField } from './slackBlocks';
import { slackMessageBlocksBuild } from './slackBlocks';
import { slackShortId } from './slackFormat';

export const LARGE_GROUP_PARTICIPANT_THRESHOLD = 12;

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
    broadcast?: boolean;
    adminOfferId?: string;
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

    const routingHint = args.participantCount >= LARGE_GROUP_PARTICIPANT_THRESHOLD ? 'Großgruppe · cash-cows' : 'booking-requests';
    const reviewHint = args.publicationBlocked ? 'Review nötig' : undefined;

    const { text, blocks } = slackMessageBlocksBuild({
        header: `Neue Buchungsanfrage · ${args.customerName}`,
        fields: args.fields,
        body: args.body,
        contextLines: [
            `Anfrage ${slackShortId(args.bookingRequestId)} · ${args.customerName}`,
            [routingHint, reviewHint, args.cooksNotifiedCount != null ? `${args.cooksNotifiedCount} Köche benachrichtigt` : undefined]
                .filter(Boolean)
                .join(' · '),
        ],
        adminHref: slackAdminBookingRequestUrl(args.bookingRequestId),
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

        const adminHref = args.adminOfferId
            ? slackAdminBookingRequestOfferUrl(args.bookingRequestId, args.adminOfferId)
            : slackAdminBookingRequestUrl(args.bookingRequestId);

        const { text, blocks } = slackMessageBlocksBuild({
            header: args.header,
            fields: args.fields,
            body: args.body,
            contextLines: [`Anfrage ${slackShortId(args.bookingRequestId)}`],
            adminHref,
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
