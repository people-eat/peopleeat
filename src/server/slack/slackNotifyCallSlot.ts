import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestSlackSummaryFields, bookingRequestSlackSummaryLoad } from './bookingRequestSlackSummaryLoad';
import { slackFormatDateTime } from './slackFormat';
import { slackNotifyCallSlot } from './slackNotifyBooking';

type OfferCallActor = 'customer' | 'cook' | 'admin';

function offerCallActorLabel(actor: OfferCallActor, onBehalfOf?: 'customer' | 'cook'): string {
    const partyLabel = (party: 'customer' | 'cook') => (party === 'customer' ? 'Kunde' : 'Koch');
    return actor === 'admin' ? `Admin (als ${partyLabel(onBehalfOf ?? 'customer')})` : partyLabel(actor);
}

function actorDisplayName(
    actor: OfferCallActor,
    summary: { customerName: string; cookName?: string } | undefined,
    onBehalfOf?: 'customer' | 'cook',
): string {
    if (actor === 'admin') {
        return offerCallActorLabel(actor, onBehalfOf);
    }
    if (actor === 'customer') {
        return summary?.customerName ?? 'Kunde';
    }
    return summary?.cookName ?? 'Koch';
}

export async function slackNotifyCallSlotEvent(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        action: 'requested' | 'confirmed' | 'declined' | 'canceled';
        actor: OfferCallActor;
        /** When `actor` is admin, which party the admin acted as. */
        onBehalfOf?: 'customer' | 'cook';
        startAt?: Date;
    },
): Promise<void> {
    const actionLabel = {
        requested: 'Gesprächstermin angefragt',
        confirmed: 'Gesprächstermin bestätigt',
        declined: 'Gesprächstermin abgelehnt',
        canceled: 'Gesprächstermin storniert',
    }[args.action];

    const summary = await bookingRequestSlackSummaryLoad(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
    });
    const who = actorDisplayName(args.actor, summary, args.onBehalfOf);
    const fields = summary ? bookingRequestSlackSummaryFields(summary, { includeCook: true }) : [];
    if (args.startAt) {
        fields.unshift({ label: 'Termin', value: slackFormatDateTime(args.startAt) });
    }

    await slackNotifyCallSlot(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        header: `${actionLabel} · ${who}`,
        fields: fields.length > 0 ? fields : undefined,
    });
}

/** Live room lifecycle on the booking-request Slack thread (started / joined / left). */
export async function slackNotifyCallRoomEvent(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        action: 'started' | 'joined' | 'left';
        actor: OfferCallActor;
    },
): Promise<void> {
    const actionLabel = {
        started: 'Gespräch gestartet',
        joined: 'Gespräch beigetreten',
        left: 'Gespräch verlassen',
    }[args.action];

    const summary = await bookingRequestSlackSummaryLoad(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
    });
    const who = actorDisplayName(args.actor, summary);

    await slackNotifyCallSlot(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        header: `${actionLabel} · ${who}`,
        fields: summary ? bookingRequestSlackSummaryFields(summary, { includeCook: true }) : undefined,
    });
}

export function offerCallActorFromIds(args: { actingUserId: string; customerUserId: string; cookUserId: string }): OfferCallActor {
    if (args.actingUserId === args.customerUserId) {
        return 'customer';
    }
    if (args.actingUserId === args.cookUserId) {
        return 'cook';
    }
    return 'admin';
}
