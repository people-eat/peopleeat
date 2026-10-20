import type { BookingRequestCheckoutFunnelInteraction } from '../../shared/bookingRequestCheckoutFunnel';
import type { BookingRequestFormFunnelInteraction } from '../../shared/bookingRequestFormFunnel';
import type { ChefSignUpFunnelInteraction } from '../../shared/chefSignUpFunnel';
import type { CookBookingRequestOfferFunnelInteraction } from '../../shared/cookBookingRequestOfferFunnel';
import type { GiftCardFunnelInteraction } from '../../shared/giftCardFunnel';
import type { WebPageKey } from '../../shared/webPage';

export type SessionEventWebPageVisitedPayload = {
    webPageKey: WebPageKey;
    path?: string;
    params?: {
        cityId?: string;
        cookId?: string;
        blogPostId?: string;
        partnerId?: string;
        occasionId?: string;
        bookingRequestId?: string;
    };
};

export type SessionEventWebPageInteractionPayload = {
    webPageKey: WebPageKey;
    area: string;
    /** Required for cook offer funnel steps (cook × booking-request grain). */
    bookingRequestId?: string;
    interaction:
        | BookingRequestFormFunnelInteraction
        | CookBookingRequestOfferFunnelInteraction
        | GiftCardFunnelInteraction
        | ChefSignUpFunnelInteraction
        | BookingRequestCheckoutFunnelInteraction
        | { type: 'click'; key: string }
        | { type: 'change'; key: string; value: string };
};

type SessionEventBookingRequestCreatedPayload = {
    bookingRequestId: string;
};

type SessionEventBookingRequestCanceledPayload = {
    bookingRequestId: string;
};

type SessionEventBookingRequestOfferActorPayload = {
    bookingRequestId: string;
    bookingRequestOfferId: string;
    actor: 'customer' | 'cook';
};

type SessionEventBookingRequestOfferPaymentPayload = {
    bookingRequestId: string;
    bookingRequestOfferId: string;
};

type SessionEventGiftCardPayload = {
    giftCardId: string;
};

type SessionEventAuthEmailOtpVerifySucceededPayload = {
    outcome: 'sign_in' | 'registration_ticket';
};

type SessionEventAuthTotpVerifySucceededPayload = {
    via: 'code' | 'recovery';
};

type SessionEventEmptyPayload = Record<string, never>;

type SessionEventLegacyPasswordResetPayload = {
    emailAddress?: string;
};

/**
 * Historical keys that still appear in imported rows but are **not** emitted by
 * peopleeat (password auth, phone confirm, etc.). Kept in the type map so admin
 * timelines stay typed. See docs/architecture/session-events.md.
 */
export const sessionEventKeysNoLongerProduced = [
    'SIGN_IN_FAILED',
    'SIGN_IN_NO_USER_FOR_EMAIL_ADDRESS',
    'SIGN_IN_UNCONFIRMED_EMAIL_ADDRESS',
    'SIGN_IN_NO_PASSWORD',
    'SIGN_IN_WRONG_PASSWORD',
    'SIGN_IN_SUCCESSFUL',
    'SESSION_USER_PASSWORD_RESET_SUCCEEDED',
    'SESSION_USER_PASSWORD_RESET_FAILED',
    'SESSION_USER_PASSWORD_RESET_CONFIRMATION_SUCCEEDED',
    'SESSION_USER_PASSWORD_RESET_CONFIRMATION_FAILED',
    'USER_CREATE_USER_WITH_UNCONFIRMED_EMAIL_ADDRESS_ALREADY_EXISTS',
    'USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_SUCCEEDED',
    'USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_FAILED',
    'USER_PHONE_NUMBER_UPDATE_CONFIRMATION_SUCCEEDED',
    'USER_PHONE_NUMBER_UPDATE_CONFIRMATION_FAILED',
] as const;

export type SessionEventKeyNoLongerProduced = (typeof sessionEventKeysNoLongerProduced)[number];

/**
 * Typed session-event taxonomy. Keys are stable strings (varchar in DB) so new
 * types do not require a Postgres enum migration.
 *
 * - Historical keys remain for admin humanization of imported rows.
 * - `sessionEventKeysNoLongerProduced` lists keys peopleeat never emits.
 * - `AUTH_*` keys cover email OTP / passkey / TOTP (password `SIGN_IN_*` are historical).
 */
const sessionEventKeyDataMap = {
    WEB_PAGE_VISITED: {} as SessionEventWebPageVisitedPayload,
    WEB_PAGE_INTERACTION: {} as SessionEventWebPageInteractionPayload,

    BOOKING_REQUEST_CREATED: {} as SessionEventBookingRequestCreatedPayload,
    BOOKING_REQUEST_CANCELED: {} as SessionEventBookingRequestCanceledPayload,
    BOOKING_REQUEST_OFFER_ACCEPTED: {} as SessionEventBookingRequestOfferActorPayload,
    BOOKING_REQUEST_OFFER_DECLINED: {} as SessionEventBookingRequestOfferActorPayload,
    BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED: {} as SessionEventBookingRequestOfferPaymentPayload,
    BOOKING_REQUEST_OFFER_PAYMENT_FAILED: {} as SessionEventBookingRequestOfferPaymentPayload,

    GIFT_CARD_CREATED: {} as SessionEventGiftCardPayload,
    GIFT_CARD_PAYED: {} as SessionEventGiftCardPayload,
    COOK_CREATED: {} as SessionEventEmptyPayload,

    USER_CREATE_SUCCESSFUL: {} as SessionEventEmptyPayload,
    USER_CREATE_FAILED: {} as SessionEventEmptyPayload,
    USER_CREATE_USER_WITH_EMAIL_ADDRESS_ALREADY_EXISTS: {} as SessionEventEmptyPayload,
    USER_CREATE_USER_WITH_UNCONFIRMED_EMAIL_ADDRESS_ALREADY_EXISTS: {} as SessionEventEmptyPayload,

    USER_TERMS_ACCEPTED: {} as SessionEventEmptyPayload,
    USER_PRIVACY_POLICY_ACCEPTED: {} as SessionEventEmptyPayload,

    AUTH_EMAIL_OTP_REQUESTED: {} as SessionEventEmptyPayload,
    AUTH_EMAIL_OTP_VERIFY_FAILED: {} as SessionEventEmptyPayload,
    AUTH_EMAIL_OTP_VERIFY_SUCCEEDED: {} as SessionEventAuthEmailOtpVerifySucceededPayload,
    AUTH_PASSKEY_SIGN_IN_SUCCEEDED: {} as SessionEventEmptyPayload,
    AUTH_PASSKEY_SIGN_IN_FAILED: {} as SessionEventEmptyPayload,
    AUTH_TOTP_CHALLENGE_PENDING: {} as SessionEventEmptyPayload,
    AUTH_TOTP_VERIFY_SUCCEEDED: {} as SessionEventAuthTotpVerifySucceededPayload,
    AUTH_TOTP_VERIFY_FAILED: {} as SessionEventEmptyPayload,

    SIGN_IN_FAILED: {} as SessionEventEmptyPayload,
    SIGN_IN_NO_USER_FOR_EMAIL_ADDRESS: {} as SessionEventEmptyPayload,
    SIGN_IN_UNCONFIRMED_EMAIL_ADDRESS: {} as SessionEventEmptyPayload,
    SIGN_IN_NO_PASSWORD: {} as SessionEventEmptyPayload,
    SIGN_IN_WRONG_PASSWORD: {} as SessionEventEmptyPayload,
    SIGN_IN_SUCCESSFUL: {} as SessionEventEmptyPayload,

    SESSION_USER_PASSWORD_RESET_SUCCEEDED: {} as SessionEventLegacyPasswordResetPayload,
    SESSION_USER_PASSWORD_RESET_FAILED: {} as SessionEventLegacyPasswordResetPayload,
    SESSION_USER_PASSWORD_RESET_CONFIRMATION_SUCCEEDED: {} as SessionEventEmptyPayload,
    SESSION_USER_PASSWORD_RESET_CONFIRMATION_FAILED: {} as SessionEventEmptyPayload,

    USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_SUCCEEDED: {} as SessionEventEmptyPayload,
    USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_FAILED: {} as SessionEventEmptyPayload,
    USER_PHONE_NUMBER_UPDATE_CONFIRMATION_SUCCEEDED: {} as SessionEventEmptyPayload,
    USER_PHONE_NUMBER_UPDATE_CONFIRMATION_FAILED: {} as SessionEventEmptyPayload,

    NEWSLETTER_SUBSCRIPTION_CREATED: {} as SessionEventEmptyPayload,
    NEWSLETTER_SUBSCRIPTION_FAILED: {} as SessionEventEmptyPayload,
    NEWSLETTER_SUBSCRIPTION_ALREADY_EXISTS: {} as SessionEventEmptyPayload,
} as const;

export type SessionEventKey = keyof typeof sessionEventKeyDataMap;

export type SessionEventPayload<TKey extends SessionEventKey> = (typeof sessionEventKeyDataMap)[TKey];

export type SessionEventPayloadByKey = {
    [TKey in SessionEventKey]: SessionEventPayload<TKey>;
};

/** Keys `sessionEventCreate` may emit at runtime (excludes legacy-only imports). */
export type SessionEventKeyEmitted = Exclude<SessionEventKey, SessionEventKeyNoLongerProduced>;

export function isSessionEventKey(value: string): value is SessionEventKey {
    return Object.prototype.hasOwnProperty.call(sessionEventKeyDataMap, value);
}

export function isSessionEventKeyNoLongerProduced(value: string): value is SessionEventKeyNoLongerProduced {
    return (sessionEventKeysNoLongerProduced as readonly string[]).includes(value);
}
