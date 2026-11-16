import { i18nAudienceNamespace } from '../i18n/audienceNamespace';
import { t } from '../i18n/t';
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
    return t(locale, 'common', `stripe.status.${status}`);
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
    return t(locale, i18nAudienceNamespace(audience), `stripe.statusDescription.${status}`);
}

export function cookStripeRequirementCategoryLabel(category: CookStripeRequirementCategory, locale: Locale): string {
    return t(locale, 'common', `stripe.requirement.${category}`);
}

export function cookStripeDisabledReasonLabel(reason: CookStripeDisabledReason, locale: Locale, audience: CookStripeAudience): string {
    return t(locale, i18nAudienceNamespace(audience), `stripe.disabledReason.${reason}`);
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
        return t(locale, 'common', 'stripe.accountTitle.pastDue');
    }
    if (details.disabledReason === 'REJECTED') {
        return t(locale, 'common', 'stripe.accountTitle.rejected');
    }
    if (details.disabledReason === 'LISTED') {
        return t(locale, 'common', 'stripe.accountTitle.listed');
    }
    if (details.pendingVerification.length > 0 && details.currentlyDue.length === 0) {
        return t(locale, 'common', 'stripe.accountTitle.pending');
    }
    return t(locale, 'common', 'stripe.accountTitle.needed');
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
    return t(locale, 'common', `stripe.transactionKind.${kind}`);
}

export function cookStripeBalanceTransactionStatusLabel(status: CookStripeBalanceTransactionStatus, locale: Locale): string {
    return t(locale, 'common', `stripe.transactionStatus.${status}`);
}
