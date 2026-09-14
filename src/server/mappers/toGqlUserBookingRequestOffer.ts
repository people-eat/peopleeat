import type { GqlSPublicCook, GqlSPublicCookMenu, GqlSUserBookingRequestOffer } from '../graphql/generated';
import { bookingRequestOfferFieldsBuild } from './bookingRequestOfferFieldsBuild';
import type { BookingRequestOfferFieldsInput } from './bookingRequestOfferFieldsBuild';

export type ToGqlUserBookingRequestOfferInput = BookingRequestOfferFieldsInput & {
    cook: GqlSPublicCook;
    suggestedMenus?: GqlSPublicCookMenu[];
};

export function toGqlUserBookingRequestOffer(input: ToGqlUserBookingRequestOfferInput): GqlSUserBookingRequestOffer {
    const { cook, suggestedMenus = [], ...fieldsInput } = input;
    const { cookUnreadNotificationCount: _cookUnread, ...fields } = bookingRequestOfferFieldsBuild(fieldsInput);
    return {
        ...fields,
        cook,
        suggestedMenus,
        messages: [],
        // Field resolvers populate the review and its eligibility flag.
        customerTestimonial: null,
        testimonialMissing: false,
    };
}
