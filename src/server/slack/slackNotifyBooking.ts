import { eq } from 'drizzle-orm';

import { bookingRequestParticipants, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestSlackRootPost, bookingRequestSlackThreadReply } from './bookingRequestSlack';
import { slackFormatCents, slackFormatCity, slackFormatDateTime, slackFormatParticipants, slackFormatPriceClass } from './slackFormat';

async function customerNameFind(serverRuntime: ServerRuntime, userId: string): Promise<string> {
    const [user] = await serverRuntime.db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
    if (!user) {
        return 'Unbekannt';
    }
    return `${user.firstName} ${user.lastName}`;
}

/**
 * After a booking request is created — posts root Slack message + stores refs.
 */
export async function slackNotifyBookingRequestCreated(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cooksNotifiedCount?: number },
): Promise<void> {
    try {
        const [row] = await serverRuntime.db
            .select({
                bookingRequest: bookingRequests,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(bookingRequests)
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);

        if (!row) {
            return;
        }

        const participantRows = await serverRuntime.db
            .select({ type: bookingRequestParticipants.type })
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, args.bookingRequestId));

        const adultCount = participantRows.filter((p) => p.type === 'ADULT').length;
        const discountedCount = participantRows.filter((p) => p.type === 'DISCOUNTED').length;
        const participantCount = adultCount + discountedCount;
        const customerName = `${row.firstName} ${row.lastName}`;
        const publicationBlocked = row.bookingRequest.publicationStatus === 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW';

        await bookingRequestSlackRootPost(serverRuntime, {
            bookingRequestId: args.bookingRequestId,
            customerName,
            participantCount,
            publicationBlocked,
            cooksNotifiedCount: args.cooksNotifiedCount,
            fields: [
                { label: 'Datum', value: slackFormatDateTime(row.bookingRequest.dateTime) },
                { label: 'Ort', value: slackFormatCity(row.bookingRequest.exactEventAddress) },
                { label: 'Teilnehmer', value: slackFormatParticipants(adultCount, discountedCount) },
                { label: 'Anlass', value: row.bookingRequest.occasion },
                { label: 'Preisklasse', value: slackFormatPriceClass(row.bookingRequest.priceClassType) },
                {
                    label: 'Status',
                    value: publicationBlocked ? 'Wartet auf Admin-Freigabe' : 'Veröffentlicht',
                },
            ],
            body: row.bookingRequest.originalMessage.trim() || undefined,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}

export async function slackNotifyBookingRequestRecall(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; userId: string; phoneNumber: string | null },
): Promise<void> {
    const customerName = await customerNameFind(serverRuntime, args.userId);
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Rückruf angefordert · ${customerName}`,
        fields: [
            { label: 'Kunde', value: customerName },
            { label: 'Telefon', value: args.phoneNumber ?? 'nicht hinterlegt' },
        ],
        broadcast: true,
    });
}

export async function slackNotifyBookingRequestCanceled(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; userId: string; reason?: string | null },
): Promise<void> {
    const customerName = await customerNameFind(serverRuntime, args.userId);
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Storniert · ${customerName}`,
        fields: [{ label: 'Kunde', value: customerName }],
        body: args.reason ? `Grund: ${args.reason}` : undefined,
        broadcast: true,
    });
}

export async function slackNotifyBookingRequestFieldChange(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        userId: string;
        header: string;
        before: string;
        after: string;
    },
): Promise<void> {
    const customerName = await customerNameFind(serverRuntime, args.userId);
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `${args.header} · ${customerName}`,
        body: `*Vorher:* ${args.before}\n*Nachher:* ${args.after}`,
    });
}

export async function slackNotifyBookingRequestPublicationApproved(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cooksNotifiedCount?: number },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: 'Veröffentlichung freigegeben',
        fields: args.cooksNotifiedCount != null ? [{ label: 'Benachrichtigte Köche', value: String(args.cooksNotifiedCount) }] : undefined,
        broadcast: true,
    });
}

export async function slackNotifyOfferCreated(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        cookName: string;
        totalCentsCustomer: number;
    },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Neues Angebot · ${args.cookName}`,
        fields: [
            { label: 'Koch', value: args.cookName },
            { label: 'Kundenpreis', value: slackFormatCents(args.totalCentsCustomer) },
        ],
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyOfferPriceUpdated(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        cookName: string;
        beforeCents: number;
        afterCents: number;
    },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Preis aktualisiert · ${args.cookName}`,
        body: `*Vorher:* ${slackFormatCents(args.beforeCents)}\n*Nachher:* ${slackFormatCents(args.afterCents)}`,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyOfferSuggestedMenusUpdated(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string; cookName: string },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Menüvorschläge aktualisiert · ${args.cookName}`,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyOfferAccept(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        actor: 'customer' | 'cook';
        name: string;
        dualAccepted: boolean;
    },
): Promise<void> {
    const who = args.actor === 'customer' ? 'Kunde' : 'Koch';
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: args.dualAccepted ? `Doppelte Annahme · ${args.name}` : `${who} hat angenommen · ${args.name}`,
        broadcast: args.dualAccepted,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyOfferDecline(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        actor: 'customer' | 'cook';
        name: string;
        reason?: string | null;
    },
): Promise<void> {
    const who = args.actor === 'customer' ? 'Kunde' : 'Koch';
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `${who} hat abgelehnt · ${args.name}`,
        body: args.reason ? `Grund: ${args.reason}` : undefined,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyCookRequestDecline(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cookName: string; reason?: string | null },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Koch hat Anfrage abgelehnt · ${args.cookName}`,
        body: args.reason ? `Grund: ${args.reason}` : undefined,
    });
}

export async function slackNotifyPaymentConfirmed(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string; amountCents: number },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: 'Zahlung bestätigt',
        fields: [{ label: 'Betrag', value: slackFormatCents(args.amountCents) }],
        broadcast: true,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyPaymentFailed(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string; detail?: string },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: 'Zahlung fehlgeschlagen',
        body: args.detail,
        broadcast: true,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyPayoutReleased(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string; amountCents: number },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: 'Auszahlung freigegeben',
        fields: [{ label: 'Betrag', value: slackFormatCents(args.amountCents) }],
        broadcast: true,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyCallSlot(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        header: string;
        fields?: { label: string; value: string }[];
    },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: args.header,
        fields: args.fields,
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyNoOffers(serverRuntime: ServerRuntime, args: { bookingRequestId: string; hours: 24 | 48 }): Promise<void> {
    const [row] = await serverRuntime.db
        .select({
            firstName: users.firstName,
            lastName: users.lastName,
            dateTime: bookingRequests.dateTime,
            occasion: bookingRequests.occasion,
            exactEventAddress: bookingRequests.exactEventAddress,
        })
        .from(bookingRequests)
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
        .limit(1);

    if (!row) {
        return;
    }

    const customerName = `${row.firstName} ${row.lastName}`;
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Keine Angebote nach ${args.hours}h · ${customerName}`,
        fields: [
            { label: 'Datum', value: slackFormatDateTime(row.dateTime) },
            { label: 'Ort', value: slackFormatCity(row.exactEventAddress) },
            { label: 'Anlass', value: row.occasion },
        ],
    });
}

export async function slackNotifyEventTomorrow(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: 'Event morgen',
        adminOfferId: args.bookingRequestOfferId,
    });
}

export async function slackNotifyTestimonialReminderSent(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; kind: string },
): Promise<void> {
    await bookingRequestSlackThreadReply(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        header: `Testimonial-Erinnerung gesendet · ${args.kind}`,
    });
}
