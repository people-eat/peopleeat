import Stripe from 'stripe';

import { stripeAccountOnboardingComplete } from './stripeAccountOnboardingComplete';
import { stripeBalanceTransactionKindFromStripe, stripeBalanceTransactionStatusFromStripe } from './stripeBalanceTransactionKind';
import type {
    StripeAccountBalance,
    StripeAccountBalanceTransactionsFindMany,
    StripeAccountCreate,
    StripeAccountCreateResult,
    StripeAccountRequirements,
    StripeBalanceTransaction,
    StripeCustomerInput,
    StripePayment,
    StripePaymentIntentCreate,
    StripePaymentIntentCreateFromPaymentMethodWithSplit,
    StripePaymentIntentCreateResult,
    StripePaymentIntentCreateWithSplit,
    StripePayoutCreate,
    StripePayoutCreateResult,
    StripeSetupIntentCreate,
    StripeSetupIntentCreateResult,
    StripeTransferCreate,
    StripeTransferCreateResult,
    StripeTransferReverse,
    StripeWebhookEvent,
    StripeWebhookEventConstruct,
} from './StripePayment';
import { stripeDisabledReasonFromStripe, stripeRequirementCategoriesFromKeys } from './stripeRequirementCategories';
import { stripeSearchQuote } from './stripeSearchQuote';

function euroCentsFromBalanceBuckets(buckets: readonly { amount: number; currency: string }[]): number {
    return buckets.filter((bucket) => bucket.currency === 'eur').reduce((sum, bucket) => sum + bucket.amount, 0);
}

export interface StripePaymentCreateOptions {
    // Required at boot via environmentVariablesCreate.
    secretKey: string;
    webhookSecret: string;
    // Prefill on Express account `business_profile.url` (platform site).
    businessProfileUrl: string;
    // ISO 4217 lower-case. peopleeat charges in EUR.
    currency?: string;
}

function customerDisplayName(firstName: string | undefined, lastName: string | undefined): string | undefined {
    if (!firstName || !lastName) return undefined;
    return `${firstName} ${lastName}`;
}

function clientSecretRequire(clientSecret: string | null, origin: string): string {
    if (!clientSecret) {
        throw new Error(`stripePaymentCreate.${origin}: Stripe did not return a client_secret`);
    }
    return clientSecret;
}

export function stripePaymentCreate({
    secretKey,
    webhookSecret,
    businessProfileUrl,
    currency = 'eur',
}: StripePaymentCreateOptions): StripePayment {
    let client: Stripe | undefined;

    function clientRequire(): Stripe {
        // Pin to the SDK's bundled API version so upgrades are intentional.
        client ??= new Stripe(secretKey, { apiVersion: Stripe.API_VERSION });
        return client;
    }

    async function customerEnsure(input: StripeCustomerInput): Promise<string> {
        const stripe = clientRequire();
        const { userId, emailAddress, firstName, lastName } = input;

        const byUserId = await stripe.customers.search({
            query: `metadata['userId']:'${stripeSearchQuote(userId)}'`,
            limit: 1,
        });
        const existing = byUserId.data[0];
        if (existing) return existing.id;

        if (emailAddress) {
            const byEmail = await stripe.customers.search({
                query: `email:'${stripeSearchQuote(emailAddress)}'`,
                limit: 1,
            });
            const existingByEmail = byEmail.data[0];
            if (existingByEmail) return existingByEmail.id;
        }

        const created = await stripe.customers.create({
            name: customerDisplayName(firstName, lastName),
            ...(emailAddress ? { email: emailAddress } : {}),
            metadata: { userId },
        });
        return created.id;
    }

    async function paymentIntentCreateWithSplitInternal({
        customerId,
        destinationAccountId,
        pullAmount,
        payoutAmount,
        paymentMethodId,
        confirm,
        offSession,
        setupFutureUsage,
    }: {
        customerId: string;
        destinationAccountId: string;
        pullAmount: number;
        payoutAmount: number;
        paymentMethodId?: string;
        confirm?: boolean;
        offSession?: boolean;
        setupFutureUsage?: 'off_session';
    }): Promise<StripePaymentIntentCreateResult> {
        const stripe = clientRequire();
        // Destination charge moves min(pull, payout) to the cook with the
        // PaymentIntent. When payout > pull (tip / platform top-up), the
        // remainder must be `transferCreate`d *after* the PI succeeds — never
        // before, or we debit platform balance against an unconfirmed charge.
        const transferAmount = payoutAmount <= pullAmount ? payoutAmount : pullAmount;
        const pendingExtraTransferAmount = payoutAmount > pullAmount ? payoutAmount - pullAmount : undefined;
        const transferGroup = pendingExtraTransferAmount !== undefined ? `${destinationAccountId}:${customerId}` : undefined;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: pullAmount,
            currency,
            customer: customerId,
            ...(setupFutureUsage ? { setup_future_usage: setupFutureUsage } : {}),
            ...(offSession ? { off_session: true } : {}),
            ...(confirm ? { confirm: true } : {}),
            ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
            transfer_data: {
                amount: transferAmount,
                destination: destinationAccountId,
            },
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            ...(transferGroup ? { transfer_group: transferGroup } : {}),
        });

        return {
            paymentIntentId: paymentIntent.id,
            clientSecret: clientSecretRequire(paymentIntent.client_secret, 'paymentIntentCreateWithSplit'),
            pendingExtraTransferAmount,
            transferGroup,
        };
    }

    return {
        async customerIdFindOne(userId) {
            const stripe = clientRequire();
            const { data } = await stripe.customers.search({
                query: `metadata['userId']:'${stripeSearchQuote(userId)}'`,
                limit: 1,
            });
            return data[0]?.id;
        },

        async customerUpdate(input) {
            const stripe = clientRequire();
            const customerId = await customerEnsure(input);
            const { emailAddress, firstName, lastName, address } = input;

            await stripe.customers.update(customerId, {
                name: customerDisplayName(firstName, lastName),
                ...(emailAddress ? { email: emailAddress } : {}),
                address: address
                    ? {
                          city: address.city,
                          country: address.country,
                          line1: address.line1,
                          line2: address.line2,
                          postal_code: address.postCode,
                      }
                    : undefined,
            });
        },

        async setupIntentCreate({ user }: StripeSetupIntentCreate): Promise<StripeSetupIntentCreateResult> {
            const stripe = clientRequire();
            const customerId = await customerEnsure(user);
            const setupIntent = await stripe.setupIntents.create({
                usage: 'off_session',
                automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
                customer: customerId,
            });
            return {
                setupIntentId: setupIntent.id,
                clientSecret: clientSecretRequire(setupIntent.client_secret, 'setupIntentCreate'),
            };
        },

        async setupIntentSucceededCheck(setupIntentId) {
            const stripe = clientRequire();
            const { status } = await stripe.setupIntents.retrieve(setupIntentId);
            return status === 'succeeded';
        },

        async setupIntentPaymentMethodIdFindOne(setupIntentId) {
            const stripe = clientRequire();
            const { payment_method: paymentMethod } = await stripe.setupIntents.retrieve(setupIntentId);
            return typeof paymentMethod === 'string' ? paymentMethod : undefined;
        },

        async paymentIntentCreate({ user, amount }: StripePaymentIntentCreate): Promise<StripePaymentIntentCreateResult> {
            const stripe = clientRequire();
            const customerId = await customerEnsure(user);
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                customer: customerId,
                setup_future_usage: 'off_session',
                automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            });
            return {
                paymentIntentId: paymentIntent.id,
                clientSecret: clientSecretRequire(paymentIntent.client_secret, 'paymentIntentCreate'),
            };
        },

        async paymentIntentAmountUpdate(paymentIntentId, amount) {
            const stripe = clientRequire();
            const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, { amount });
            return {
                paymentIntentId: paymentIntent.id,
                clientSecret: clientSecretRequire(paymentIntent.client_secret, 'paymentIntentAmountUpdate'),
            };
        },

        async paymentIntentCreateWithSplit(options: StripePaymentIntentCreateWithSplit) {
            const customerId = await customerEnsure(options.user);
            return paymentIntentCreateWithSplitInternal({
                customerId,
                destinationAccountId: options.destinationAccountId,
                pullAmount: options.pullAmount,
                payoutAmount: options.payoutAmount,
                setupFutureUsage: 'off_session',
            });
        },

        async paymentIntentCreateFromPaymentMethodWithSplit(options: StripePaymentIntentCreateFromPaymentMethodWithSplit) {
            const customerId = await customerEnsure(options.user);
            return paymentIntentCreateWithSplitInternal({
                customerId,
                destinationAccountId: options.destinationAccountId,
                pullAmount: options.pullAmount,
                payoutAmount: options.payoutAmount,
                paymentMethodId: options.paymentMethodId,
                confirm: true,
                offSession: true,
            });
        },

        async paymentIntentSucceededCheck(paymentIntentId) {
            const stripe = clientRequire();
            const { status } = await stripe.paymentIntents.retrieve(paymentIntentId);
            // `processing` counts as success for async methods (SEPA, …) so
            // booking confirmation can proceed while settlement finishes.
            return status === 'succeeded' || status === 'processing';
        },

        async paymentIntentCancel(paymentIntentId) {
            const stripe = clientRequire();
            await stripe.paymentIntents.cancel(paymentIntentId);
        },

        async paymentIntentRefund(paymentIntentId, amount) {
            const stripe = clientRequire();
            await stripe.refunds.create({
                payment_intent: paymentIntentId,
                ...(amount != null ? { amount } : {}),
            });
        },

        async paymentIntentDestinationTransferIdFindOne(paymentIntentId) {
            const stripe = clientRequire();
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge.transfer'],
            });
            const latestCharge = paymentIntent.latest_charge;
            if (!latestCharge || typeof latestCharge === 'string') return undefined;
            const transfer = latestCharge.transfer;
            if (!transfer) return undefined;
            return typeof transfer === 'string' ? transfer : transfer.id;
        },

        async accountCreate({
            cookId,
            emailAddress,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            address,
            existingAccountId,
        }: StripeAccountCreate): Promise<StripeAccountCreateResult> {
            const stripe = clientRequire();

            if (existingAccountId) {
                const existing = await stripe.accounts.retrieve(existingAccountId);
                return stripeAccountOnboardingComplete(existing)
                    ? { kind: 'onboardingComplete', accountId: existing.id }
                    : { kind: 'onboardingRequired', accountId: existing.id };
            }

            // Do not list-all-accounts to find by email — that does not scale.
            // Commands must persist `accountId` on the cook row after create
            // and pass `existingAccountId` on subsequent calls.
            const account = await stripe.accounts.create(
                {
                    type: 'express',
                    email: emailAddress,
                    business_type: 'individual',
                    individual: {
                        first_name: firstName,
                        last_name: lastName,
                        phone: phoneNumber,
                        ...(dateOfBirth
                            ? {
                                  dob: {
                                      day: dateOfBirth.day,
                                      month: dateOfBirth.month,
                                      year: dateOfBirth.year,
                                  },
                              }
                            : {}),
                        ...(address
                            ? {
                                  address: {
                                      country: address.country,
                                      postal_code: address.postCode,
                                      city: address.city,
                                      line1: address.line1,
                                      line2: address.line2,
                                  },
                              }
                            : {}),
                    },
                    business_profile: {
                        url: businessProfileUrl,
                    },
                    settings: {
                        payouts: {
                            schedule: {
                                interval: 'manual',
                            },
                        },
                    },
                    metadata: { cookId },
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                },
                // Best-effort de-dupe for retries within Stripe's idempotency
                // window. Long-term uniqueness is the persisted cook.accountId.
                { idempotencyKey: `cook-express-account:${cookId}` },
            );

            return { kind: 'onboardingRequired', accountId: account.id };
        },

        async accountOnboardingUrlCreate(accountId, refreshUrl, returnUrl) {
            const stripe = clientRequire();
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl.href,
                return_url: returnUrl.href,
                type: 'account_onboarding',
            });
            return new URL(accountLink.url);
        },

        async accountDashboardUrlCreate(accountId) {
            const stripe = clientRequire();
            const loginLink = await stripe.accounts.createLoginLink(accountId);
            return new URL(loginLink.url);
        },

        async accountOnboardingCompletedCheck(accountId) {
            const stripe = clientRequire();
            const account = await stripe.accounts.retrieve(accountId);
            return stripeAccountOnboardingComplete(account);
        },

        async accountPayoutsEnabledCheck(accountId) {
            const stripe = clientRequire();
            const account = await stripe.accounts.retrieve(accountId);
            return account.payouts_enabled === true;
        },

        async accountRequirementsFindOne(accountId): Promise<StripeAccountRequirements> {
            const stripe = clientRequire();
            const account = await stripe.accounts.retrieve(accountId);
            const requirements = account.requirements;
            return {
                detailsSubmitted: account.details_submitted === true,
                chargesEnabled: account.charges_enabled === true,
                payoutsEnabled: account.payouts_enabled === true,
                disabledReason: stripeDisabledReasonFromStripe(requirements?.disabled_reason),
                currentlyDue: stripeRequirementCategoriesFromKeys(requirements?.currently_due),
                pastDue: stripeRequirementCategoriesFromKeys(requirements?.past_due),
                pendingVerification: stripeRequirementCategoriesFromKeys(requirements?.pending_verification),
            };
        },

        async accountBalanceFindOne(accountId): Promise<StripeAccountBalance> {
            const stripe = clientRequire();
            const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
            return {
                availableCents: euroCentsFromBalanceBuckets(balance.available),
                pendingCents: euroCentsFromBalanceBuckets(balance.pending),
            };
        },

        async accountBalanceTransactionsFindMany({
            accountId,
            limit = 20,
        }: StripeAccountBalanceTransactionsFindMany): Promise<StripeBalanceTransaction[]> {
            const stripe = clientRequire();
            const page = await stripe.balanceTransactions.list({ limit }, { stripeAccount: accountId });
            return page.data.map((txn) => ({
                id: txn.id,
                kind: stripeBalanceTransactionKindFromStripe(txn.type),
                status: stripeBalanceTransactionStatusFromStripe(txn.status),
                netCents: txn.net,
                createdAt: new Date(txn.created * 1000),
                availableOn: new Date(txn.available_on * 1000),
                description: txn.description ?? null,
            }));
        },

        async transferCreate({
            destinationAccountId,
            payoutAmount,
            transferGroup,
        }: StripeTransferCreate): Promise<StripeTransferCreateResult> {
            const stripe = clientRequire();
            const transfer = await stripe.transfers.create({
                amount: payoutAmount,
                currency,
                destination: destinationAccountId,
                ...(transferGroup ? { transfer_group: transferGroup } : {}),
            });
            return { transferId: transfer.id };
        },

        async transferReverse({ transferId }: StripeTransferReverse) {
            const stripe = clientRequire();
            await stripe.transfers.createReversal(transferId);
        },

        async payoutCreate({ destinationAccountId, amount }: StripePayoutCreate): Promise<StripePayoutCreateResult> {
            const stripe = clientRequire();
            const payout = await stripe.payouts.create({ amount, currency }, { stripeAccount: destinationAccountId });
            return { payoutId: payout.id };
        },

        webhookEventConstruct({ payload, signatureHeader }: StripeWebhookEventConstruct): StripeWebhookEvent {
            const stripe = clientRequire();
            const event = stripe.webhooks.constructEvent(payload, signatureHeader, webhookSecret);
            return {
                id: event.id,
                type: event.type,
                dataObject: event.data.object,
            };
        },
    };
}
