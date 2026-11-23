import { describe, expect, it } from 'vitest';

import { slackPaymentFailedBody } from './slackFormat';
import { slackPaymentFailedDetail } from './slackNotifyBooking';

describe('slackPaymentFailedBody', () => {
    it('maps Stripe event types to ops German', () => {
        expect(slackPaymentFailedBody('setup_intent.setup_failed')).toBe(
            'Karteneinrichtung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
        );
        expect(slackPaymentFailedBody('payment_intent.payment_failed')).toBe(
            'Kartenzahlung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
        );
    });

    it('appends a 3-D Secure note when Stripe reports authentication failure', () => {
        expect(slackPaymentFailedBody('setup_intent.setup_failed payment_intent_authentication_failure')).toBe(
            'Karteneinrichtung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen. 3-D Secure fehlgeschlagen.',
        );
    });

    it('replaces unknown technical detail with a generic ops line', () => {
        expect(slackPaymentFailedBody('pull payment intent pi_x not succeeded')).toBe(
            'Zahlung fehlgeschlagen. Details stehen in den Server-Logs.',
        );
        expect(slackPaymentFailedBody(undefined)).toBe('Zahlung fehlgeschlagen. Details stehen in den Server-Logs.');
    });

    it('keeps deprecated alias in sync', () => {
        expect(slackPaymentFailedDetail('payment_intent.canceled')).toBe(slackPaymentFailedBody('payment_intent.canceled'));
    });
});
