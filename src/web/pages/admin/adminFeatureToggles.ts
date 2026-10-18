import type { FeatureToggleKey } from '../../../shared/featureToggle';
import type { Locale } from '../../utils/locale';

const adminFeatureToggleLabels: Record<FeatureToggleKey, Record<Locale, string>> = {
    AI_MENU_EVALUATION: { de: 'KI-Menübewertung', en: 'AI menu evaluation' },
    COOK_BIOGRAPHY_AI_WRITE: { de: 'KI-Biografie schreiben', en: 'AI biography writing' },
    COOK_WALLET_STRIPE_BALANCE: { de: 'Wallet: Stripe-Guthaben', en: 'Wallet: Stripe balance' },
    BOOKING_REQUEST_RESTRICTIONS: { de: 'Buchungsanfrage: Einschränkungen', en: 'Booking request: restrictions' },
    BOOKING_REQUEST_OFFER_CHAT_REACTIONS: {
        de: 'Angebots-Chat: Emoji-Reaktionen',
        en: 'Offer chat: emoji reactions',
    },
    ASSISTANT_CUSTOMER: { de: 'Assistent: Kunden', en: 'Assistant: customer' },
    ASSISTANT_COOK: { de: 'Assistent: Köche', en: 'Assistant: cook' },
    PUBLICATION_MEALS: { de: 'Veröffentlichung: Gerichte', en: 'Publication: meals' },
    PUBLICATION_MENUS: { de: 'Veröffentlichung: Menüs', en: 'Publication: menus' },
    WHATSAPP_ENGLISH_TEMPLATES: { de: 'WhatsApp: Englische Vorlagen', en: 'WhatsApp: English templates' },
    WHATSAPP_WEBHOOK_SIGNATURE_VALIDATION: {
        de: 'WhatsApp: Webhook-Signaturprüfung',
        en: 'WhatsApp: webhook signature validation',
    },
};

export type AdminFeatureToggleOverrideMode = 'default' | 'force-on' | 'force-off';

export function adminFeatureToggleLabel(featureToggleKey: FeatureToggleKey, locale: Locale): string {
    return adminFeatureToggleLabels[featureToggleKey][locale];
}

export function adminFeatureToggleOverrideModeFromEnabled(enabled: boolean | undefined): AdminFeatureToggleOverrideMode {
    if (enabled === true) return 'force-on';
    if (enabled === false) return 'force-off';
    return 'default';
}

export function adminFeatureToggleOverrideModeLabel(mode: AdminFeatureToggleOverrideMode, locale: Locale): string {
    return {
        default: { de: 'Standard (global)', en: 'Default (global)' },
        'force-on': { de: 'Erzwingen: an', en: 'Force on' },
        'force-off': { de: 'Erzwingen: aus', en: 'Force off' },
    }[mode][locale];
}
