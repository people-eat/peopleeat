import { idCreate } from '../../shared/idCreate';
import type {
    StripeAccountRequirements,
    StripePayment,
    StripePaymentIntentCreateResult,
    StripeSetupIntentCreateResult,
} from './StripePayment';

/**
 * CI stand-in for `STRIPE_SECRET_KEY`. `stripePaymentCreate` serves this
 * in-memory adapter only for this exact value. Real `sk_test_` / `sk_live_`
 * keys always use the Stripe SDK. Do not deploy this key.
 */
export const STRIPE_SECRET_KEY_CI_FIXTURE = 'sk_test_ci_placeholder';

const readyAccount: StripeAccountRequirements = {
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    disabledReason: null,
    currentlyDue: [],
    pastDue: [],
    pendingVerification: [],
};

function paymentIntentResult(): StripePaymentIntentCreateResult {
    const paymentIntentId = `pi_fixture_${idCreate()}`;
    return { paymentIntentId, clientSecret: `${paymentIntentId}_secret` };
}

function setupIntentResult(): StripeSetupIntentCreateResult {
    const setupIntentId = `seti_fixture_${idCreate()}`;
    return { setupIntentId, clientSecret: `${setupIntentId}_secret` };
}

/**
 * In-memory Stripe for the CI placeholder key. Intent creates succeed so
 * dual-accept e2e can prepare checkout without a live test secret. Success
 * checks return true. This must never run against a real key.
 */
export function stripePaymentFixtureCreate(): StripePayment {
    return {
        customerIdFindOne: async () => 'cus_fixture',
        customerUpdate: async () => undefined,
        setupIntentCreate: async () => setupIntentResult(),
        setupIntentSucceededCheck: async () => true,
        setupIntentPaymentMethodIdFindOne: async () => `pm_fixture_${idCreate()}`,
        setupIntentCancel: async () => undefined,
        paymentIntentCreate: async () => paymentIntentResult(),
        paymentIntentAmountUpdate: async (paymentIntentId) => ({
            paymentIntentId,
            clientSecret: `${paymentIntentId}_secret`,
        }),
        paymentIntentCreateWithSplit: async () => paymentIntentResult(),
        paymentIntentCreateFromPaymentMethodWithSplit: async () => paymentIntentResult(),
        paymentIntentSucceededCheck: async () => true,
        paymentIntentCancel: async () => undefined,
        paymentIntentRefund: async () => ({ refundId: `re_fixture_${idCreate()}` }),
        paymentIntentRefundableCentsFindOne: async () => 0,
        paymentIntentPaymentMethodIdFindOne: async () => `pm_fixture_${idCreate()}`,
        paymentIntentDestinationTransferIdFindOne: async () => undefined,
        paymentIntentBillingAddressFindOne: async () => undefined,
        accountCreate: async (options) => ({
            kind: 'onboardingComplete',
            accountId: options.existingAccountId ?? `acct_fixture_${idCreate()}`,
        }),
        accountOnboardingUrlCreate: async () => new URL('https://stripe.fixture.invalid/onboarding'),
        accountDashboardUrlCreate: async () => new URL('https://stripe.fixture.invalid/dashboard'),
        accountOnboardingCompletedCheck: async () => true,
        accountPayoutsEnabledCheck: async () => true,
        accountRequirementsFindOne: async () => readyAccount,
        accountBalanceFindOne: async () => ({ availableCents: 0, pendingCents: 0 }),
        accountBalanceTransactionsFindMany: async () => [],
        transferCreate: async () => ({ transferId: `tr_fixture_${idCreate()}` }),
        transferReversibleCentsFindOne: async () => 0,
        transferReverse: async () => undefined,
        payoutCreate: async () => ({ payoutId: `po_fixture_${idCreate()}` }),
        accountPayoutsFindMany: async () => [],
        webhookEventConstruct: () => {
            throw new Error('stripePaymentFixtureCreate: webhook signatures are not verified');
        },
    };
}
