import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackFormatDateTime } from './slackFormat';
import { slackNotifyCallSlot } from './slackNotifyBooking';

type OfferCallActor = 'customer' | 'cook' | 'admin';

function offerCallActorLabel(actor: OfferCallActor, onBehalfOf?: 'customer' | 'cook'): string {
    const partyLabel = (party: 'customer' | 'cook') => (party === 'customer' ? 'Kunde' : 'Koch');
    return actor === 'admin' ? `Admin (als ${partyLabel(onBehalfOf ?? 'customer')})` : partyLabel(actor);
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
        requested: 'Call-Slot angefragt',
        confirmed: 'Call-Slot bestätigt',
        declined: 'Call-Slot abgelehnt',
        canceled: 'Call-Slot storniert',
    }[args.action];

    await slackNotifyCallSlot(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        header: `${actionLabel} · ${offerCallActorLabel(args.actor, args.onBehalfOf)}`,
        fields: args.startAt ? [{ label: 'Termin', value: slackFormatDateTime(args.startAt) }] : undefined,
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
        started: 'Call gestartet',
        joined: 'Call beigetreten',
        left: 'Call verlassen',
    }[args.action];

    await slackNotifyCallSlot(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        header: `${actionLabel} · ${offerCallActorLabel(args.actor)}`,
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
