import { bookingRequestParticipantsNormalize } from '../../shared/bookingRequestParticipants';
import type { BookingRequestParticipantDraft } from '../../shared/bookingRequestParticipants';
import type { BookingRequestParticipantType } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

export type BookingRequestParticipantWriteInput = {
    type: BookingRequestParticipantType;
    name: string;
    restrictions: readonly string[];
};

/**
 * Trims participant fields and, when `BOOKING_REQUEST_RESTRICTIONS` is off
 * for `userId`, forces empty restriction lists so clients cannot bypass the toggle.
 */
export async function bookingRequestParticipantsPrepareForWrite(
    participants: readonly BookingRequestParticipantWriteInput[],
    serverRuntime: ServerRuntime,
    errorPrefix: string,
    userId?: string | null,
): Promise<BookingRequestParticipantDraft[]> {
    if (participants.length === 0) {
        throw new Error(`${errorPrefix}: at least one participant is required`);
    }

    const normalized = bookingRequestParticipantsNormalize(
        participants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: [...participant.restrictions],
        })),
    );

    for (const participant of normalized) {
        if (participant.name.length === 0) {
            throw new Error(`${errorPrefix}: participant name must not be empty`);
        }
    }

    const restrictionsEnabled = await featureToggleIsEnabled('BOOKING_REQUEST_RESTRICTIONS', serverRuntime, userId);
    if (restrictionsEnabled) {
        return normalized;
    }

    return normalized.map((participant) => ({ ...participant, restrictions: [] }));
}
