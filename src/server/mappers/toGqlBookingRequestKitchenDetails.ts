import type { BookingRequestKitchenDetails } from '../domain/bookingRequest';
import { bookingRequestKitchenDetailsIsEmpty } from '../domain/bookingRequest';
import type { GqlSBookingRequestKitchenDetails, GqlSFileUpload } from '../graphql/generated';

export function toGqlBookingRequestKitchenDetails(
    details: BookingRequestKitchenDetails | null | undefined,
    photos: readonly GqlSFileUpload[] = [],
): GqlSBookingRequestKitchenDetails | null {
    if (bookingRequestKitchenDetailsIsEmpty(details, photos.length)) return null;
    return {
        availability: details?.availability ?? null,
        fridgeSpace: details?.fridgeSpace ?? null,
        platingSpace: details?.platingSpace ?? null,
        guestTableware: details?.guestTableware ?? null,
        notes: details?.notes ?? null,
        photos: [...photos],
    };
}
