import type { StripeDisabledReason, StripeRequirementCategory } from './StripePayment';

export function stripeRequirementCategoryFromKey(key: string): StripeRequirementCategory {
    if (key.endsWith('.verification.document') || key.endsWith('.verification.additional_document')) {
        return 'IDENTITY_VERIFICATION';
    }
    if (key === 'external_account' || key.startsWith('external_account.')) {
        return 'BANK_ACCOUNT';
    }
    if (key === 'tos_acceptance' || key.startsWith('tos_acceptance.')) {
        return 'TERMS_OF_SERVICE';
    }
    if (key.startsWith('business_profile.') || key.startsWith('company.')) {
        return 'BUSINESS_DETAILS';
    }
    if (key.startsWith('individual.') || key.startsWith('person_')) {
        return 'PERSONAL_DETAILS';
    }
    return 'OTHER';
}

export function stripeRequirementCategoriesFromKeys(keys: readonly string[] | null | undefined): StripeRequirementCategory[] {
    if (!keys?.length) {
        return [];
    }
    const seen = new Set<StripeRequirementCategory>();
    const categories: StripeRequirementCategory[] = [];
    for (const key of keys) {
        const category = stripeRequirementCategoryFromKey(key);
        if (seen.has(category)) {
            continue;
        }
        seen.add(category);
        categories.push(category);
    }
    return categories;
}

export function stripeDisabledReasonFromStripe(value: string | null | undefined): StripeDisabledReason | null {
    if (!value) {
        return null;
    }
    if (value === 'requirements.past_due') {
        return 'PAST_DUE';
    }
    if (value === 'requirements.pending_verification') {
        return 'PENDING_VERIFICATION';
    }
    if (value === 'listed') {
        return 'LISTED';
    }
    if (value.startsWith('rejected.')) {
        return 'REJECTED';
    }
    return 'OTHER';
}
