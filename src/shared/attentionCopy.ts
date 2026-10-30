import { cookCallSlotBookingWhenFormat } from './cookCallSlotBookingStatus';
import { formatDate, formatTime } from './formatDate';
import type { Locale } from './locale';
import type { StatusTone } from './statusTone';

// Wording for server-derived attention (`User.attention`, `Cook.attention`,
// `Cook.onboardingSteps`). The server decides *what* applies; this module only
// says it. Routes and layout stay on each platform. See docs/architecture/attention.md.

export type UserAttentionKind =
    | 'OFFERS_TO_REVIEW'
    | 'PAYMENT_DUE'
    | 'OFFER_CHAT_UNREAD'
    | 'CALL_RESPONSE_NEEDED'
    | 'CALL_PENDING'
    | 'CALL_CONFIRMED'
    | 'TESTIMONIAL_MISSING';

export type CookAttentionKind = 'APPROVAL_PENDING' | 'WALLET_RESET' | 'OFFER_CHAT_UNREAD' | 'CALL_UPCOMING';

export type CookOnboardingStep = 'WALLET' | 'TRAVEL' | 'PROFILE_PICTURE' | 'CHEF_PROFILE' | 'FIRST_MEAL' | 'FIRST_MENU' | 'FIRST_OFFER';

export type AttentionCopy = {
    title: string;
    body: string;
    actionLabel: string;
};

/** `actionLabel` is null when there is nothing to click (waiting for admin approval). */
type CookAttentionCopy = Omit<AttentionCopy, 'actionLabel'> & { actionLabel: string | null };

type AttentionTone = Extract<StatusTone, 'info' | 'warning'>;

function offerChatUnreadCopy(count: number, locale: Locale): AttentionCopy {
    return {
        title:
            count === 1
                ? { de: 'Neue Nachricht im Angebotschat', en: 'New message in offer chat' }[locale]
                : { de: `${count} neue Nachrichten in Angebotschats`, en: `${count} new messages in offer chats` }[locale],
        body: { de: 'Öffne den Chat, um zu antworten.', en: 'Open the chat to reply.' }[locale],
        actionLabel: { de: 'Zum Chat', en: 'Open chat' }[locale],
    };
}

export function userAttentionKindTone(kind: UserAttentionKind): AttentionTone {
    switch (kind) {
        case 'OFFERS_TO_REVIEW':
        case 'PAYMENT_DUE':
        case 'OFFER_CHAT_UNREAD':
        case 'CALL_RESPONSE_NEEDED':
            return 'warning';
        case 'CALL_PENDING':
        case 'CALL_CONFIRMED':
        case 'TESTIMONIAL_MISSING':
            return 'info';
    }
}

/** Short label when an item is folded into a booking-request card. */
export function userAttentionKindBadgeLabel(kind: UserAttentionKind, locale: Locale): string {
    switch (kind) {
        case 'OFFERS_TO_REVIEW':
            return { de: 'Entscheidung', en: 'Decision' }[locale];
        case 'PAYMENT_DUE':
            return { de: 'Zahlung', en: 'Payment' }[locale];
        case 'OFFER_CHAT_UNREAD':
            return { de: 'Nachricht', en: 'Message' }[locale];
        case 'CALL_RESPONSE_NEEDED':
        case 'CALL_PENDING':
        case 'CALL_CONFIRMED':
            return { de: 'Termin', en: 'Call' }[locale];
        case 'TESTIMONIAL_MISSING':
            return { de: 'Bewertung', en: 'Review' }[locale];
    }
}

export function userAttentionCopy(
    item: {
        kind: UserAttentionKind;
        count: number;
        occasion: string;
        callStartAt?: string | Date | null;
        callEndAt?: string | Date | null;
    },
    locale: Locale,
    timeZone: string,
): AttentionCopy {
    const when =
        item.callStartAt != null && item.callEndAt != null
            ? cookCallSlotBookingWhenFormat({ startAt: item.callStartAt, endAt: item.callEndAt }, locale, timeZone)
            : '';
    const upcomingCallTitle = { de: 'Bevorstehender Call', en: 'Upcoming call' }[locale];
    const openCall = { de: 'Zum Anruf', en: 'Open call' }[locale];

    switch (item.kind) {
        case 'OFFERS_TO_REVIEW':
            return {
                title:
                    item.count === 1
                        ? { de: 'Angebot wartet auf deine Entscheidung', en: 'An offer is waiting for your decision' }[locale]
                        : { de: `${item.count} Anfragen mit Angeboten zum Prüfen`, en: `${item.count} requests with offers to review` }[
                              locale
                          ],
                body: {
                    de: 'Vergleiche die Vorschläge und nimm eines an, sobald es passt.',
                    en: 'Compare the proposals and accept one when it feels right.',
                }[locale],
                actionLabel:
                    item.count === 1
                        ? { de: 'Angebote ansehen', en: 'Review offers' }[locale]
                        : { de: 'Zu den Anfragen', en: 'View requests' }[locale],
            };
        case 'PAYMENT_DUE':
            return {
                title: { de: 'Zahlung ausstehend', en: 'Payment due' }[locale],
                body: {
                    de: `${item.occasion}: hinterlege deine Zahlung, um das Dinner zu bestätigen.`,
                    en: `${item.occasion}: add your payment details to confirm the dinner.`,
                }[locale],
                actionLabel: { de: 'Zum Checkout', en: 'Go to checkout' }[locale],
            };
        case 'OFFER_CHAT_UNREAD':
            return offerChatUnreadCopy(item.count, locale);
        case 'CALL_RESPONSE_NEEDED':
            return {
                title: { de: 'Terminvorschlag wartet auf dich', en: 'Call suggestion awaits your response' }[locale],
                body: { de: `Terminvorschlag wartet auf dich · ${when}`, en: `Call suggestion awaiting your response · ${when}` }[locale],
                actionLabel: openCall,
            };
        case 'CALL_PENDING':
            return {
                title: upcomingCallTitle,
                body: { de: `Terminanfrage ausstehend · ${when}`, en: `Call request pending · ${when}` }[locale],
                actionLabel: openCall,
            };
        case 'CALL_CONFIRMED':
            return {
                title: upcomingCallTitle,
                body: { de: `Gesprächstermin bestätigt · ${when}`, en: `Discovery call confirmed · ${when}` }[locale],
                actionLabel: openCall,
            };
        case 'TESTIMONIAL_MISSING':
            return {
                title: { de: 'Bewertung fehlt', en: 'Review missing' }[locale],
                body: {
                    de: `${item.occasion}: teile kurz, wie das Dinner war.`,
                    en: `${item.occasion}: share a quick note about how dinner went.`,
                }[locale],
                actionLabel: { de: 'Bewertung abgeben', en: 'Leave a review' }[locale],
            };
    }
}

export function cookAttentionKindTone(kind: CookAttentionKind): AttentionTone {
    switch (kind) {
        case 'WALLET_RESET':
        case 'OFFER_CHAT_UNREAD':
            return 'warning';
        case 'APPROVAL_PENDING':
        case 'CALL_UPCOMING':
            return 'info';
    }
}

export function cookAttentionCopy(
    item: { kind: CookAttentionKind; count: number; callStartAt?: string | Date | null; customerDisplay?: string | null },
    locale: Locale,
    timeZone: string,
): CookAttentionCopy {
    switch (item.kind) {
        case 'APPROVAL_PENDING':
            return {
                title: { de: 'Freischaltung ausstehend', en: 'Approval pending' }[locale],
                body: {
                    de: 'Unser Team meldet sich für ein kurzes Kennenlerngespräch. Danach kannst du dein Wallet einrichten und Angebote erstellen.',
                    en: 'Our team will reach out for a short intro call. Afterwards you can set up your wallet and create offers.',
                }[locale],
                actionLabel: null,
            };
        case 'WALLET_RESET':
            return {
                title: { de: 'Stripe benötigt aktualisierte Angaben', en: 'Stripe needs updated details' }[locale],
                body: {
                    de: 'Bitte aktualisiere dein Wallet, bevor Auszahlungen weiterlaufen.',
                    en: 'Please refresh your wallet before payouts can continue.',
                }[locale],
                actionLabel: { de: 'Zum Wallet', en: 'Go to wallet' }[locale],
            };
        case 'OFFER_CHAT_UNREAD':
            return offerChatUnreadCopy(item.count, locale);
        case 'CALL_UPCOMING': {
            const date = formatDate(item.callStartAt, { locale, timeZone, weekday: true, dateStyle: 'medium' });
            const time = formatTime(item.callStartAt, { locale, timeZone });
            const when = locale === 'de' ? `${date} · ${time} Uhr` : `${date} · ${time}`;
            return {
                title: { de: 'Bevorstehender Call', en: 'Upcoming call' }[locale],
                body: `${item.customerDisplay ?? ''} · ${when}`,
                actionLabel: { de: 'Zum Angebot', en: 'Open offer' }[locale],
            };
        }
    }
}

export function cookOnboardingStepCopy(step: CookOnboardingStep, locale: Locale): AttentionCopy {
    switch (step) {
        case 'WALLET':
            return {
                title: { de: 'Wallet einrichten', en: 'Set up your wallet' }[locale],
                body: { de: 'Richte Stripe Connect ein, um Auszahlungen zu erhalten.', en: 'Set up Stripe Connect to receive payouts.' }[
                    locale
                ],
                actionLabel: { de: 'Zum Wallet', en: 'Go to wallet' }[locale],
            };
        case 'TRAVEL':
            return {
                title: { de: 'Reiseadresse fehlt', en: 'Add travel origin' }[locale],
                body: {
                    de: 'Trage deine Startadresse ein, damit Reisekosten und Entfernungen stimmen.',
                    en: 'Add your travel origin so distances and expenses are accurate.',
                }[locale],
                actionLabel: { de: 'Zur Reise', en: 'Go to travel' }[locale],
            };
        case 'PROFILE_PICTURE':
            return {
                title: { de: 'Profilbild hinzufügen', en: 'Add a profile picture' }[locale],
                body: {
                    de: 'Ein Foto hilft Kunden, dich auf deinem öffentlichen Profil zu erkennen.',
                    en: 'A photo helps customers recognize you on your public profile.',
                }[locale],
                actionLabel: { de: 'Bild hinzufügen', en: 'Add picture' }[locale],
            };
        case 'CHEF_PROFILE':
            return {
                title: { de: 'Kochprofil vervollständigen', en: 'Complete your chef profile' }[locale],
                body: {
                    de: 'Schreibe eine Bio und wähle Küchenstil sowie Kochphilosophie.',
                    en: 'Add a bio and choose your cuisine style and cooking philosophy.',
                }[locale],
                actionLabel: { de: 'Zum Profil', en: 'Edit profile' }[locale],
            };
        case 'FIRST_MEAL':
            return {
                title: { de: 'Erstes Gericht anlegen', en: 'Create your first meal' }[locale],
                body: {
                    de: 'Gerichte sind die Bausteine deiner Menüs und Angebote.',
                    en: 'Meals are the building blocks for your menus and offers.',
                }[locale],
                actionLabel: { de: 'Zu den Gerichten', en: 'Go to meals' }[locale],
            };
        case 'FIRST_MENU':
            return {
                title: { de: 'Erstes Menü anlegen', en: 'Create your first menu' }[locale],
                body: {
                    de: 'Stelle Gerichte zu Menüs zusammen, die du Kunden vorschlagen kannst.',
                    en: 'Combine meals into menus you can suggest to customers.',
                }[locale],
                actionLabel: { de: 'Zu den Menüs', en: 'Go to menus' }[locale],
            };
        case 'FIRST_OFFER':
            return {
                title: { de: 'Erstes Angebot erstellen', en: 'Create your first offer' }[locale],
                body: {
                    de: 'Schau in den Anfragen-Pool und sende dein erstes Angebot.',
                    en: 'Browse the request pool and send your first offer.',
                }[locale],
                actionLabel: { de: 'Zum Pool', en: 'Go to pool' }[locale],
            };
    }
}
