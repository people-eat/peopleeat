import type { BookingRequest, Cook } from '../db/schema';
import { cookIsInTravelRadius } from './cookIsInTravelRadius';

type PoolEligibilityRequest = Pick<BookingRequest, 'userId' | 'publicationStatus' | 'exactEventAddress'>;

/**
 * Whether this cook may learn pool-level facts about a booking request
 * (list membership or unavailable reasons). Mirrors open-pool publication
 * rules: auto-approved ⇒ in travel radius; admin-approved ⇒ notifiedAt set.
 * Does not consider canceled / expired / own offer / dual-accept.
 */
export function cookIsEligibleForBookingRequestPool(
    cook: Cook,
    bookingRequest: PoolEligibilityRequest,
    affinity: { notifiedAt: Date | null } | null,
): boolean {
    if (bookingRequest.userId === cook.cookId) {
        return false;
    }
    if (bookingRequest.publicationStatus === 'PUBLICATION_APPROVED_BY_ADMIN') {
        return affinity?.notifiedAt != null;
    }
    if (bookingRequest.publicationStatus === 'PUBLICATION_AUTO_APPROVED') {
        return cookIsInTravelRadius(cook, {
            latitude: bookingRequest.exactEventAddress.latitude,
            longitude: bookingRequest.exactEventAddress.longitude,
        });
    }
    return false;
}
