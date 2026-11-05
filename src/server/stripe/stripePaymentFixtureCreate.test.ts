import { describe, expect, it } from 'vitest';

import { stripePaymentCreate } from './stripePaymentCreate';
import { STRIPE_SECRET_KEY_CI_FIXTURE } from './stripePaymentFixtureCreate';

describe('stripePaymentFixtureCreate', () => {
    it('serves in-memory intents for the CI placeholder key', async () => {
        const stripe = stripePaymentCreate({
            secretKey: STRIPE_SECRET_KEY_CI_FIXTURE,
            webhookSecret: 'whsec_ci_placeholder',
            businessProfileUrl: 'https://example.com',
        });

        const setup = await stripe.setupIntentCreate({
            user: { userId: 'user', emailAddress: 'buyer@example.com', firstName: 'A', lastName: 'B' },
        });
        const payment = await stripe.paymentIntentCreateWithSplit({
            destinationAccountId: 'acct_cook',
            user: { userId: 'user', emailAddress: 'buyer@example.com' },
            pullAmount: 1000,
            payoutAmount: 800,
        });

        expect(setup.setupIntentId.startsWith('seti_fixture_')).toBe(true);
        expect(setup.clientSecret).toBe(`${setup.setupIntentId}_secret`);
        expect(payment.paymentIntentId.startsWith('pi_fixture_')).toBe(true);
        expect(await stripe.paymentIntentSucceededCheck(payment.paymentIntentId)).toBe(true);
    });
});
