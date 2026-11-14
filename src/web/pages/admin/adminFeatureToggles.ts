import type { FeatureToggleKey } from '../../../shared/featureToggle';
import type { Locale } from '../../utils/locale';

const adminFeatureToggleLabels: Record<FeatureToggleKey, Record<Locale, string>> = {
    AI_MENU_EVALUATION: { de: 'KI-Menübewertung', en: 'AI menu evaluation' },
    AI_MENU_CREATE: { de: 'KI-Menü erstellen', en: 'AI menu create' },
    AI_BOOKING_REQUEST_MESSAGE: {
        de: 'KI: Angepasste Anfrage-Nachricht',
        en: 'AI: Adjusted booking-request message',
    },
    COOK_BIOGRAPHY_AI_WRITE: { de: 'KI-Biografie schreiben', en: 'AI biography writing' },
    COOK_WALLET_STRIPE_BALANCE: { de: 'Wallet: Stripe-Guthaben', en: 'Wallet: Stripe balance' },
    COOK_ANALYTICS: { de: 'Koch: Analysen', en: 'Cook: analytics' },
    COOK_PUBLIC_PROFILE_SHARE: { de: 'Koch: Öffentliches Profil teilen', en: 'Cook: share public profile' },
    COOK_PUBLIC_PROFILE_PATH_NAME: { de: 'Koch: Öffentliche URL', en: 'Cook: public URL' },
    COOK_PRESENCE_LINKS: { de: 'Koch: Weitere Profile', en: 'Cook: other profiles' },
    BOOKING_REQUEST_RESTRICTIONS: { de: 'Buchungsanfrage: Einschränkungen', en: 'Booking request: restrictions' },
    BOOKING_REQUEST_SETTING: { de: 'Buchungsanfrage: Innen / Außen', en: 'Booking request: indoor / outdoor' },
    BOOKING_REQUEST_KITCHEN_DETAILS: { de: 'Buchungsanfrage: Küchendetails', en: 'Booking request: kitchen details' },
    BOOKING_REQUEST_COOK_DIRECT: {
        de: 'Buchungsanfrage: Direkt an Koch',
        en: 'Booking request: cook direct',
    },
    BOOKING_REQUEST_OFFER_CHAT_REACTIONS: {
        de: 'Angebots-Chat: Emoji-Reaktionen',
        en: 'Offer chat: emoji reactions',
    },
    BOOKING_REQUEST_OFFER_AMENDMENT: {
        de: 'Angebot: Teilnehmer und Ort nach Annahme ändern',
        en: 'Offer: participant and venue amendment after accept',
    },
    BOOKING_REQUEST_OFFER_PRICE_IMPACT_PREVIEW: {
        de: 'Anfrage: Vorschau Preisanpassung bei Teilnehmerzahl',
        en: 'Request: auto price-adjustment preview on guest count',
    },
    BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE: {
        de: 'Angebot: Einkauf / Vorbereitung erledigt',
        en: 'Offer: shopping / preparations done',
    },
    BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS: {
        de: 'Angebot: Zahlungsbeleg und Abrechnung',
        en: 'Offer: payment receipt and payout statement',
    },
    BOOKING_REQUEST_OFFER_ADDONS: {
        de: 'Angebot: Zusatzleistungen',
        en: 'Offer: extras',
    },
    ASSISTANT_CUSTOMER: { de: 'Assistent: Kunden', en: 'Assistant: customer' },
    ASSISTANT_COOK: { de: 'Assistent: Köche', en: 'Assistant: cook' },
    PUBLICATION_MEALS: { de: 'Veröffentlichung: Gerichte', en: 'Publication: meals' },
    PUBLICATION_MENUS: { de: 'Veröffentlichung: Menüs', en: 'Publication: menus' },
    LANDING_BOOKING_HOW_IT_WORKS: {
        de: 'Startseite: So buchst du deinen Privatkoch',
        en: 'Landing: how booking works',
    },
    LANDING_TESTIMONIAL_CARDS: {
        de: 'Startseite: Bewertungskarten',
        en: 'Landing: testimonial cards',
    },
    VENUE_PAGE_VENUES_EXPLORE: {
        de: 'Locationseite: Weitere Locations',
        en: 'Venue page: more venues',
    },
    SIGN_IN_GOOGLE: { de: 'Anmeldung: Google', en: 'Sign-in: Google' },
};

const adminFeatureToggleDescriptions: Record<FeatureToggleKey, Record<Locale, string>> = {
    AI_MENU_EVALUATION: {
        de: 'Steuert, ob Köche ihre Menüs per KI bewerten, aktualisieren und Ergebnisse übernehmen können.',
        en: 'Controls whether cooks can open, refresh, and apply AI menu evaluations.',
    },
    AI_MENU_CREATE: {
        de: 'Zeigt beim Anlegen eines Menüs die Wahl Leer oder aus Notizen/Datei. Die KI nutzt vorhandene Gerichte und füllt Lücken.',
        en: 'Shows Empty vs from notes/file when creating a menu. AI reuses existing dishes and fills gaps.',
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
    COOK_ANALYTICS: {
        de: 'Zeigt Analysen im Koch-Profil (Übersicht und /profile/analytics): Profilbesuche, Reaktionszeiten, Angebote und Conversion.',
        en: 'Shows analytics in the cook profile (overview and /profile/analytics): profile views, response times, offers, and conversion.',
    },
    COOK_PUBLIC_PROFILE_SHARE: {
        de: 'Zeigt Teilen auf der öffentlichen Kochseite und in der Vorschau unter /profile/public (nativer Share-Sheet bzw. Link kopieren).',
        en: 'Shows Share on the public chef page and on /profile/public Preview (native share sheet or copy link).',
    },
    COOK_PUBLIC_PROFILE_PATH_NAME: {
        de: 'Zeigt den Editor für die öffentliche Koch-URL (/chefs/…) im Kochprofil. Öffentliche Seiten, Sitemap und Admin-Bearbeitung bleiben immer aktiv.',
        en: 'Shows the public chef URL editor (/chefs/…) on the cook chef profile. Public pages, sitemap, and admin editing stay always on.',
    },
    COOK_PRESENCE_LINKS: {
        de: 'Zeigt weitere öffentliche Profile im Kochprofil (Website, Instagram, Google, Take a Chef und andere Plattformen). Nur für die Prüfung durch das Team, nicht für Kunden.',
        en: 'Shows other public profiles on the cook chef profile (website, Instagram, Google, Take a Chef, and other platforms). For team review only, not for customers.',
    },
    BOOKING_REQUEST_RESTRICTIONS: {
        de: 'Zeigt den Schritt für Ernährungseinschränkungen in der Anfrage und die zugehörigen Editoren. Bei Aus sind neue Werte serverseitig leer.',
        en: 'Shows the dietary-restrictions step and related editors. When off, create and update strip non-empty restriction values.',
    },
    BOOKING_REQUEST_SETTING: {
        de: 'Zeigt die Karten Drinnen / Später / Draußen bei der Adresse. Bei Aus wird Innen/Außen beim Anlegen nicht gespeichert.',
        en: 'Shows Indoor / Later / Outdoor cards on the address step. When off, create does not store indoor/outdoor.',
    },
    BOOKING_REQUEST_KITCHEN_DETAILS: {
        de: 'Sammelt Küchendetails nach dem Senden der Anfrage (Bestätigungsseite und Anfrage). Bei Aus werden neue Werte nicht gespeichert.',
        en: 'Collects kitchen details after the request is sent (submitted page and request). When off, new values are not stored.',
    },
    BOOKING_REQUEST_COOK_DIRECT: {
        de: 'Auf der öffentlichen Kochseite führt „Anfrage senden“ zu einer Anfrage nur an diesen Koch. Bei Aus bleibt der normale Marktplatz-Pfad.',
        en: 'On the public chef page, Send request creates a request only for that cook. When off, the marketplace form stays unchanged.',
    },
    BOOKING_REQUEST_OFFER_CHAT_REACTIONS: {
        de: 'Aktiviert Emoji-Reaktionen auf Nachrichten im Angebots-Chat (Kunde, Koch und Admin).',
        en: 'Enables emoji reactions on offer chat messages for customers, cooks, and admins.',
    },
    BOOKING_REQUEST_OFFER_AMENDMENT: {
        de: 'Erlaubt nach beiderseitiger Annahme Änderungen an Teilnehmerzahl und Ort (Kunde schlägt vor, Koch nimmt an oder lehnt ab).',
        en: 'Allows post-accept changes to participants and venue (customer proposes, cook accepts or declines).',
    },
    BOOKING_REQUEST_OFFER_PRICE_IMPACT_PREVIEW: {
        de: 'Zeigt auf der Kunden-Bearbeiten-Seite die Live-Vorschau, wie sich offene Angebote bei geänderter Teilnehmerzahl preislich anpassen.',
        en: 'Shows the live preview on the customer edit page of how open offers auto-adjust price when guest count changes.',
    },
    BOOKING_REQUEST_OFFER_PREPARATIONS_COMPLETE: {
        de: 'Erlaubt dem Koch, Einkauf bzw. Vorbereitung als erledigt zu markieren. Danach sind Kundenänderungen an Teilnehmerzahl und Ort gesperrt.',
        en: 'Lets the cook mark shopping or preparations as done. That locks further customer changes to participants and venue.',
    },
    BOOKING_REQUEST_OFFER_PAYMENT_RECEIPTS: {
        de: 'Erstellt für bezahlte Angebote einen Zahlungsbeleg für den Gast und eine Abrechnung für den Koch. Beides ist keine Rechnung. Der Koch stellt weiter selbst die Rechnung an den Gast. Gilt jeweils für den Gast oder den Koch.',
        en: 'Creates a payment receipt for the guest and a payout statement for the cook on paid offers. Neither is an invoice. The cook still invoices the guest. Applies separately to the guest and the cook.',
    },
    BOOKING_REQUEST_OFFER_ADDONS: {
        de: 'Erlaubt Köchen Zusatzleistungen (Weinbegleitung, Besteck, …) anzubieten und Gästen diese vor der Annahme optional zu wählen. Admin-Vorlagen und Koch-Bibliothek bleiben für Ops sichtbar.',
        en: 'Lets cooks offer extras (wine pairing, cutlery, …) and guests optionally select them before accept. Admin templates and cook library stay visible for ops.',
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
    LANDING_BOOKING_HOW_IT_WORKS: {
        de: 'Zeigt den Buchungsablauf mit Stumm-Loops und dem 60-Sekunden-Film auf der Startseite.',
        en: 'Shows the booking-flow section with muted loops and the 60-second film on the landing page.',
    },
    LANDING_TESTIMONIAL_CARDS: {
        de: 'Zeigt auf der Startseite die gemeinsamen Bewertungskarten statt der laufenden Zitat-Spalten. Die Texte bleiben die festen Marketing-Zitate.',
        en: 'Shows the shared review cards on the home page instead of the scrolling quote columns. The quotes stay the fixed marketing copy.',
    },
    VENUE_PAGE_VENUES_EXPLORE: {
        de: 'Zeigt den CTA „Weitere Locations“ auf öffentlichen Locationseiten (/venues/…).',
        en: 'Shows the “More venues” CTA on public venue pages (/venues/…).',
    },
    SIGN_IN_GOOGLE: {
        de: 'Zeigt „Mit Google anmelden“ an den Anmeldemasken. Vor dem Einschalten in Produktion den Google-Consent-Screen prüfen (Testnutzer oder verifizierte People-Scopes).',
        en: 'Shows Continue with Google on sign-in gates. Before enabling in production, confirm the Google consent screen (test users or verified People scopes).',
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
