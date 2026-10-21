import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProse, textNormalizeTitled } from '../../shared/textNormalize';
import { giftCards, sessions, users } from '../db/schema';
import type { GiftCardCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type {
    GqlSGiftCardCreate,
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationGiftCardCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { giftCardPreparedExpire } from '../jobs/handlers/giftCardPreparedExpire';
import { redeemCodeCreate } from '../utils/redeemCodeCreate';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { verifyRecaptchaV3 } from '../utils/verifyRecaptchaV3';

const MIN_BALANCE_CENTS = 2500;
const VOUCHER_YEARS = 3;
const CLEANUP_DELAY_MS = 15 * 60 * 1000;

function expiresAtFrom(now: Date): Date {
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + VOUCHER_YEARS);
    return expiresAt;
}

async function cancelCleanupJob(serverRuntime: ServerRuntime, cleanupJobId: string | null | undefined): Promise<void> {
    if (!cleanupJobId) return;
    try {
        await serverRuntime.jobs.cancel(giftCardPreparedExpire.name, cleanupJobId);
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

export async function giftCardCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationGiftCardCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const input: GqlSGiftCardCreate = args.input;
    try {
        const verification = await verifyRecaptchaV3(input.recaptchaToken, environmentVariables.recaptchaSecretKey);
        if (!verification.ok) {
            await serverRuntime.db
                .update(sessions)
                .set({ giftCardPurchaseError: 'RECAPTCHA_FAILED' })
                .where(eq(sessions.sessionId, requestingSession.sessionId));
            await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
            return { success: false };
        }

        // Phase 1 — Payload construction (validation + Stripe side effects needed
        // to populate payment fields; DB writes stay in phase 2).
        if (input.balanceCents < MIN_BALANCE_CENTS) {
            return { success: false };
        }

        const recipientName = textNormalizeTitled(input.recipientName);
        if (recipientName.length === 0) {
            return { success: false };
        }
        const occasion = textNormalizeTitled(input.occasion);
        const message = textNormalizeProse(input.message);

        const [buyer] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!buyer?.emailAddress) {
            throw new Error('giftCardCreate: signed-in user not found');
        }
        const buyerEmail = buyer.emailAddress;

        const locale = input.locale;
        const now = new Date();

        const [existing] = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(and(eq(giftCards.sessionId, requestingSession.sessionId), eq(giftCards.paymentStatus, 'PREPARED')))
            .limit(1);

        let giftCardId: string;
        let paymentIntentId: string;
        let paymentClientSecret: string;
        let redeemCode: string;

        if (existing) {
            giftCardId = existing.giftCardId;
            redeemCode = existing.redeemCode;
            if (existing.balanceCents !== input.balanceCents) {
                const updated = await serverRuntime.stripe.paymentIntentAmountUpdate(existing.paymentIntentId, input.balanceCents);
                paymentIntentId = updated.paymentIntentId;
                paymentClientSecret = updated.clientSecret;
            } else {
                paymentIntentId = existing.paymentIntentId;
                paymentClientSecret = existing.paymentClientSecret;
            }
            await cancelCleanupJob(serverRuntime, existing.cleanupJobId);
        } else {
            giftCardId = idCreate();
            redeemCode = redeemCodeCreate();
            const created = await serverRuntime.stripe.paymentIntentCreate({
                user: { userId, emailAddress: buyerEmail },
                amount: input.balanceCents,
            });
            paymentIntentId = created.paymentIntentId;
            paymentClientSecret = created.clientSecret;
        }

        // Persist first with a null cleanup job id, then enqueue and patch —
        // so a null enqueue cannot leave a scheduled job without a row, and a
        // failed insert cannot leave an orphan cleanup job.
        const values: GiftCardCreate = {
            giftCardId,
            sessionId: requestingSession.sessionId,
            buyerUserId: userId,
            buyerEmail,
            locale,
            occasion,
            recipientName,
            message,
            originalBalanceCents: input.balanceCents,
            balanceCents: input.balanceCents,
            redeemCode,
            paymentIntentId,
            paymentClientSecret,
            paymentStatus: 'PREPARED',
            invoiceAddress: existing?.invoiceAddress ?? null,
            cleanupJobId: null,
            expiresAt: expiresAtFrom(now),
        };

        // Phase 2 — Transactional execution
        if (existing) {
            await serverRuntime.db
                .update(giftCards)
                .set({
                    buyerUserId: values.buyerUserId,
                    buyerEmail: values.buyerEmail,
                    locale: values.locale,
                    occasion: values.occasion,
                    recipientName: values.recipientName,
                    message: values.message,
                    originalBalanceCents: values.originalBalanceCents,
                    balanceCents: values.balanceCents,
                    paymentIntentId: values.paymentIntentId,
                    paymentClientSecret: values.paymentClientSecret,
                    paymentStatus: 'PREPARED',
                    cleanupJobId: null,
                    expiresAt: values.expiresAt,
                })
                .where(eq(giftCards.giftCardId, giftCardId));
        } else {
            await serverRuntime.db.insert(giftCards).values(values);
        }

        const cleanupJobId = await serverRuntime.jobs.enqueue(
            giftCardPreparedExpire,
            { giftCardId },
            { startAfter: new Date(now.getTime() + CLEANUP_DELAY_MS) },
        );
        if (!cleanupJobId) {
            // pg-boss can return null when the send is throttled/deduped. Treat
            // as hard failure so the client retries; the PREPARED row remains
            // and the next create reschedules cleanup.
            throw new Error('giftCardCreate: jobs.enqueue returned null');
        }

        await serverRuntime.db.update(giftCards).set({ cleanupJobId }).where(eq(giftCards.giftCardId, giftCardId));

        await serverRuntime.db
            .update(sessions)
            .set({ giftCardPurchaseError: null })
            .where(eq(sessions.sessionId, requestingSession.sessionId));

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'GIFT_CARD_CREATED',
            payload: { giftCardId },
        });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
        await serverRuntime.publish.userUpdates({ userId });
        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: giftCardId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
