import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookStripeWallet, GqlSSession } from '../graphql/generated';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

const WALLET_TRANSACTION_LIMIT = 20;

export async function cookStripeWalletFindOne(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeWallet | null> {
    if (!requestingSession.userId || requestingSession.userId !== cookId) {
        return null;
    }

    try {
        const enabled = await featureToggleIsEnabled('COOK_WALLET_STRIPE_BALANCE', serverRuntime, cookId);
        if (!enabled) {
            return null;
        }

        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook?.stripeAccountId) {
            return null;
        }

        const accountId = cook.stripeAccountId;
        const [balance, transactions] = await Promise.all([
            serverRuntime.stripe.accountBalanceFindOne(accountId),
            serverRuntime.stripe.accountBalanceTransactionsFindMany({ accountId, limit: WALLET_TRANSACTION_LIMIT }),
        ]);

        return {
            availableCents: balance.availableCents,
            pendingCents: balance.pendingCents,
            transactions: transactions.map((txn) => ({
                balanceTransactionId: txn.id,
                kind: txn.kind,
                status: txn.status,
                netCents: txn.netCents,
                createdAt: txn.createdAt,
                availableOn: txn.availableOn,
                description: txn.description,
            })),
        };
    } catch (error) {
        // Wallet page should still render coarse stripeStatus when Stripe is down.
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
