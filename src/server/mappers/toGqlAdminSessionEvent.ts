import { catalogKey } from '../../i18n/catalogKey';
import { t } from '../../i18n/t';
import { bookingRequestCheckoutFunnelArea } from '../../shared/bookingRequestCheckoutFunnel';
import { bookingRequestFormFunnelArea } from '../../shared/bookingRequestFormFunnel';
import { chefSignUpFunnelArea } from '../../shared/chefSignUpFunnel';
import { cookBookingRequestOfferFunnelArea } from '../../shared/cookBookingRequestOfferFunnel';
import { giftCardFunnelArea } from '../../shared/giftCardFunnel';
import type { Locale } from '../../shared/locale';
import type { SessionEvent } from '../db/schema';
import type { SessionEventKey, SessionEventPayload } from '../domain/sessionEvent';
import { isSessionEventKey } from '../domain/sessionEvent';
import type { GqlSAdminSessionEvent } from '../graphql/generated';

function copy(locale: Locale, key: string, params?: Record<string, string | number>): string {
    // Session-event description keys are built from runtime event types / verbs.
    return t(locale, 'admin', catalogKey('admin', key), params);
}

function staticDescription(locale: Locale, type: SessionEventKey): string {
    return copy(locale, `sessionEvents.static.${type}`);
}

function visitDescription(locale: Locale, payload: SessionEventPayload<'WEB_PAGE_VISITED'>): string {
    const key = payload.webPageKey;
    const path = payload.path ? ` (${payload.path})` : '';
    return copy(locale, 'sessionEvents.templates.visit', { key, path });
}

function interactionDescription(locale: Locale, payload: SessionEventPayload<'WEB_PAGE_INTERACTION'>): string {
    const interaction = payload.interaction;
    if (interaction.type === 'step_entered' || interaction.type === 'step_completed') {
        const isCookOfferFunnel = payload.area === cookBookingRequestOfferFunnelArea;
        const isGiftCardFunnel = payload.area === giftCardFunnelArea;
        const isChefSignUpFunnel = payload.area === chefSignUpFunnelArea;
        const isBookingCheckoutFunnel = payload.area === bookingRequestCheckoutFunnelArea;
        const verbKey =
            interaction.type === 'step_entered'
                ? isCookOfferFunnel
                    ? 'enteredOffer'
                    : isGiftCardFunnel
                      ? 'enteredGiftCard'
                      : isChefSignUpFunnel
                        ? 'enteredChefSignUp'
                        : isBookingCheckoutFunnel
                          ? 'enteredCheckout'
                          : 'enteredForm'
                : isCookOfferFunnel
                  ? 'completedOffer'
                  : isGiftCardFunnel
                    ? 'completedGiftCard'
                    : isChefSignUpFunnel
                      ? 'completedChefSignUp'
                      : isBookingCheckoutFunnel
                        ? 'completedCheckout'
                        : 'completedForm';
        const verb = copy(locale, `sessionEvents.verbs.${verbKey}`);
        const knownFunnelArea =
            payload.area === bookingRequestFormFunnelArea ||
            isCookOfferFunnel ||
            isGiftCardFunnel ||
            isChefSignUpFunnel ||
            isBookingCheckoutFunnel;
        const areaNote = knownFunnelArea ? '' : ` [${payload.area}]`;
        const requestNote =
            (isCookOfferFunnel || isBookingCheckoutFunnel) && payload.bookingRequestId != null ? ` (${payload.bookingRequestId})` : '';
        return copy(locale, 'sessionEvents.templates.stepLine', {
            verb,
            step: interaction.step,
            requestNote,
            areaNote,
        });
    }
    if (interaction.type === 'click') {
        return copy(locale, 'sessionEvents.templates.click', { key: interaction.key, area: payload.area });
    }
    return copy(locale, 'sessionEvents.templates.change', { key: interaction.key, area: payload.area });
}

function bookingCreatedDescription(
    locale: Locale,
    payload: SessionEventPayload<'BOOKING_REQUEST_CREATED'>,
): { description: string; link: string } {
    return {
        description: copy(locale, 'sessionEvents.templates.bookingCreated', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOpenedToOtherCooksDescription(
    locale: Locale,
    payload: SessionEventPayload<'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS'>,
): { description: string; link: string } {
    return {
        description: copy(locale, 'sessionEvents.templates.bookingOpened', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingCanceledDescription(
    locale: Locale,
    payload: SessionEventPayload<'BOOKING_REQUEST_CANCELED'>,
): { description: string; link: string } {
    return {
        description: copy(locale, 'sessionEvents.templates.bookingCanceled', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOfferActorDescription(
    locale: Locale,
    payload: SessionEventPayload<'BOOKING_REQUEST_OFFER_ACCEPTED'> | SessionEventPayload<'BOOKING_REQUEST_OFFER_DECLINED'>,
    kind: 'accepted' | 'declined',
): { description: string; link: string } {
    const actor = copy(locale, `sessionEvents.actors.${payload.actor === 'cook' ? 'cook' : 'customer'}`);
    const template = kind === 'accepted' ? 'sessionEvents.templates.offerAccepted' : 'sessionEvents.templates.offerDeclined';
    return {
        description: copy(locale, template, { actor, offerId: payload.bookingRequestOfferId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOfferPaymentDescription(
    locale: Locale,
    payload: SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED'> | SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_FAILED'>,
    kind: 'succeeded' | 'failed',
): { description: string; link: string } {
    const template = kind === 'succeeded' ? 'sessionEvents.templates.paymentSucceeded' : 'sessionEvents.templates.paymentFailed';
    return {
        description: copy(locale, template, { offerId: payload.bookingRequestOfferId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function giftCardCreatedDescription(
    locale: Locale,
    payload: SessionEventPayload<'GIFT_CARD_CREATED'>,
): { description: string; link: string } {
    return {
        description: copy(locale, 'sessionEvents.templates.giftCardCreated', { id: payload.giftCardId }),
        link: `/admin/gift-cards/${payload.giftCardId}`,
    };
}

function giftCardPayedDescription(locale: Locale, payload: SessionEventPayload<'GIFT_CARD_PAYED'>): { description: string; link: string } {
    return {
        description: copy(locale, 'sessionEvents.templates.giftCardPayed', { id: payload.giftCardId }),
        link: `/admin/gift-cards/${payload.giftCardId}`,
    };
}

function oauthProviderLabel(provider: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>['provider']): string {
    return { GOOGLE: 'Google' }[provider];
}

function authOauthSignInSucceededDescription(locale: Locale, payload: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>): string {
    const provider = oauthProviderLabel(payload.provider);
    if (payload.outcome === 'registration_ticket') {
        return copy(locale, 'sessionEvents.templates.oauthRegistration', { provider });
    }
    return copy(locale, 'sessionEvents.templates.oauthSucceeded', { provider });
}

function authOauthSignInFailedDescription(locale: Locale, payload: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_FAILED'>): string {
    const provider = oauthProviderLabel(payload.provider);
    return copy(locale, 'sessionEvents.templates.oauthFailed', { provider, reason: payload.reason });
}

function authOauthAccountCreatedDescription(locale: Locale, payload: SessionEventPayload<'AUTH_OAUTH_ACCOUNT_CREATED'>): string {
    const provider = oauthProviderLabel(payload.provider);
    return copy(locale, 'sessionEvents.templates.oauthAccountCreated', { provider });
}

function authEmailOtpVerifyDescription(locale: Locale, payload: SessionEventPayload<'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED'>): string {
    if (payload.outcome === 'registration_ticket') {
        return copy(locale, 'sessionEvents.auth.emailOtpRegistration');
    }
    return copy(locale, 'sessionEvents.auth.emailOtpSignIn');
}

function authTotpVerifyDescription(locale: Locale, payload: SessionEventPayload<'AUTH_TOTP_VERIFY_SUCCEEDED'>): string {
    if (payload.via === 'recovery') {
        return copy(locale, 'sessionEvents.auth.totpRecovery');
    }
    return copy(locale, 'sessionEvents.auth.totpAuthenticator');
}

export function toGqlAdminSessionEvent(event: SessionEvent, locale: Locale, isImpersonation = false): GqlSAdminSessionEvent {
    const rawType = event.type;
    let description = isSessionEventKey(rawType)
        ? staticDescription(locale, rawType)
        : copy(locale, 'sessionEvents.templates.unknown', { type: rawType });
    let link: string | null = null;

    if (isSessionEventKey(rawType)) {
        switch (rawType) {
            case 'WEB_PAGE_VISITED':
                description = visitDescription(locale, event.payload as SessionEventPayload<'WEB_PAGE_VISITED'>);
                break;
            case 'WEB_PAGE_INTERACTION':
                description = interactionDescription(locale, event.payload as SessionEventPayload<'WEB_PAGE_INTERACTION'>);
                break;
            case 'BOOKING_REQUEST_CREATED': {
                const mapped = bookingCreatedDescription(locale, event.payload as SessionEventPayload<'BOOKING_REQUEST_CREATED'>);
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS': {
                const mapped = bookingOpenedToOtherCooksDescription(
                    locale,
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS'>,
                );
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_CANCELED': {
                const mapped = bookingCanceledDescription(locale, event.payload as SessionEventPayload<'BOOKING_REQUEST_CANCELED'>);
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_ACCEPTED': {
                const mapped = bookingOfferActorDescription(
                    locale,
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_ACCEPTED'>,
                    'accepted',
                );
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_DECLINED': {
                const mapped = bookingOfferActorDescription(
                    locale,
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_DECLINED'>,
                    'declined',
                );
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED': {
                const mapped = bookingOfferPaymentDescription(
                    locale,
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED'>,
                    'succeeded',
                );
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_PAYMENT_FAILED': {
                const mapped = bookingOfferPaymentDescription(
                    locale,
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_FAILED'>,
                    'failed',
                );
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'GIFT_CARD_CREATED': {
                const mapped = giftCardCreatedDescription(locale, event.payload as SessionEventPayload<'GIFT_CARD_CREATED'>);
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'GIFT_CARD_PAYED': {
                const mapped = giftCardPayedDescription(locale, event.payload as SessionEventPayload<'GIFT_CARD_PAYED'>);
                description = mapped.description;
                link = mapped.link;
                break;
            }
            case 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED':
                description = authEmailOtpVerifyDescription(
                    locale,
                    event.payload as SessionEventPayload<'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED'>,
                );
                break;
            case 'AUTH_OAUTH_SIGN_IN_SUCCEEDED':
                description = authOauthSignInSucceededDescription(
                    locale,
                    event.payload as SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>,
                );
                break;
            case 'AUTH_OAUTH_SIGN_IN_FAILED':
                description = authOauthSignInFailedDescription(locale, event.payload as SessionEventPayload<'AUTH_OAUTH_SIGN_IN_FAILED'>);
                break;
            case 'AUTH_OAUTH_ACCOUNT_CREATED':
                description = authOauthAccountCreatedDescription(
                    locale,
                    event.payload as SessionEventPayload<'AUTH_OAUTH_ACCOUNT_CREATED'>,
                );
                break;
            case 'AUTH_TOTP_VERIFY_SUCCEEDED':
                description = authTotpVerifyDescription(locale, event.payload as SessionEventPayload<'AUTH_TOTP_VERIFY_SUCCEEDED'>);
                break;
            default:
                break;
        }
    }

    return {
        sessionEventId: event.sessionEventId,
        sessionId: event.sessionId,
        type: rawType,
        description,
        createdAt: event.createdAt,
        link,
        isImpersonation,
    };
}
