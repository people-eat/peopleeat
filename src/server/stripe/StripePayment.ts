// Domain-facing Stripe Connect payment capability. Wired on
// `ServerRuntime.stripe` — see `docs/architecture/stripe-payment.md`.
// Amounts are integers in the smallest currency unit (cents for EUR).

export interface StripeCustomerInput {
    userId: string;
    emailAddress?: string;
    firstName?: string;
    lastName?: string;
    address?: {
        // ISO 3166-1 alpha-2 (e.g. `DE`). Caller maps localized names.
        country: string;
        city: string;
        postCode: string;
        line1: string;
        line2?: string;
    };
}

export interface StripeSetupIntentCreate {
    user: StripeCustomerInput;
}

export interface StripeSetupIntentCreateResult {
    setupIntentId: string;
    clientSecret: string;
}

export interface StripePaymentIntentCreate {
    user: StripeCustomerInput;
    amount: number;
}

export interface StripePaymentIntentCreateWithSplit {
    destinationAccountId: string;
    user: StripeCustomerInput;
    // Amount charged to the customer (platform pull).
    pullAmount: number;
    // Amount destined for the cook (may exceed pull when top-up transfer is used).
    payoutAmount: number;
    idempotencyKey?: string;
}

export interface StripePaymentIntentCreateFromPaymentMethodWithSplit {
    destinationAccountId: string;
    user: StripeCustomerInput;
    paymentMethodId: string;
    pullAmount: number;
    payoutAmount: number;
    idempotencyKey?: string;
    /** When false, create without confirm (on-session Elements). Default true for off-session. */
    confirm?: boolean;
    offSession?: boolean;
}

export interface StripePaymentIntentCreateResult {
    paymentIntentId: string;
    clientSecret: string;
    // When payoutAmount > pullAmount, call `transferCreate` for this amount
    // only after the PaymentIntent has succeeded (see architecture doc).
    pendingExtraTransferAmount?: number;
    // Pass through to the follow-up `transferCreate` so Dashboard groups match.
    transferGroup?: string;
}

export interface StripeTransferCreate {
    destinationAccountId: string;
    payoutAmount: number;
    transferGroup?: string;
    idempotencyKey?: string;
}

export interface StripeTransferCreateResult {
    transferId: string;
}

export interface StripeTransferReverse {
    transferId: string;
    /** Partial reverse in cents; omit to reverse the full transfer. */
    amountCents?: number;
    idempotencyKey?: string;
}

export interface StripePayoutCreate {
    destinationAccountId: string;
    // Amount to send from the Connect balance to the cook's bank (cents).
    amount: number;
}

export interface StripePayoutCreateResult {
    payoutId: string;
}

export type StripePayoutStatus = 'PAID' | 'PENDING' | 'IN_TRANSIT' | 'CANCELED' | 'FAILED' | 'OTHER';

export interface StripePayout {
    id: string;
    amountCents: number;
    status: StripePayoutStatus;
    createdAt: Date;
    arrivalDate: Date;
}

export interface StripeAccountPayoutsFindMany {
    accountId: string;
    // Stripe max 100; admin manual-payout reconcile uses a recent window.
    limit?: number;
}

export interface StripeAccountCreate {
    cookId: string;
    emailAddress: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
    // Prefill for Express KYC — omit when unknown. Must be set before the first Account Link.
    dateOfBirth?: {
        day: number;
        month: number;
        year: number;
    };
    address?: {
        country: string;
        city: string;
        postCode: string;
        line1: string;
        line2?: string;
    };
    // When the cook row already stores a Stripe account id, pass it so we
    // retrieve instead of creating a duplicate. Persistence of that id is
    // the command layer's job — this capability does not query our DB.
    // Unlike Customers (search by metadata.userId), Connect has no search API;
    // reuse without existingAccountId is recovery-only (idempotency mismatch).
    existingAccountId?: string;
}

export type StripeAccountCreateResult =
    { kind: 'onboardingRequired'; accountId: string } | { kind: 'onboardingComplete'; accountId: string };

export type StripeRequirementCategory =
    'IDENTITY_VERIFICATION' | 'BANK_ACCOUNT' | 'TERMS_OF_SERVICE' | 'BUSINESS_DETAILS' | 'PERSONAL_DETAILS' | 'OTHER';

export type StripeDisabledReason = 'PAST_DUE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'LISTED' | 'OTHER';

// Live Connect snapshot for wallet UI — categories only, never raw Stripe keys.
export interface StripeAccountRequirements {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    disabledReason: StripeDisabledReason | null;
    currentlyDue: StripeRequirementCategory[];
    pastDue: StripeRequirementCategory[];
    pendingVerification: StripeRequirementCategory[];
}

// Connect balance for the cook wallet (EUR cents). Sums Stripe's per-currency buckets for `eur`.
export interface StripeAccountBalance {
    availableCents: number;
    pendingCents: number;
}

export type StripeBalanceTransactionKind = 'PAYMENT' | 'PAYOUT' | 'TRANSFER' | 'FEE' | 'ADJUSTMENT' | 'OTHER';

export type StripeBalanceTransactionStatus = 'AVAILABLE' | 'PENDING';

export interface StripeBalanceTransaction {
    id: string;
    kind: StripeBalanceTransactionKind;
    status: StripeBalanceTransactionStatus;
    // Net change to the Connect balance (cents). Credits positive, debits negative.
    netCents: number;
    createdAt: Date;
    availableOn: Date;
    description: string | null;
}

export interface StripeAccountBalanceTransactionsFindMany {
    accountId: string;
    // Stripe max 100; wallet UI uses a small recent window.
    limit?: number;
}

export interface StripeWebhookEventConstruct {
    // Raw request body — must be the exact bytes Stripe signed (do not JSON-parse first).
    payload: string | Buffer;
    signatureHeader: string;
}

export interface StripeWebhookEvent {
    id: string;
    type: string;
    dataObject: unknown;
}

export interface StripePayment {
    customerIdFindOne: (userId: string) => Promise<string | undefined>;
    customerUpdate: (input: StripeCustomerInput) => Promise<void>;

    setupIntentCreate: (options: StripeSetupIntentCreate) => Promise<StripeSetupIntentCreateResult>;
    setupIntentSucceededCheck: (setupIntentId: string) => Promise<boolean>;
    setupIntentPaymentMethodIdFindOne: (setupIntentId: string) => Promise<string | undefined>;
    setupIntentCancel: (setupIntentId: string) => Promise<void>;

    paymentIntentCreate: (options: StripePaymentIntentCreate) => Promise<StripePaymentIntentCreateResult>;
    paymentIntentAmountUpdate: (paymentIntentId: string, amount: number) => Promise<StripePaymentIntentCreateResult>;
    paymentIntentCreateWithSplit: (options: StripePaymentIntentCreateWithSplit) => Promise<StripePaymentIntentCreateResult>;
    paymentIntentCreateFromPaymentMethodWithSplit: (
        options: StripePaymentIntentCreateFromPaymentMethodWithSplit,
    ) => Promise<StripePaymentIntentCreateResult>;
    paymentIntentSucceededCheck: (paymentIntentId: string) => Promise<boolean>;
    paymentIntentCancel: (paymentIntentId: string) => Promise<void>;
    paymentIntentRefund: (paymentIntentId: string, amount?: number, options?: { idempotencyKey?: string }) => Promise<{ refundId: string }>;
    /** Cents still refundable on the PaymentIntent (amount_received minus charge refunds). */
    paymentIntentRefundableCentsFindOne: (paymentIntentId: string) => Promise<number>;
    paymentIntentPaymentMethodIdFindOne: (paymentIntentId: string) => Promise<string | undefined>;
    paymentIntentDestinationTransferIdFindOne: (paymentIntentId: string) => Promise<string | undefined>;

    accountCreate: (options: StripeAccountCreate) => Promise<StripeAccountCreateResult>;
    accountOnboardingUrlCreate: (accountId: string, refreshUrl: URL, returnUrl: URL) => Promise<URL>;
    accountDashboardUrlCreate: (accountId: string) => Promise<URL>;
    accountOnboardingCompletedCheck: (accountId: string) => Promise<boolean>;
    // Live Connect check — true when Stripe has enabled bank payouts on the account.
    accountPayoutsEnabledCheck: (accountId: string) => Promise<boolean>;
    // Live Connect requirements snapshot for cook wallet status UI.
    accountRequirementsFindOne: (accountId: string) => Promise<StripeAccountRequirements>;
    // Live Connect balance (available + pending) for cook wallet UI.
    accountBalanceFindOne: (accountId: string) => Promise<StripeAccountBalance>;
    // Recent Connect balance transactions (newest first) for cook wallet UI.
    accountBalanceTransactionsFindMany: (options: StripeAccountBalanceTransactionsFindMany) => Promise<StripeBalanceTransaction[]>;

    transferCreate: (options: StripeTransferCreate) => Promise<StripeTransferCreateResult>;
    transferReverse: (options: StripeTransferReverse) => Promise<void>;
    // Manual Express schedule: move Connect balance to the cook's bank.
    payoutCreate: (options: StripePayoutCreate) => Promise<StripePayoutCreateResult>;
    // Recent Connect payouts (newest first) for reconciling Dashboard-created payouts.
    accountPayoutsFindMany: (options: StripeAccountPayoutsFindMany) => Promise<StripePayout[]>;

    webhookEventConstruct: (options: StripeWebhookEventConstruct) => StripeWebhookEvent;
}
