import { describe, expect, it } from 'vitest';

import { slackPaymentFailedDetail } from './slackNotifyBooking';

describe('slackPaymentFailedDetail', () => {
    it('maps Stripe event types to ops German', () => {
        expect(slackPaymentFailedDetail('setup_intent.setup_failed')).toBe(
            'Karten-Einrichtung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
        );
        expect(slackPaymentFailedDetail('payment_intent.payment_failed')).toBe(
            'Zahlung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
        );
    });

    it('appends a 3-D Secure note when Stripe reports authentication failure', () => {
        expect(slackPaymentFailedDetail('setup_intent.setup_failed payment_intent_authentication_failure')).toBe(
            'Karten-Einrichtung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen. 3-D Secure fehlgeschlagen',
        );
    });

    it('passes through unknown detail', () => {
        expect(slackPaymentFailedDetail('pull payment intent pi_x not succeeded')).toBe('pull payment intent pi_x not succeeded');
        expect(slackPaymentFailedDetail(undefined)).toBeUndefined();
    });
});
