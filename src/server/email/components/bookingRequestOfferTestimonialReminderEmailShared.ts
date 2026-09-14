import type { Locale } from '../../../shared/locale';

export type BookingRequestOfferTestimonialReminderKind = 'MEMORY_NUDGE' | 'REMINDER_MORNING' | 'REMINDER_EVENING';

type TestimonialReminderAudience = 'CUSTOMER' | 'COOK';

export function bookingRequestOfferTestimonialReminderCopyFor(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
    audience: TestimonialReminderAudience,
    counterpartyFirstName: string,
): { preview: string; body: string; linkLabel: string } {
    if (kind === 'MEMORY_NUDGE') {
        return {
            preview: {
                de: `Dein Event mit ${counterpartyFirstName} läuft. Memories für später sammeln`,
                en: `Your event with ${counterpartyFirstName} is on. Capture memories for later`,
            }[locale],
            body: {
                de:
                    audience === 'CUSTOMER'
                        ? `Dein Event mit ${counterpartyFirstName} läuft. Fotos und Eindrücke helfen dir später bei einer Bewertung.`
                        : `Dein Event mit ${counterpartyFirstName} läuft. Notiere gerne kurze Eindrücke für später.`,
                en:
                    audience === 'CUSTOMER'
                        ? `Your event with ${counterpartyFirstName} is underway. Photos and notes make leaving a review easier later.`
                        : `Your event with ${counterpartyFirstName} is underway. Jot down a few impressions for later.`,
            }[locale],
            linkLabel: {
                de: 'Zur Buchung öffnen',
                en: 'Open the booking',
            }[locale],
        };
    }

    const isEvening = kind === 'REMINDER_EVENING';
    return {
        preview: {
            de: isEvening
                ? `Erinnerung: Wie war dein Event mit ${counterpartyFirstName}?`
                : `Wie war dein Event mit ${counterpartyFirstName}? Kurz bewerten`,
            en: isEvening
                ? `Reminder: how was your event with ${counterpartyFirstName}?`
                : `How was your event with ${counterpartyFirstName}? Leave a short review`,
        }[locale],
        body: {
            de:
                audience === 'CUSTOMER'
                    ? `Wie war dein Event mit ${counterpartyFirstName}? Eine kurze Bewertung hilft anderen Gästen.`
                    : `Wie war dein Event mit ${counterpartyFirstName}? Eine kurze Bewertung hilft uns, die Plattform zu verbessern.`,
            en:
                audience === 'CUSTOMER'
                    ? `How was your event with ${counterpartyFirstName}? A short review helps other guests.`
                    : `How was your event with ${counterpartyFirstName}? A short review helps us improve the platform.`,
        }[locale],
        linkLabel: {
            de: 'Bewertung schreiben',
            en: 'Write a review',
        }[locale],
    };
}

export function bookingRequestOfferTestimonialReminderEmailSubject(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
): string {
    if (kind === 'MEMORY_NUDGE') {
        return { de: 'Sammle Erinnerungen an dein Event', en: 'Capture memories from your event' }[locale];
    }
    if (kind === 'REMINDER_EVENING') {
        return { de: 'Erinnerung: Bitte bewerte dein Event', en: 'Reminder: please review your event' }[locale];
    }
    return { de: 'Wie war dein Event?', en: 'How was your event?' }[locale];
}
