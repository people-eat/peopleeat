import type { GqlSCookBookingRequestOffer, GqlSCookBookingRequestOfferContext, GqlSCookMenu } from '../graphql/generated';
import { bookingRequestOfferFieldsBuild } from './bookingRequestOfferFieldsBuild';
import type { BookingRequestOfferFieldsInput } from './bookingRequestOfferFieldsBuild';

export type ToGqlCookBookingRequestOfferInput = BookingRequestOfferFieldsInput & {
    suggestedMenus?: GqlSCookMenu[];
    bookingRequestContext: GqlSCookBookingRequestOfferContext;
};

export function toGqlCookBookingRequestOffer(input: ToGqlCookBookingRequestOfferInput): GqlSCookBookingRequestOffer {
    const { suggestedMenus = [], bookingRequestContext, ...fieldsInput } = input;
    const {
        userUnreadNotificationCount: _userUnread,
        canRequestParticipantAmendment: _canRequestParticipantAmendment,
        ...fields
    } = bookingRequestOfferFieldsBuild(fieldsInput);
    return {
        ...fields,
        suggestedMenus,
        bookingRequest: bookingRequestContext,
        messages: [],
        // Field resolvers populate the cook's own platform testimonial and its eligibility flag.
        cookTestimonial: null,
        testimonialMissing: false,
    };
}
