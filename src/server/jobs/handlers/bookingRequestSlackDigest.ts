import { and, eq, isNull, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, users } from '../../db/schema';
import type { BookingRequestOfferPaymentStatus } from '../../domain/bookingRequest';
import { bookingRequestStatusDerive } from '../../domain/bookingRequest';
import { slackAdminBookingRequestUrl } from '../../slack/slackAdminUrls';
import { slackMessageBlocksBuild } from '../../slack/slackBlocks';
import { slackFormatDateTime, slackShortId } from '../../slack/slackFormat';
import type { RecurringJobDefinition } from '../types';

/**
 * Weekday morning digest of open booking requests needing attention.
 * Posts to bookingRequestReports channel.
 */
export const bookingRequestSlackDigest: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'booking-request-slack-digest',
    // Mon–Fri 07:30 UTC ≈ mid-morning Berlin.
    cron: '30 6 * * 1-5',
    handler: async ({ serverRuntime }) => {
        const channelId = serverRuntime.slack.channels.bookingRequestReports;
        if (!channelId) {
            return;
        }

        const rows = await serverRuntime.db
            .select({
                bookingRequest: bookingRequests,
                firstName: users.firstName,
                lastName: users.lastName,
                offerCount: sql<number>`(
                    select count(*)::int from ${bookingRequestOffers}
                    where ${bookingRequestOffers.bookingRequestId} = ${bookingRequests.bookingRequestId}
                )`,
                acceptedPaymentStatus: sql<BookingRequestOfferPaymentStatus | null>`(
                    select ${bookingRequestOffers.paymentStatus}
                    from ${bookingRequestOffers}
                    where ${bookingRequestOffers.bookingRequestId} = ${bookingRequests.bookingRequestId}
                      and ${bookingRequestOffers.userAccepted} = true
                      and ${bookingRequestOffers.cookAccepted} = true
                    limit 1
                )`,
            })
            .from(bookingRequests)
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(and(isNull(bookingRequests.canceledAt)));

        const waitingForReview: typeof rows = [];
        const waitingForOffers: typeof rows = [];

        for (const row of rows) {
            const status = bookingRequestStatusDerive({
                offerCount: Number(row.offerCount),
                acceptedOfferPaymentStatus: row.acceptedPaymentStatus,
                canceledAt: row.bookingRequest.canceledAt,
                expiresAt: row.bookingRequest.expiresAt,
                eventDate: row.bookingRequest.dateTime,
            });
            if (status === 'OFFERS_WAITING_FOR_REVIEW') {
                waitingForReview.push(row);
            } else if (status === 'WAITING_FOR_OFFERS') {
                waitingForOffers.push(row);
            }
        }

        if (waitingForReview.length === 0 && waitingForOffers.length === 0) {
            return;
        }

        const bodyParts: string[] = [];
        if (waitingForReview.length > 0) {
            bodyParts.push(`*Anfragen mit offenen Angeboten (${waitingForReview.length})*`);
            for (const row of waitingForReview.slice(0, 15)) {
                const name = `${row.firstName} ${row.lastName}`;
                bodyParts.push(
                    `• ${slackFormatDateTime(row.bookingRequest.dateTime)} · ${name} · <${slackAdminBookingRequestUrl(row.bookingRequest.bookingRequestId)}|öffnen>`,
                );
            }
        }
        if (waitingForOffers.length > 0) {
            bodyParts.push(`*Anfragen ohne Angebote (${waitingForOffers.length})*`);
            for (const row of waitingForOffers.slice(0, 15)) {
                const name = `${row.firstName} ${row.lastName}`;
                bodyParts.push(
                    `• ${slackFormatDateTime(row.bookingRequest.dateTime)} · ${name} · <${slackAdminBookingRequestUrl(row.bookingRequest.bookingRequestId)}|öffnen>`,
                );
            }
        }

        const { text, blocks } = slackMessageBlocksBuild({
            header: 'Buchungsanfragen Report',
            body: bodyParts.join('\n'),
            contextLines: [`Digest ${slackShortId(new Date().toISOString())}`],
        });

        await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
