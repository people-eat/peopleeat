/**
 * Stripe Dashboard deep-link builders for admin ops.
 * Test vs live mode follows the Stripe secret key prefix (`sk_test_…`).
 */

export function stripeDashboardIsTestMode(stripeSecretKey: string): boolean {
    return stripeSecretKey.startsWith('sk_test');
}

export function stripeDashboardPaymentIntentUrl(paymentIntentId: string, testMode: boolean): string {
    const base = testMode ? 'https://dashboard.stripe.com/test/payments' : 'https://dashboard.stripe.com/payments';
    return `${base}/${paymentIntentId}`;
}

export function stripeDashboardSetupIntentUrl(setupIntentId: string, testMode: boolean): string {
    const base = testMode ? 'https://dashboard.stripe.com/test/setup_intents' : 'https://dashboard.stripe.com/setup_intents';
    return `${base}/${setupIntentId}`;
}
