import { bookingRequestFormFunnelArea } from '../../shared/bookingRequestFormFunnel';
import { cookBookingRequestOfferFunnelArea } from '../../shared/cookBookingRequestOfferFunnel';
import type { SessionEvent } from '../db/schema';
import type { SessionEventKey, SessionEventPayload } from '../domain/sessionEvent';
import { isSessionEventKey } from '../domain/sessionEvent';
import type { GqlSAdminSessionEvent } from '../graphql/generated';

const STATIC_DESCRIPTIONS = {
    WEB_PAGE_VISITED: { de: 'Seite besucht', en: 'Page visited' },
    WEB_PAGE_INTERACTION: { de: 'Seiteninteraktion', en: 'Page interaction' },
    BOOKING_REQUEST_CREATED: { de: 'Buchungsanfrage erstellt', en: 'Booking request created' },
    BOOKING_REQUEST_CANCELED: { de: 'Buchungsanfrage storniert', en: 'Booking request canceled' },
    USER_CREATE_SUCCESSFUL: { de: 'Konto erstellt', en: 'Account created' },
    USER_CREATE_FAILED: { de: 'Kontoerstellung fehlgeschlagen', en: 'Account creation failed' },
    USER_CREATE_USER_WITH_EMAIL_ADDRESS_ALREADY_EXISTS: {
        de: 'Kontoerstellung: E-Mail bereits registriert',
        en: 'Account creation: email already registered',
    },
    USER_CREATE_USER_WITH_UNCONFIRMED_EMAIL_ADDRESS_ALREADY_EXISTS: {
        de: 'Kontoerstellung: unbestätigte E-Mail bereits vorhanden (Legacy)',
        en: 'Account creation: unconfirmed email already exists (legacy)',
    },
    USER_TERMS_ACCEPTED: { de: 'AGB akzeptiert', en: 'Terms accepted' },
    USER_PRIVACY_POLICY_ACCEPTED: { de: 'Datenschutz akzeptiert', en: 'Privacy policy accepted' },
    AUTH_EMAIL_OTP_REQUESTED: { de: 'E-Mail-OTP angefordert', en: 'Email OTP requested' },
    AUTH_EMAIL_OTP_VERIFY_FAILED: { de: 'E-Mail-OTP Prüfung fehlgeschlagen', en: 'Email OTP verification failed' },
    AUTH_EMAIL_OTP_VERIFY_SUCCEEDED: { de: 'E-Mail-OTP bestätigt', en: 'Email OTP verified' },
    AUTH_PASSKEY_SIGN_IN_SUCCEEDED: { de: 'Passkey-Anmeldung erfolgreich', en: 'Passkey sign-in succeeded' },
    AUTH_PASSKEY_SIGN_IN_FAILED: { de: 'Passkey-Anmeldung fehlgeschlagen', en: 'Passkey sign-in failed' },
    AUTH_TOTP_CHALLENGE_PENDING: { de: 'TOTP-Prüfung ausstehend', en: 'TOTP challenge pending' },
    AUTH_TOTP_VERIFY_SUCCEEDED: { de: 'TOTP bestätigt', en: 'TOTP verified' },
    AUTH_TOTP_VERIFY_FAILED: { de: 'TOTP-Prüfung fehlgeschlagen', en: 'TOTP verification failed' },
    SIGN_IN_FAILED: { de: 'Anmeldung fehlgeschlagen (Legacy)', en: 'Sign-in failed (legacy)' },
    SIGN_IN_NO_USER_FOR_EMAIL_ADDRESS: {
        de: 'Anmeldung: kein Nutzer für E-Mail (Legacy)',
        en: 'Sign-in: no user for email (legacy)',
    },
    SIGN_IN_UNCONFIRMED_EMAIL_ADDRESS: {
        de: 'Anmeldung: E-Mail unbestätigt (Legacy)',
        en: 'Sign-in: unconfirmed email (legacy)',
    },
    SIGN_IN_NO_PASSWORD: { de: 'Anmeldung: kein Passwort (Legacy)', en: 'Sign-in: no password (legacy)' },
    SIGN_IN_WRONG_PASSWORD: { de: 'Anmeldung: falsches Passwort (Legacy)', en: 'Sign-in: wrong password (legacy)' },
    SIGN_IN_SUCCESSFUL: { de: 'Anmeldung erfolgreich (Legacy)', en: 'Sign-in succeeded (legacy)' },
    SESSION_USER_PASSWORD_RESET_SUCCEEDED: {
        de: 'Passwort-Reset angefordert (Legacy)',
        en: 'Password reset requested (legacy)',
    },
    SESSION_USER_PASSWORD_RESET_FAILED: {
        de: 'Passwort-Reset fehlgeschlagen (Legacy)',
        en: 'Password reset failed (legacy)',
    },
    SESSION_USER_PASSWORD_RESET_CONFIRMATION_SUCCEEDED: {
        de: 'Passwort-Reset bestätigt (Legacy)',
        en: 'Password reset confirmed (legacy)',
    },
    SESSION_USER_PASSWORD_RESET_CONFIRMATION_FAILED: {
        de: 'Passwort-Reset-Bestätigung fehlgeschlagen (Legacy)',
        en: 'Password reset confirmation failed (legacy)',
    },
    USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_SUCCEEDED: {
        de: 'E-Mail-Bestätigung erfolgreich (Legacy)',
        en: 'Email confirmation succeeded (legacy)',
    },
    USER_EMAIL_ADDRESS_UPDATE_CONFIRMATION_FAILED: {
        de: 'E-Mail-Bestätigung fehlgeschlagen (Legacy)',
        en: 'Email confirmation failed (legacy)',
    },
    USER_PHONE_NUMBER_UPDATE_CONFIRMATION_SUCCEEDED: {
        de: 'Telefon-Bestätigung erfolgreich (Legacy)',
        en: 'Phone confirmation succeeded (legacy)',
    },
    USER_PHONE_NUMBER_UPDATE_CONFIRMATION_FAILED: {
        de: 'Telefon-Bestätigung fehlgeschlagen (Legacy)',
        en: 'Phone confirmation failed (legacy)',
    },
    NEWSLETTER_SUBSCRIPTION_CREATED: {
        de: 'Newsletter abonniert (Legacy)',
        en: 'Newsletter subscribed (legacy)',
    },
    NEWSLETTER_SUBSCRIPTION_FAILED: {
        de: 'Newsletter-Abo fehlgeschlagen (Legacy)',
        en: 'Newsletter subscription failed (legacy)',
    },
    NEWSLETTER_SUBSCRIPTION_ALREADY_EXISTS: {
        de: 'Newsletter bereits abonniert (Legacy)',
        en: 'Newsletter already subscribed (legacy)',
    },
} as const satisfies Record<SessionEventKey, { de: string; en: string }>;

function visitDescription(payload: SessionEventPayload<'WEB_PAGE_VISITED'>): { de: string; en: string } {
    const key = payload.webPageKey;
    const path = payload.path ? ` (${payload.path})` : '';
    return {
        de: `Seite besucht: ${key}${path}`,
        en: `Page visited: ${key}${path}`,
    };
}

function interactionDescription(payload: SessionEventPayload<'WEB_PAGE_INTERACTION'>): { de: string; en: string } {
    const interaction = payload.interaction;
    if (interaction.type === 'step_entered' || interaction.type === 'step_completed') {
        const isCookOfferFunnel = payload.area === cookBookingRequestOfferFunnelArea;
        const verb =
            interaction.type === 'step_entered'
                ? isCookOfferFunnel
                    ? { de: 'Angebots-Funnel-Schritt betreten', en: 'Entered offer funnel step' }
                    : { de: 'Formularschritt betreten', en: 'Entered form step' }
                : isCookOfferFunnel
                  ? { de: 'Angebots-Funnel-Schritt abgeschlossen', en: 'Completed offer funnel step' }
                  : { de: 'Formularschritt abgeschlossen', en: 'Completed form step' };
        const knownFunnelArea = payload.area === bookingRequestFormFunnelArea || isCookOfferFunnel;
        const areaNote = knownFunnelArea ? '' : ` [${payload.area}]`;
        const requestNote = isCookOfferFunnel && payload.bookingRequestId != null ? ` (${payload.bookingRequestId})` : '';
        return {
            de: `${verb.de}: ${interaction.step}${requestNote}${areaNote}`,
            en: `${verb.en}: ${interaction.step}${requestNote}${areaNote}`,
        };
    }
    if (interaction.type === 'click') {
        return {
            de: `Klick: ${interaction.key} (${payload.area})`,
            en: `Click: ${interaction.key} (${payload.area})`,
        };
    }
    return {
        de: `Änderung: ${interaction.key} (${payload.area})`,
        en: `Change: ${interaction.key} (${payload.area})`,
    };
}

function bookingCreatedDescription(payload: SessionEventPayload<'BOOKING_REQUEST_CREATED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        de: `Buchungsanfrage erstellt (${payload.bookingRequestId})`,
        en: `Booking request created (${payload.bookingRequestId})`,
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function bookingCanceledDescription(payload: SessionEventPayload<'BOOKING_REQUEST_CANCELED'>): {
    de: string;
    en: string;
    link: string;
} {
    return {
        de: `Buchungsanfrage storniert (${payload.bookingRequestId})`,
        en: `Booking request canceled (${payload.bookingRequestId})`,
        link: `/admin/booking-requests/${payload.bookingRequestId}`,
    };
}

function authEmailOtpVerifyDescription(payload: SessionEventPayload<'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED'>): {
    de: string;
    en: string;
} {
    if (payload.outcome === 'registration_ticket') {
        return {
            de: 'E-Mail-OTP bestätigt (Registrierung)',
            en: 'Email OTP verified (registration)',
        };
    }
    return {
        de: 'E-Mail-OTP bestätigt (Anmeldung)',
        en: 'Email OTP verified (sign-in)',
    };
}

function authTotpVerifyDescription(payload: SessionEventPayload<'AUTH_TOTP_VERIFY_SUCCEEDED'>): { de: string; en: string } {
    if (payload.via === 'recovery') {
        return {
            de: 'TOTP bestätigt (Wiederherstellungscode)',
            en: 'TOTP verified (recovery code)',
        };
    }
    return {
        de: 'TOTP bestätigt (Authenticator)',
        en: 'TOTP verified (authenticator)',
    };
}

export function toGqlAdminSessionEvent(event: SessionEvent): GqlSAdminSessionEvent {
    const rawType = event.type;
    const fallback = isSessionEventKey(rawType)
        ? STATIC_DESCRIPTIONS[rawType]
        : {
              de: `Unbekanntes Ereignis (${rawType})`,
              en: `Unknown event (${rawType})`,
          };

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
            case 'BOOKING_REQUEST_CANCELED': {
                const copy = bookingCanceledDescription(event.payload as SessionEventPayload<'BOOKING_REQUEST_CANCELED'>);
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
    };
}
