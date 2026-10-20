import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookStripeWallet, GqlSSession } from '../graphql/generated';

const WALLET_TRANSACTION_LIMIT = 20;

/** Live Connect balance + recent transactions. Null without account id or on Stripe failure. */
export async function cookStripeWalletLoad(
    cookId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeWallet | null> {
    try {
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
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
