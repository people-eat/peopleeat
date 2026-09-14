import { describe, expect, it } from 'vitest';

import {
    stripeDisabledReasonFromStripe,
    stripeRequirementCategoriesFromKeys,
    stripeRequirementCategoryFromKey,
} from './stripeRequirementCategories';

describe('stripeRequirementCategoryFromKey', () => {
    it('maps identity verification keys before personal details', () => {
        expect(stripeRequirementCategoryFromKey('individual.verification.document')).toBe('IDENTITY_VERIFICATION');
        expect(stripeRequirementCategoryFromKey('person_abc.verification.additional_document')).toBe('IDENTITY_VERIFICATION');
    });

    it('maps bank, terms, business, personal, and other keys', () => {
        expect(stripeRequirementCategoryFromKey('external_account')).toBe('BANK_ACCOUNT');
        expect(stripeRequirementCategoryFromKey('tos_acceptance.date')).toBe('TERMS_OF_SERVICE');
        expect(stripeRequirementCategoryFromKey('business_profile.url')).toBe('BUSINESS_DETAILS');
        expect(stripeRequirementCategoryFromKey('company.tax_id')).toBe('BUSINESS_DETAILS');
        expect(stripeRequirementCategoryFromKey('individual.dob.day')).toBe('PERSONAL_DETAILS');
        expect(stripeRequirementCategoryFromKey('person_abc.address.city')).toBe('PERSONAL_DETAILS');
        expect(stripeRequirementCategoryFromKey('settings.card_payments.statement_descriptor_prefix')).toBe('OTHER');
    });
});

describe('stripeRequirementCategoriesFromKeys', () => {
    it('dedupes categories and preserves first-seen order', () => {
        expect(
            stripeRequirementCategoriesFromKeys([
                'individual.verification.document',
                'external_account',
                'individual.dob.day',
                'person_x.verification.document',
            ]),
        ).toEqual(['IDENTITY_VERIFICATION', 'BANK_ACCOUNT', 'PERSONAL_DETAILS']);
    });

    it('returns an empty list for missing keys', () => {
        expect(stripeRequirementCategoriesFromKeys(undefined)).toEqual([]);
        expect(stripeRequirementCategoriesFromKeys([])).toEqual([]);
    });
});

describe('stripeDisabledReasonFromStripe', () => {
    it('maps known Stripe disabled reasons', () => {
        expect(stripeDisabledReasonFromStripe(null)).toBeNull();
        expect(stripeDisabledReasonFromStripe('requirements.past_due')).toBe('PAST_DUE');
        expect(stripeDisabledReasonFromStripe('requirements.pending_verification')).toBe('PENDING_VERIFICATION');
        expect(stripeDisabledReasonFromStripe('listed')).toBe('LISTED');
        expect(stripeDisabledReasonFromStripe('rejected.fraud')).toBe('REJECTED');
        expect(stripeDisabledReasonFromStripe('platform_paused')).toBe('OTHER');
    });
});
