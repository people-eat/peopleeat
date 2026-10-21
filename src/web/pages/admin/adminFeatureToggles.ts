import type { FeatureToggleKey } from '../../../shared/featureToggle';
import type { Locale } from '../../utils/locale';

const adminFeatureToggleLabels: Record<FeatureToggleKey, Record<Locale, string>> = {
    AI_MENU_EVALUATION: { de: 'KI-Menübewertung', en: 'AI menu evaluation' },
    AI_BOOKING_REQUEST_MESSAGE: {
        de: 'KI: Angepasste Anfrage-Nachricht',
        en: 'AI: Adjusted booking-request message',
    },
    COOK_BIOGRAPHY_AI_WRITE: { de: 'KI-Biografie schreiben', en: 'AI biography writing' },
    COOK_WALLET_STRIPE_BALANCE: { de: 'Wallet: Stripe-Guthaben', en: 'Wallet: Stripe balance' },
    BOOKING_REQUEST_RESTRICTIONS: { de: 'Buchungsanfrage: Einschränkungen', en: 'Booking request: restrictions' },
    BOOKING_REQUEST_OFFER_CHAT_REACTIONS: {
        de: 'Angebots-Chat: Emoji-Reaktionen',
        en: 'Offer chat: emoji reactions',
    },
    BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT: {
        de: 'Angebot: Teilnehmeränderung nach Annahme',
        en: 'Offer: participant amendment after accept',
    },
    ASSISTANT_CUSTOMER: { de: 'Assistent: Kunden', en: 'Assistant: customer' },
    ASSISTANT_COOK: { de: 'Assistent: Köche', en: 'Assistant: cook' },
    PUBLICATION_MEALS: { de: 'Veröffentlichung: Gerichte', en: 'Publication: meals' },
    PUBLICATION_MENUS: { de: 'Veröffentlichung: Menüs', en: 'Publication: menus' },
    WHATSAPP_ENGLISH_TEMPLATES: { de: 'WhatsApp: Englische Vorlagen', en: 'WhatsApp: English templates' },
};

const adminFeatureToggleDescriptions: Record<FeatureToggleKey, Record<Locale, string>> = {
    AI_MENU_EVALUATION: {
        de: 'Steuert, ob Köche ihre Menüs per KI bewerten, aktualisieren und Ergebnisse übernehmen können.',
        en: 'Controls whether cooks can open, refresh, and apply AI menu evaluations.',
    },
    AI_BOOKING_REQUEST_MESSAGE: {
        de: 'Schreibt die Buchungsanfrage-Nachricht nach dem Anlegen für den Koch per KI um.',
        en: 'Rewrites the booking-request message with AI for cooks after create.',
    },
    COOK_BIOGRAPHY_AI_WRITE: {
        de: 'Zeigt „Schreiben / Verbessern mit KI“ im Koch-Profil-Editor. Die Kurzfassung bleibt immer aktiv.',
        en: 'Shows Write / Improve with AI on the cook chef-profile editor. Short summary generation stays always on.',
    },
    COOK_WALLET_STRIPE_BALANCE: {
        de: 'Zeigt Live-Stripe-Connect-Guthaben und aktuelle Transaktionen auf der Wallet-Seite des Kochs.',
        en: 'Shows live Stripe Connect balance and recent transactions on the cook wallet page.',
    },
    BOOKING_REQUEST_RESTRICTIONS: {
        de: 'Zeigt den Schritt für Ernährungseinschränkungen in der Anfrage und die zugehörigen Editoren. Bei Aus sind neue Werte serverseitig leer.',
        en: 'Shows the dietary-restrictions step and related editors. When off, create and update strip non-empty restriction values.',
    },
    BOOKING_REQUEST_OFFER_CHAT_REACTIONS: {
        de: 'Aktiviert Emoji-Reaktionen auf Nachrichten im Angebots-Chat (Kunde, Koch und Admin).',
        en: 'Enables emoji reactions on offer chat messages for customers, cooks, and admins.',
    },
    BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT: {
        de: 'Erlaubt nach beiderseitiger Annahme eine Teilnehmeränderung (Kunde schlägt vor, Koch nimmt an oder lehnt ab) inklusive Vorbereitungssperre.',
        en: 'Allows post-accept headcount changes (customer proposes, cook accepts or declines) plus the cook preparations lock.',
    },
    ASSISTANT_CUSTOMER: {
        de: 'Zeigt den Kunden-Assistenten im Profil (Trigger, Seitenleiste und Route).',
        en: 'Shows the customer assistant in the profile (trigger, sidebar, and route).',
    },
    ASSISTANT_COOK: {
        de: 'Zeigt den Koch-Assistenten im Profil (Trigger, Seitenleiste und Route).',
        en: 'Shows the cook assistant in the profile (trigger, sidebar, and route).',
    },
    PUBLICATION_MEALS: {
        de: 'Steuert Veröffentlichen/Zurückziehen und Status-Badges für Gerichte im Koch-Profil. Öffentliche Seiten filtern weiter nach Veröffentlichungsdatum.',
        en: 'Controls publish/unpublish and status badges for meals in the cook profile. Public pages still filter by publication date.',
    },
    PUBLICATION_MENUS: {
        de: 'Steuert Veröffentlichen/Zurückziehen und Status-Badges für Menüs im Koch-Profil. Öffentliche Seiten filtern weiter nach Veröffentlichungsdatum.',
        en: 'Controls publish/unpublish and status badges for menus in the cook profile. Public pages still filter by publication date.',
    },
    WHATSAPP_ENGLISH_TEMPLATES: {
        de: 'Wenn an, erhalten englische Empfänger englische Meta-Vorlagen. Wenn aus, werden deutsche Sprachcodes verwendet.',
        en: 'When on, English recipients get English Meta templates. When off, German language codes are used.',
    },
};

export type AdminFeatureToggleOverrideMode = 'default' | 'user-on' | 'user-off';

export function adminFeatureToggleLabel(featureToggleKey: FeatureToggleKey, locale: Locale): string {
    return adminFeatureToggleLabels[featureToggleKey][locale];
}

export function adminFeatureToggleDescription(featureToggleKey: FeatureToggleKey, locale: Locale): string {
    return adminFeatureToggleDescriptions[featureToggleKey][locale];
}

export function adminFeatureToggleOverrideModeFromEnabled(enabled: boolean | undefined): AdminFeatureToggleOverrideMode {
    if (enabled === true) return 'user-on';
    if (enabled === false) return 'user-off';
    return 'default';
}

export function adminFeatureToggleOverrideModeLabel(mode: AdminFeatureToggleOverrideMode, locale: Locale): string {
    return {
        default: { de: 'Standard (global)', en: 'Default (global)' },
        'user-on': { de: 'Für Nutzer: an', en: 'Enabled for user' },
        'user-off': { de: 'Für Nutzer: aus', en: 'Disabled for user' },
    }[mode][locale];
}
