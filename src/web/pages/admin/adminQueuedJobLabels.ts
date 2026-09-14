import type { Locale } from '../../utils/locale';

export function adminQueuedJobNameLabel(name: string, locale: Locale): string {
    const labels: Record<string, Record<Locale, string>> = {
        'booking-request-offer-pull-payment': {
            de: 'Kartenzahlung einziehen',
            en: 'Pull card payment',
        },
        'booking-request-offer-pull-payment-announcement': {
            de: 'Zahlungserinnerung (Ankündigung)',
            en: 'Pull payment announcement',
        },
        'booking-request-offer-testimonial-reminder': {
            de: 'Bewertungserinnerung',
            en: 'Testimonial reminder',
        },
        'booking-request-offer-chat-message-notify': {
            de: 'Chat-Benachrichtigung',
            en: 'Chat message notify',
        },
        'booking-request-offer-call-slot-reminder': {
            de: 'Anruf-Erinnerung',
            en: 'Call slot reminder',
        },
        'booking-request-offer-call-slots-complete': {
            de: 'Anruf-Slot abschließen',
            en: 'Call slot complete',
        },
        'booking-request-offer-call-recording-finalize': {
            de: 'Anruf-Transkript finalisieren',
            en: 'Call recording finalize',
        },
        'booking-request-expire-notify': {
            de: 'Anfrage-Ablauf',
            en: 'Request expire notify',
        },
        'booking-request-no-offers-notify': {
            de: 'Keine Angebote (Slack)',
            en: 'No offers notify',
        },
        'booking-request-reaction-reminder': {
            de: 'Reaktions-Erinnerung',
            en: 'Reaction reminder',
        },
        'booking-request-offer-event-tomorrow-notify': {
            de: 'Event morgen (Slack)',
            en: 'Event tomorrow notify',
        },
        'gift-card-prepared-expire': {
            de: 'Gutschein-Ablauf (unbezahlt)',
            en: 'Gift card prepared expire',
        },
        'support-request-customer-reply-notify': {
            de: 'Support-Antwort-E-Mail',
            en: 'Support reply notify',
        },
        'chat-title-generate': {
            de: 'Chat-Titel generieren',
            en: 'Chat title generate',
        },
        'cook-biography-summary-generate': {
            de: 'Koch-Bio-Zusammenfassung',
            en: 'Cook biography summary',
        },
        'cook-booking-request-menu-evaluation-generate': {
            de: 'Menü-Bewertung',
            en: 'Menu evaluation',
        },
        'user-klaviyo-profile-sync': {
            de: 'Klaviyo-Profil-Sync',
            en: 'Klaviyo profile sync',
        },
    };
    return labels[name]?.[locale] ?? name;
}

/** Short bilingual explanation of what the queued job does when it runs. */
export function adminQueuedJobDescription(name: string, locale: Locale): string | null {
    const descriptions: Record<string, Record<Locale, string>> = {
        'booking-request-offer-pull-payment': {
            de: 'Zieht die hinterlegte Karte des Kunden etwa 14 Tage vor dem Event ein.',
            en: "Charges the customer's saved card about 14 days before the event.",
        },
        'booking-request-offer-pull-payment-announcement': {
            de: 'Erinnert den Kunden einen Tag vor dem geplanten Karteneinzug an die Zahlung.',
            en: 'Reminds the customer one day before the scheduled card charge.',
        },
        'booking-request-offer-testimonial-reminder': {
            de: 'Sendet Erinnerungen an Kunde oder Koch, eine Bewertung abzugeben.',
            en: 'Sends reminders to customer or cook to leave a review.',
        },
        'booking-request-offer-chat-message-notify': {
            de: 'Sendet eine verzögerte E-Mail, wenn neue Angebot-Chat-Nachrichten ungelesen sind.',
            en: 'Sends a debounced email when new offer chat messages are unread.',
        },
        'booking-request-offer-call-slot-reminder': {
            de: 'Erinnert beide Parteien per E-Mail 60 Minuten vor dem bestätigten Anruf-Slot.',
            en: 'Emails both parties 60 minutes before the confirmed call slot.',
        },
        'booking-request-offer-call-slots-complete': {
            de: 'Markiert den Anruf-Slot als abgeschlossen oder lässt offene Slots ablaufen.',
            en: 'Marks the call slot completed or expires still-pending slots.',
        },
        'booking-request-offer-call-recording-finalize': {
            de: 'Holt die Aufnahme ab und erstellt das Transkript nach Ende des Anrufs.',
            en: 'Fetches the recording and builds the transcript after the call ends.',
        },
        'booking-request-expire-notify': {
            de: 'Aktualisiert die Anfrage und benachrichtigt, wenn die Ablaufzeit erreicht ist.',
            en: 'Updates the request and notifies when the expiry time is reached.',
        },
        'booking-request-no-offers-notify': {
            de: 'Sendet eine Slack-Warnung, wenn nach 24 oder 48 Stunden noch kein Angebot da ist.',
            en: 'Posts a Slack alert when there is still no offer after 24 or 48 hours.',
        },
        'booking-request-reaction-reminder': {
            de: 'Erinnert den Kunden per WhatsApp, auf offene Angebote zu reagieren.',
            en: 'Nudges the customer on WhatsApp to react to open offers.',
        },
        'booking-request-offer-event-tomorrow-notify': {
            de: 'Sendet morgens vor dem Event eine Slack-Erinnerung an das Ops-Team.',
            en: 'Posts a morning Slack reminder to ops the day before a paid event.',
        },
        'gift-card-prepared-expire': {
            de: 'Löscht unbezahlte Gutschein-Entwürfe und storniert die Stripe PaymentIntent.',
            en: 'Deletes unpaid prepared gift cards and cancels the Stripe PaymentIntent.',
        },
        'support-request-customer-reply-notify': {
            de: 'Sendet dem Kunden eine E-Mail, nachdem ein Admin im Support geantwortet hat.',
            en: 'Emails the customer after an admin replies in a support case.',
        },
        'chat-title-generate': {
            de: 'Erzeugt per KI einen kurzen Titel für den Assistenten-Chat.',
            en: 'Uses AI to generate a short title for the assistant chat.',
        },
        'cook-biography-summary-generate': {
            de: 'Erzeugt per KI eine Kurzfassung der Koch-Biografie für öffentliche Profile.',
            en: 'Uses AI to summarize the cook biography for public profiles.',
        },
        'cook-booking-request-menu-evaluation-generate': {
            de: 'Bewertet und rankt Menüs für die Anfrage, inkl. Inventar-Entwurf.',
            en: 'Ranks menus for the request and drafts inventory menu suggestions.',
        },
        'user-klaviyo-profile-sync': {
            de: 'Synchronisiert Nutzerdaten mit dem Klaviyo-Marketingprofil.',
            en: 'Syncs user data to the Klaviyo marketing profile.',
        },
    };
    return descriptions[name]?.[locale] ?? null;
}

export function adminQueuedJobStateLabel(state: 'CREATED' | 'RETRY' | 'ACTIVE', locale: Locale): string {
    return {
        CREATED: { de: 'Geplant', en: 'Scheduled' },
        RETRY: { de: 'Wiederholung', en: 'Retry' },
        ACTIVE: { de: 'Läuft', en: 'Active' },
    }[state][locale];
}

export function adminQueuedJobStateTone(state: 'CREATED' | 'RETRY' | 'ACTIVE'): 'info' | 'warning' {
    const tones = {
        CREATED: 'info',
        RETRY: 'warning',
        ACTIVE: 'warning',
    } as const;
    return tones[state];
}

export function adminQueuedJobDataDetail(data: unknown, locale: Locale): string | null {
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof record.kind === 'string') {
        const kindLabels: Record<string, Record<Locale, string>> = {
            MEMORY_NUDGE: { de: 'Erinnerungs-Nudge', en: 'Memory nudge' },
            REMINDER_MORNING: { de: 'Morgen-Erinnerung', en: 'Morning reminder' },
            REMINDER_EVENING: { de: 'Abend-Erinnerung', en: 'Evening reminder' },
        };
        parts.push(kindLabels[record.kind]?.[locale] ?? record.kind);
    }
    if (typeof record.audience === 'string') {
        parts.push(
            {
                CUSTOMER: { de: 'Kunde', en: 'Customer' },
                COOK: { de: 'Koch', en: 'Cook' },
            }[record.audience]?.[locale] ?? record.audience,
        );
    }
    if (typeof record.hours === 'number') {
        parts.push(`${record.hours}h`);
    }
    if (typeof record.cookCallSlotBookingId === 'string') {
        parts.push(`slot ${record.cookCallSlotBookingId.slice(0, 8)}…`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
}
