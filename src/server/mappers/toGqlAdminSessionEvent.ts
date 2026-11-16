import { t } from '../../i18n/t';
import { bookingRequestCheckoutFunnelArea } from '../../shared/bookingRequestCheckoutFunnel';
import { bookingRequestFormFunnelArea } from '../../shared/bookingRequestFormFunnel';
import { chefSignUpFunnelArea } from '../../shared/chefSignUpFunnel';
import { cookBookingRequestOfferFunnelArea } from '../../shared/cookBookingRequestOfferFunnel';
import { giftCardFunnelArea } from '../../shared/giftCardFunnel';
import type { SessionEvent } from '../db/schema';
import type { SessionEventKey, SessionEventPayload } from '../domain/sessionEvent';
import { isSessionEventKey } from '../domain/sessionEvent';
import type { GqlSAdminSessionEvent } from '../graphql/generated';

function staticDescription(type: SessionEventKey): { de: string; en: string } {
    return {
        de: t('de', 'admin', `sessionEvents.static.${type}`),
        en: t('en', 'admin', `sessionEvents.static.${type}`),
    };
}

function bilingual(key: string, params?: Record<string, string | number>): { de: string; en: string } {
    return {
        de: t('de', 'admin', key, params),
        en: t('en', 'admin', key, params),
    };
}

function visitDescription(payload: SessionEventPayload<'WEB_PAGE_VISITED'>): { de: string; en: string } {
    const key = payload.webPageKey;
    const path = payload.path ? ` (${payload.path})` : '';
    return bilingual('sessionEvents.templates.visit', { key, path });
}

function interactionDescription(payload: SessionEventPayload<'WEB_PAGE_INTERACTION'>): { de: string; en: string } {
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
        const verb = bilingual(`sessionEvents.verbs.${verbKey}`);
        const knownFunnelArea =
            payload.area === bookingRequestFormFunnelArea ||
            isCookOfferFunnel ||
            isGiftCardFunnel ||
            isChefSignUpFunnel ||
            isBookingCheckoutFunnel;
        const areaNote = knownFunnelArea ? '' : ` [${payload.area}]`;
        const requestNote =
            (isCookOfferFunnel || isBookingCheckoutFunnel) && payload.bookingRequestId != null ? ` (${payload.bookingRequestId})` : '';
        return {
            de: t('de', 'admin', 'sessionEvents.templates.stepLine', {
                verb: verb.de,
                step: interaction.step,
                requestNote,
                areaNote,
            }),
            en: t('en', 'admin', 'sessionEvents.templates.stepLine', {
                verb: verb.en,
                step: interaction.step,
                requestNote,
                areaNote,
            }),
        };
    }
    if (interaction.type === 'click') {
        return bilingual('sessionEvents.templates.click', { key: interaction.key, area: payload.area });
    }
    return bilingual('sessionEvents.templates.change', { key: interaction.key, area: payload.area });
}

function bookingCreatedDescription(payload: SessionEventPayload<'BOOKING_REQUEST_CREATED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        ...bilingual('sessionEvents.templates.bookingCreated', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOpenedToOtherCooksDescription(payload: SessionEventPayload<'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        ...bilingual('sessionEvents.templates.bookingOpened', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingCanceledDescription(payload: SessionEventPayload<'BOOKING_REQUEST_CANCELED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        ...bilingual('sessionEvents.templates.bookingCanceled', { id: payload.bookingRequestId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOfferActorDescription(
    payload: SessionEventPayload<'BOOKING_REQUEST_OFFER_ACCEPTED'> | SessionEventPayload<'BOOKING_REQUEST_OFFER_DECLINED'>,
    kind: 'accepted' | 'declined',
): { de: string; en: string; link: string } {
    const actorKey = payload.actor === 'cook' ? 'cook' : 'customer';
    const actor = bilingual(`sessionEvents.actors.${actorKey}`);
    const template = kind === 'accepted' ? 'sessionEvents.templates.offerAccepted' : 'sessionEvents.templates.offerDeclined';
    return {
        de: t('de', 'admin', template, { actor: actor.de, offerId: payload.bookingRequestOfferId }),
        en: t('en', 'admin', template, { actor: actor.en, offerId: payload.bookingRequestOfferId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingOfferPaymentDescription(
    payload: SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED'> | SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_FAILED'>,
    kind: 'succeeded' | 'failed',
): { de: string; en: string; link: string } {
    const template = kind === 'succeeded' ? 'sessionEvents.templates.paymentSucceeded' : 'sessionEvents.templates.paymentFailed';
    return {
        ...bilingual(template, { offerId: payload.bookingRequestOfferId }),
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function giftCardCreatedDescription(payload: SessionEventPayload<'GIFT_CARD_CREATED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        ...bilingual('sessionEvents.templates.giftCardCreated', { id: payload.giftCardId }),
        link: `/admin/gift-cards/${payload.giftCardId}`,
    };
}

function giftCardPayedDescription(payload: SessionEventPayload<'GIFT_CARD_PAYED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        ...bilingual('sessionEvents.templates.giftCardPayed', { id: payload.giftCardId }),
        link: `/admin/gift-cards/${payload.giftCardId}`,
    };
}

function oauthProviderLabel(provider: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>['provider']): string {
    return { GOOGLE: 'Google' }[provider];
}

function authOauthSignInSucceededDescription(payload: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>): {
    de: string;
    en: string;
} {
    const provider = oauthProviderLabel(payload.provider);
    if (payload.outcome === 'registration_ticket') {
        return bilingual('sessionEvents.templates.oauthRegistration', { provider });
    }
    return bilingual('sessionEvents.templates.oauthSucceeded', { provider });
}

function authOauthSignInFailedDescription(payload: SessionEventPayload<'AUTH_OAUTH_SIGN_IN_FAILED'>): { de: string; en: string } {
    const provider = oauthProviderLabel(payload.provider);
    return bilingual('sessionEvents.templates.oauthFailed', { provider, reason: payload.reason });
}

function authOauthAccountCreatedDescription(payload: SessionEventPayload<'AUTH_OAUTH_ACCOUNT_CREATED'>): { de: string; en: string } {
    const provider = oauthProviderLabel(payload.provider);
    return bilingual('sessionEvents.templates.oauthAccountCreated', { provider });
}

function authEmailOtpVerifyDescription(payload: SessionEventPayload<'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED'>): {
    de: string;
    en: string;
} {
    if (payload.outcome === 'registration_ticket') {
        return bilingual('sessionEvents.auth.emailOtpRegistration');
    }
    return bilingual('sessionEvents.auth.emailOtpSignIn');
}

function authTotpVerifyDescription(payload: SessionEventPayload<'AUTH_TOTP_VERIFY_SUCCEEDED'>): { de: string; en: string } {
    if (payload.via === 'recovery') {
        return bilingual('sessionEvents.auth.totpRecovery');
    }
    return bilingual('sessionEvents.auth.totpAuthenticator');
}

export function toGqlAdminSessionEvent(event: SessionEvent, isImpersonation = false): GqlSAdminSessionEvent {
    const rawType = event.type;
    const fallback = isSessionEventKey(rawType)
        ? staticDescription(rawType)
        : bilingual('sessionEvents.templates.unknown', { type: rawType });

    let descriptionDe = fallback.de;
    let descriptionEn = fallback.en;
    let link: string | null = null;

    if (isSessionEventKey(rawType)) {
        switch (rawType) {
            case 'WEB_PAGE_VISITED': {
                const copy = visitDescription(event.payload as SessionEventPayload<'WEB_PAGE_VISITED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'WEB_PAGE_INTERACTION': {
                const copy = interactionDescription(event.payload as SessionEventPayload<'WEB_PAGE_INTERACTION'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'BOOKING_REQUEST_CREATED': {
                const copy = bookingCreatedDescription(event.payload as SessionEventPayload<'BOOKING_REQUEST_CREATED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS': {
                const copy = bookingOpenedToOtherCooksDescription(
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OPENED_TO_OTHER_COOKS'>,
                );
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_CANCELED': {
                const copy = bookingCanceledDescription(event.payload as SessionEventPayload<'BOOKING_REQUEST_CANCELED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_ACCEPTED': {
                const copy = bookingOfferActorDescription(
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_ACCEPTED'>,
                    'accepted',
                );
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_DECLINED': {
                const copy = bookingOfferActorDescription(
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_DECLINED'>,
                    'declined',
                );
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED': {
                const copy = bookingOfferPaymentDescription(
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED'>,
                    'succeeded',
                );
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'BOOKING_REQUEST_OFFER_PAYMENT_FAILED': {
                const copy = bookingOfferPaymentDescription(
                    event.payload as SessionEventPayload<'BOOKING_REQUEST_OFFER_PAYMENT_FAILED'>,
                    'failed',
                );
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'GIFT_CARD_CREATED': {
                const copy = giftCardCreatedDescription(event.payload as SessionEventPayload<'GIFT_CARD_CREATED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'GIFT_CARD_PAYED': {
                const copy = giftCardPayedDescription(event.payload as SessionEventPayload<'GIFT_CARD_PAYED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                link = copy.link;
                break;
            }
            case 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED': {
                const copy = authEmailOtpVerifyDescription(event.payload as SessionEventPayload<'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'AUTH_OAUTH_SIGN_IN_SUCCEEDED': {
                const copy = authOauthSignInSucceededDescription(event.payload as SessionEventPayload<'AUTH_OAUTH_SIGN_IN_SUCCEEDED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'AUTH_OAUTH_SIGN_IN_FAILED': {
                const copy = authOauthSignInFailedDescription(event.payload as SessionEventPayload<'AUTH_OAUTH_SIGN_IN_FAILED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'AUTH_OAUTH_ACCOUNT_CREATED': {
                const copy = authOauthAccountCreatedDescription(event.payload as SessionEventPayload<'AUTH_OAUTH_ACCOUNT_CREATED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            case 'AUTH_TOTP_VERIFY_SUCCEEDED': {
                const copy = authTotpVerifyDescription(event.payload as SessionEventPayload<'AUTH_TOTP_VERIFY_SUCCEEDED'>);
                descriptionDe = copy.de;
                descriptionEn = copy.en;
                break;
            }
            default:
                break;
        }
    }

    return {
        sessionEventId: event.sessionEventId,
        sessionId: event.sessionId,
        type: rawType,
        descriptionDe,
        descriptionEn,
        createdAt: event.createdAt,
        link,
        isImpersonation,
    };
}
