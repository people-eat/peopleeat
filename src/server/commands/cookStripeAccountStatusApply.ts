import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type CookStripeAccountStatusApplyInput = { stripeAccountId: string; cookId: string } | { stripeAccountId: string };

/**
 * Syncs `stripeAccountActive` / `stripeAccountActiveWasReset` from Stripe for a
 * Connect account. Used by `cookStripeStatusSync` (pass `cookId`) and the
 * `account.updated` webhook (lookup by `stripeAccountId` only). Returns false
 * when no cook matches.
 */
export async function cookStripeAccountStatusApply(
    input: CookStripeAccountStatusApplyInput,
    serverRuntime: ServerRuntime,
): Promise<boolean> {
    const [cook] =
        'cookId' in input
            ? await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, input.cookId)).limit(1)
            : await serverRuntime.db.select().from(cooks).where(eq(cooks.stripeAccountId, input.stripeAccountId)).limit(1);

    if (!cook?.stripeAccountId || cook.stripeAccountId !== input.stripeAccountId) {
        return false;
    }

    const isSetupCompleted = await serverRuntime.stripe.accountOnboardingCompletedCheck(input.stripeAccountId);

    let stripeAccountActiveWasReset = false;
    if (cook.stripeAccountActive === true && isSetupCompleted === false) {
        stripeAccountActiveWasReset = true;
    }
    if (cook.stripeAccountActiveWasReset === true && isSetupCompleted === false) {
        stripeAccountActiveWasReset = true;
    }

    await serverRuntime.db
        .update(cooks)
        .set({
            stripeAccountActive: isSetupCompleted,
            stripeAccountActiveWasReset,
            lastModifiedAt: new Date(),
        })
        .where(eq(cooks.cookId, cook.cookId));

    await Promise.all([serverRuntime.publish.userUpdates({ userId: cook.cookId }), serverRuntime.publish.adminUpdates()]);

    return true;
}
