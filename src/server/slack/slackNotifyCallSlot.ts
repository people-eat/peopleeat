import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackFormatDateTime } from './slackFormat';
import { slackNotifyCallSlot } from './slackNotifyBooking';

export async function slackNotifyCallSlotEvent(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        action: 'requested' | 'confirmed' | 'declined' | 'canceled';
        actor: 'customer' | 'cook' | 'admin';
        /** When `actor` is admin, which party the admin acted as. */
        onBehalfOf?: 'customer' | 'cook';
        startAt?: Date;
    },
): Promise<void> {
    const partyLabel = (party: 'customer' | 'cook') => (party === 'customer' ? 'Kunde' : 'Koch');
    const actorLabel = args.actor === 'admin' ? `Admin (als ${partyLabel(args.onBehalfOf ?? 'customer')})` : partyLabel(args.actor);
    const actionLabel = {
        requested: 'Call-Slot angefragt',
        confirmed: 'Call-Slot bestätigt',
        declined: 'Call-Slot abgelehnt',
        canceled: 'Call-Slot storniert',
    }[args.action];

    await slackNotifyCallSlot(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        header: `${actionLabel} · ${actorLabel}`,
        fields: args.startAt ? [{ label: 'Termin', value: slackFormatDateTime(args.startAt) }] : undefined,
    });
}
