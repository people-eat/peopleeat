import { describe, expect, it } from 'vitest';

import {
    stripeDashboardConnectAccountUrl,
    stripeDashboardIsTestMode,
    stripeDashboardPaymentIntentUrl,
    stripeDashboardSetupIntentUrl,
} from './stripeDashboardUrls';

describe('stripeDashboardUrls', () => {
    it('detects test mode from the secret key prefix', () => {
        expect(stripeDashboardIsTestMode('sk_test_abc')).toBe(true);
        expect(stripeDashboardIsTestMode('sk_live_abc')).toBe(false);
    });

    it('builds payment intent dashboard urls', () => {
        expect(stripeDashboardPaymentIntentUrl('pi_123', true)).toBe('https://dashboard.stripe.com/test/payments/pi_123');
        expect(stripeDashboardPaymentIntentUrl('pi_123', false)).toBe('https://dashboard.stripe.com/payments/pi_123');
    });

    it('builds setup intent dashboard urls', () => {
        expect(stripeDashboardSetupIntentUrl('seti_123', true)).toBe('https://dashboard.stripe.com/test/setup_intents/seti_123');
        expect(stripeDashboardSetupIntentUrl('seti_123', false)).toBe('https://dashboard.stripe.com/setup_intents/seti_123');
    });

    it('builds Connect account dashboard urls', () => {
        expect(stripeDashboardConnectAccountUrl('acct_123', true)).toBe('https://dashboard.stripe.com/test/connect/accounts/acct_123');
        expect(stripeDashboardConnectAccountUrl('acct_123', false)).toBe('https://dashboard.stripe.com/connect/accounts/acct_123');
    });
});
