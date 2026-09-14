import { eq } from 'drizzle-orm';

import { giftCards } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';

interface GiftCardPreparedExpireData {
    giftCardId: string;
}

// Deletes unpaid `PREPARED` gift cards ~15 minutes after create/update so
// abandoned Stripe PaymentIntents do not linger. Cancelled when `giftCardPay`
// succeeds. See `docs/features/gift-card-purchase.md`.
export const giftCardPreparedExpire: QueuedJobDefinition<GiftCardPreparedExpireData> = {
    kind: 'queued',
    name: 'gift-card-prepared-expire',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db.select().from(giftCards).where(eq(giftCards.giftCardId, data.giftCardId)).limit(1);
        if (!row || row.paymentStatus !== 'PREPARED') {
            return;
        }

        // If Stripe already collected funds (or settlement is in flight) but
        // `giftCardPay` never ran, keep the row so a retry / future webhook
        // can finalize. Never delete a paid PI's gift card.
        const paidOrProcessing = await serverRuntime.stripe.paymentIntentSucceededCheck(row.paymentIntentId);
        if (paidOrProcessing) {
            return;
        }

        try {
            await serverRuntime.stripe.paymentIntentCancel(row.paymentIntentId);
        } catch (error) {
            // PI may already be canceled/expired — still remove the unpaid row.
            serverRuntime.log.error(error, null);
        }

        await serverRuntime.db.delete(giftCards).where(eq(giftCards.giftCardId, row.giftCardId));
        await serverRuntime.publish.sessionUpdates({ sessionId: row.sessionId });
        await serverRuntime.publish.adminUpdates();
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};
