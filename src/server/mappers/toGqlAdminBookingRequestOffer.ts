import {
    bookingRequestPaidParticipants,
    stripeDashboardIsTestMode,
    stripeDashboardPaymentIntentUrl,
    stripeDashboardSetupIntentUrl,
} from '../../shared';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSAdminBookingRequestOffer, GqlSAdminCook, GqlSAdminCookPayoutBlockedReason, GqlSCookMenu } from '../graphql/generated';
import { bookingRequestOfferFieldsBuild } from './bookingRequestOfferFieldsBuild';
import type { BookingRequestOfferFieldsInput } from './bookingRequestOfferFieldsBuild';

export type ToGqlAdminBookingRequestOfferInput = BookingRequestOfferFieldsInput & {
    cook: GqlSAdminCook;
    suggestedMenus?: GqlSCookMenu[];
    cookPayoutReady: boolean;
    cookPayoutBlockedReason: GqlSAdminCookPayoutBlockedReason | null;
};

function adminOfferStripeDashboardUrls(paymentData: BookingRequestOfferFieldsInput['offer']['paymentData']): {
    stripePaymentIntentUrl: string | null;
    stripeSetupIntentUrl: string | null;
} {
    if (!paymentData) {
        return { stripePaymentIntentUrl: null, stripeSetupIntentUrl: null };
    }

    const testMode = stripeDashboardIsTestMode(environmentVariables.stripeSecretKey);
    const paymentIntentId = 'paymentIntentId' in paymentData ? paymentData.paymentIntentId : undefined;
    const setupIntentId = 'setupIntentId' in paymentData ? paymentData.setupIntentId : undefined;

    return {
        stripePaymentIntentUrl: paymentIntentId ? stripeDashboardPaymentIntentUrl(paymentIntentId, testMode) : null,
        stripeSetupIntentUrl: setupIntentId ? stripeDashboardSetupIntentUrl(setupIntentId, testMode) : null,
    };
}

export function toGqlAdminBookingRequestOffer(input: ToGqlAdminBookingRequestOfferInput): GqlSAdminBookingRequestOffer {
    const { cook, suggestedMenus = [], cookPayoutReady, cookPayoutBlockedReason, ...fieldsInput } = input;
    return {
        ...bookingRequestOfferFieldsBuild(fieldsInput),
        ...adminOfferStripeDashboardUrls(fieldsInput.offer.paymentData),
        adminChatReviewPendingCount: fieldsInput.offer.adminChatReviewPendingCount,
        adminChatReviewedAt: fieldsInput.offer.adminChatReviewedAt ?? null,
        cook,
        suggestedMenus,
        cookPayoutReady,
        cookPayoutBlockedReason,
        messages: [],
        callRecordings: [],
        queuedJobs: [],
        // Field resolvers populate booking request + both testimonial sides.
        bookingRequest: null as unknown as GqlSAdminBookingRequestOffer['bookingRequest'],
        customerTestimonial: null,
        cookTestimonial: null,
    };
}

/** Soft suggested menu price total for a cook covering a request venue. */
export function adminBookingRequestCookSuggestedMenuPriceCents(input: {
    suggestedOfferAmountCents: number;
    participantsAdult: number;
    participantsDiscounted: number;
}): number {
    return Math.round(
        input.suggestedOfferAmountCents * bookingRequestPaidParticipants(input.participantsAdult, input.participantsDiscounted),
    );
}
