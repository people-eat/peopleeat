import type { GqlSPublicCook, GqlSPublicCookMenu, GqlSPublicCookOfferAddon, GqlSUserBookingRequestOffer } from '../graphql/generated';
import { bookingRequestOfferFieldsBuild } from './bookingRequestOfferFieldsBuild';
import type { BookingRequestOfferFieldsInput } from './bookingRequestOfferFieldsBuild';

export type ToGqlUserBookingRequestOfferInput = BookingRequestOfferFieldsInput & {
    cook: GqlSPublicCook;
    cookTimeZone: string;
    suggestedMenus?: GqlSPublicCookMenu[];
    addons?: GqlSPublicCookOfferAddon[];
};

export function toGqlUserBookingRequestOffer(input: ToGqlUserBookingRequestOfferInput): GqlSUserBookingRequestOffer {
    const { cook, cookTimeZone, suggestedMenus = [], addons = [], ...fieldsInput } = input;
    const {
        cookUnreadNotificationCount: _cookUnread,
        canCompletePreparations: _canCompletePreparations,
        ...fields
    } = bookingRequestOfferFieldsBuild(fieldsInput);
    return {
        ...fields,
        cook,
        cookTimeZone,
        suggestedMenus,
        addons,
        customerReceiptFileUpload: null,
        messages: [],
        // Field resolvers populate the review and its eligibility flag.
        customerTestimonial: null,
        testimonialMissing: false,
    };
}
