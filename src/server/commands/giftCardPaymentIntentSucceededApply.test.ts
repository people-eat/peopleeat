import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { giftCards } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { giftCardPaymentIntentSucceededApply } from './giftCardPaymentIntentSucceededApply';
import { stripeWebhookApply } from './stripeWebhookApply';

const billingAddress = {
    name: 'Buyer Person',
    address: {
        country: 'DE',
        city: 'Berlin',
        postalCode: '10115',
        line1: 'Musterstraße 1',
        line2: null,
    },
};

async function insertPreparedGiftCard(sessionId: string, buyerUserId: string, buyerEmail: string) {
    const giftCardId = idCreate();
    const paymentIntentId = `pi_${giftCardId}`;
    await testDb.insert(giftCards).values({
        giftCardId,
        sessionId,
        buyerUserId,
        buyerEmail,
        locale: 'en',
        occasion: 'Hochzeit',
        recipientName: 'Grace Hopper',
        message: 'Cheers!',
        originalBalanceCents: 15_000,
        balanceCents: 15_000,
        redeemCode: `GC-${giftCardId}`,
        paymentIntentId,
        paymentClientSecret: `${paymentIntentId}_secret`,
        paymentStatus: 'PREPARED',
        cleanupJobId: 'job_cleanup',
        expiresAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
    });
    return { giftCardId, paymentIntentId };
}

describe('giftCardPaymentIntentSucceededApply', () => {
    it('mints once from payment_intent.succeeded and ignores a repeat', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const buyerEmail = user.emailAddress;
        if (!buyerEmail) {
            throw new Error('giftCardPaymentIntentSucceededApply.test: buyer email required');
        }
        const { giftCardId, paymentIntentId } = await insertPreparedGiftCard(requestingSession.sessionId, user.userId, buyerEmail);
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockResolvedValue(true);
        vi.mocked(serverRuntime.stripe.paymentIntentBillingAddressFindOne).mockResolvedValue(billingAddress);
        vi.mocked(serverRuntime.stripe.customerUpdate).mockResolvedValue(undefined);
        vi.mocked(serverRuntime.browser.capturePdf).mockResolvedValue(Buffer.from('%PDF'));
        vi.mocked(serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-gift' });

        await stripeWebhookApply(
            { id: 'evt_gift_1', type: 'payment_intent.succeeded', dataObject: { id: paymentIntentId } },
            serverRuntime,
        );

        const [paid] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(paid?.paymentStatus).toBe('PAYED');
        expect(paid?.cleanupJobId).toBeNull();
        expect(paid?.payedAt).toBeInstanceOf(Date);
        expect(paid?.invoiceAddress?.firstName).toBe('Buyer');
        expect(paid?.invoiceAddress?.postalCode).toBe('10115');
        expect(paid?.invoiceAddress?.companyName).toBeNull();
        expect(serverRuntime.email.send).toHaveBeenCalledOnce();
        expect(serverRuntime.jobs.cancel).toHaveBeenCalledWith('gift-card-prepared-expire', 'job_cleanup');
        expect(serverRuntime.stripe.customerUpdate).toHaveBeenCalledOnce();

        vi.mocked(serverRuntime.email.send).mockClear();
        vi.mocked(serverRuntime.stripe.paymentIntentSucceededCheck).mockClear();
        vi.mocked(serverRuntime.stripe.paymentIntentBillingAddressFindOne).mockClear();

        await stripeWebhookApply(
            { id: 'evt_gift_2', type: 'payment_intent.succeeded', dataObject: { id: paymentIntentId } },
            serverRuntime,
        );

        expect(serverRuntime.email.send).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentSucceededCheck).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentBillingAddressFindOne).not.toHaveBeenCalled();
        const [again] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(again?.payedAt?.getTime()).toBe(paid?.payedAt?.getTime());
    });

    it('returns false when the PaymentIntent is not a gift card', async () => {
        const { serverRuntime } = await commandSetup.withUser();

        const applied = await giftCardPaymentIntentSucceededApply(`pi_${idCreate()}`, serverRuntime);

        expect(applied).toBe(false);
        expect(serverRuntime.email.send).not.toHaveBeenCalled();
        expect(serverRuntime.stripe.paymentIntentSucceededCheck).not.toHaveBeenCalled();
    });
});
