import type { Locale } from './locale';
import type { StatusTone } from './statusTone';

export type CookStripeStatus = 'EMPTY' | 'PREPARED' | 'COMPLETED' | 'ACTIVE_WAS_RESET';

export type CookStripeRequirementCategory =
    'IDENTITY_VERIFICATION' | 'BANK_ACCOUNT' | 'TERMS_OF_SERVICE' | 'BUSINESS_DETAILS' | 'PERSONAL_DETAILS' | 'OTHER';

export type CookStripeDisabledReason = 'PAST_DUE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'LISTED' | 'OTHER';

export type CookStripeBalanceTransactionKind = 'PAYMENT' | 'PAYOUT' | 'TRANSFER' | 'FEE' | 'ADJUSTMENT' | 'OTHER';

export type CookStripeBalanceTransactionStatus = 'AVAILABLE' | 'PENDING';

export type CookStripeAccountDetails = {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    disabledReason?: CookStripeDisabledReason | null;
    currentlyDue: readonly CookStripeRequirementCategory[];
    pastDue: readonly CookStripeRequirementCategory[];
    pendingVerification: readonly CookStripeRequirementCategory[];
};

/** `cook` addresses the account owner; `admin` is neutral ops wording. */
export type CookStripeAudience = 'cook' | 'admin';

export function cookStripeStatusLabel(status: CookStripeStatus, locale: Locale): string {
    return {
        EMPTY: { de: 'Noch nicht eingerichtet', en: 'Not set up yet' },
        PREPARED: { de: 'Einrichtung unvollständig', en: 'Setup incomplete' },
        COMPLETED: { de: 'Bereit für Auszahlungen', en: 'Ready for payouts' },
        ACTIVE_WAS_RESET: { de: 'Aktualisierung erforderlich', en: 'Update required' },
    }[status][locale];
}

export function cookStripeStatusTone(status: CookStripeStatus): StatusTone {
    const tones = {
        EMPTY: 'info',
        PREPARED: 'warning',
        COMPLETED: 'success',
        ACTIVE_WAS_RESET: 'warning',
    } as const satisfies Record<CookStripeStatus, StatusTone>;
    return tones[status];
}

export function cookStripeStatusDescription(status: CookStripeStatus, locale: Locale, audience: CookStripeAudience): string {
    const descriptions = {
        cook: {
            EMPTY: {
                de: 'Richte dein Stripe-Konto ein, damit Auszahlungen an dich möglich sind.',
                en: 'Set up your Stripe account so payouts can reach you.',
            },
            PREPARED: {
                de: 'Die Wallet-Einrichtung ist noch nicht abgeschlossen. Bitte fahre fort, um Auszahlungen zu aktivieren.',
                en: 'Wallet setup is not finished yet. Continue to enable payouts.',
            },
            COMPLETED: {
                de: 'Dein Wallet ist verbunden. Auszahlungen auf dein Bankkonto löst unser Team nach dem Event aus.',
                en: 'Your wallet is connected. Bank payouts are released by our team after the event.',
            },
            ACTIVE_WAS_RESET: {
                de: 'Stripe benötigt aktualisierte Angaben. Bitte aktualisiere dein Wallet, bevor Auszahlungen weiterlaufen.',
                en: 'Stripe needs updated details. Please refresh your wallet before payouts can continue.',
            },
        },
        admin: {
            EMPTY: {
                de: 'Kein Stripe-Konto eingerichtet. Auszahlungen sind nicht möglich.',
                en: 'No Stripe account set up. Payouts are not possible.',
            },
            PREPARED: {
                de: 'Die Wallet-Einrichtung ist noch nicht abgeschlossen.',
                en: 'Wallet setup is not finished yet.',
            },
            COMPLETED: {
                de: 'Wallet ist verbunden. Bankauszahlungen löst das Team nach dem Event aus.',
                en: 'Wallet is connected. Bank payouts are released by the team after the event.',
            },
            ACTIVE_WAS_RESET: {
                de: 'Stripe benötigt aktualisierte Angaben, bevor Auszahlungen weiterlaufen.',
                en: 'Stripe needs updated details before payouts can continue.',
            },
        },
    } as const;
    return descriptions[audience][status][locale];
}

export function cookStripeRequirementCategoryLabel(category: CookStripeRequirementCategory, locale: Locale): string {
    return {
        IDENTITY_VERIFICATION: { de: 'Identitätsprüfung', en: 'Identity verification' },
        BANK_ACCOUNT: { de: 'Bankkonto', en: 'Bank account' },
        TERMS_OF_SERVICE: { de: 'Nutzungsbedingungen', en: 'Terms of service' },
        BUSINESS_DETAILS: { de: 'Geschäftsangaben', en: 'Business details' },
        PERSONAL_DETAILS: { de: 'Persönliche Angaben', en: 'Personal details' },
        OTHER: { de: 'Weitere Angaben', en: 'Additional details' },
    }[category][locale];
}

export function cookStripeDisabledReasonLabel(reason: CookStripeDisabledReason, locale: Locale, audience: CookStripeAudience): string {
    const labels = {
        cook: {
            PAST_DUE: {
                de: 'Pflichtangaben sind überfällig. Bitte vervollständige sie in Stripe.',
                en: 'Required details are overdue. Please complete them in Stripe.',
            },
            PENDING_VERIFICATION: {
                de: 'Stripe prüft gerade deine Unterlagen.',
                en: 'Stripe is reviewing your documents.',
            },
            REJECTED: {
                de: 'Stripe hat die Freigabe abgelehnt. Bitte aktualisiere deine Angaben oder kontaktiere den Support.',
                en: 'Stripe rejected the account. Please update your details or contact support.',
            },
            LISTED: {
                de: 'Dein Stripe-Konto ist vorübergehend eingeschränkt.',
                en: 'Your Stripe account is temporarily restricted.',
            },
            OTHER: {
                de: 'Stripe hat das Konto vorübergehend eingeschränkt.',
                en: 'Stripe has temporarily restricted the account.',
            },
        },
        admin: {
            PAST_DUE: {
                de: 'Pflichtangaben sind überfällig.',
                en: 'Required details are overdue.',
            },
            PENDING_VERIFICATION: {
                de: 'Stripe prüft gerade die Unterlagen.',
                en: 'Stripe is reviewing the documents.',
            },
            REJECTED: {
                de: 'Stripe hat die Freigabe abgelehnt.',
                en: 'Stripe rejected the account.',
            },
            LISTED: {
                de: 'Das Stripe-Konto ist vorübergehend eingeschränkt.',
                en: 'The Stripe account is temporarily restricted.',
            },
            OTHER: {
                de: 'Stripe hat das Konto vorübergehend eingeschränkt.',
                en: 'Stripe has temporarily restricted the account.',
            },
        },
    } as const;
    return labels[audience][reason][locale];
}

/** Outstanding Stripe requirement categories, most urgent list first, without repeats. */
export function cookStripeAccountDetailsCategories(details: CookStripeAccountDetails): CookStripeRequirementCategory[] {
    return [...new Set([...details.pastDue, ...details.currentlyDue, ...details.pendingVerification])];
}

export function cookStripeAccountDetailsTone(details: CookStripeAccountDetails): StatusTone {
    if (
        details.pastDue.length > 0 ||
        details.disabledReason === 'PAST_DUE' ||
        details.disabledReason === 'REJECTED' ||
        details.disabledReason === 'LISTED'
    ) {
        return 'error';
    }
    if (details.pendingVerification.length > 0 && details.currentlyDue.length === 0 && details.disabledReason !== 'OTHER') {
        return 'info';
    }
    return 'warning';
}

export function cookStripeAccountDetailsTitle(details: CookStripeAccountDetails, locale: Locale): string {
    if (details.pastDue.length > 0 || details.disabledReason === 'PAST_DUE') {
        return { de: 'Angaben überfällig', en: 'Details overdue' }[locale];
    }
    if (details.disabledReason === 'REJECTED') {
        return { de: 'Freigabe abgelehnt', en: 'Account rejected' }[locale];
    }
    if (details.disabledReason === 'LISTED') {
        return { de: 'Konto eingeschränkt', en: 'Account restricted' }[locale];
    }
    if (details.pendingVerification.length > 0 && details.currentlyDue.length === 0) {
        return { de: 'Prüfung läuft', en: 'Review in progress' }[locale];
    }
    return { de: 'Noch offen bei Stripe', en: 'Still needed in Stripe' }[locale];
}

export function cookStripeAccountDetailsHasActionableContent(details: CookStripeAccountDetails, status: CookStripeStatus): boolean {
    if (details.pastDue.length > 0 || details.currentlyDue.length > 0 || details.pendingVerification.length > 0) {
        return true;
    }
    if (details.disabledReason != null) {
        return true;
    }
    return status !== 'COMPLETED' && details.detailsSubmitted && (!details.chargesEnabled || !details.payoutsEnabled);
}

export function cookStripeBalanceTransactionKindLabel(kind: CookStripeBalanceTransactionKind, locale: Locale): string {
    return {
        PAYMENT: { de: 'Zahlung', en: 'Payment' },
        PAYOUT: { de: 'Auszahlung', en: 'Payout' },
        TRANSFER: { de: 'Transfer', en: 'Transfer' },
        FEE: { de: 'Gebühr', en: 'Fee' },
        ADJUSTMENT: { de: 'Anpassung', en: 'Adjustment' },
        OTHER: { de: 'Sonstiges', en: 'Other' },
    }[kind][locale];
}

export function cookStripeBalanceTransactionStatusLabel(status: CookStripeBalanceTransactionStatus, locale: Locale): string {
    return {
        AVAILABLE: { de: 'Verfügbar', en: 'Available' },
        PENDING: { de: 'Ausstehend', en: 'Pending' },
    }[status][locale];
}
