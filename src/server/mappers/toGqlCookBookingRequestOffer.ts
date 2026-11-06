import type {
    GqlSCookBookingRequestOffer,
    GqlSCookBookingRequestOfferContext,
    GqlSCookMenu,
    GqlSCookOfferAddon,
} from '../graphql/generated';
import { bookingRequestOfferFieldsBuild } from './bookingRequestOfferFieldsBuild';
import type { BookingRequestOfferFieldsInput } from './bookingRequestOfferFieldsBuild';

export type ToGqlCookBookingRequestOfferInput = BookingRequestOfferFieldsInput & {
    suggestedMenus?: GqlSCookMenu[];
    addons?: GqlSCookOfferAddon[];
    bookingRequestContext: GqlSCookBookingRequestOfferContext;
};

export function toGqlCookBookingRequestOffer(input: ToGqlCookBookingRequestOfferInput): GqlSCookBookingRequestOffer {
    const { suggestedMenus = [], addons = [], bookingRequestContext, ...fieldsInput } = input;
    const {
        userUnreadNotificationCount: _userUnread,
        canRequestParticipantAmendment: _canRequestParticipantAmendment,
        ...fields
    } = bookingRequestOfferFieldsBuild(fieldsInput);
    return {
        ...fields,
        suggestedMenus,
        addons,
        bookingRequest: bookingRequestContext,
        cookStatementFileUpload: null,
        messages: [],
        // Field resolvers populate the cook's own platform testimonial and its eligibility flag.
        cookTestimonial: null,
        testimonialMissing: false,
    };
}
