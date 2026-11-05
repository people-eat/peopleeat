import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, giftCards } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import type * as GiftCardPdfsCreateModule from '../utils/giftCardPdfsCreate';
import { giftCardPdfsRegenerateForPayedCard } from '../utils/giftCardPdfsCreate';
import { adminGiftCardPdfsRegenerate } from './adminGiftCardPdfsRegenerate';
import { giftCardCreate } from './giftCardCreate';

vi.mock('../utils/giftCardPdfsCreate', async (importOriginal) => {
    const actual = await importOriginal<typeof GiftCardPdfsCreateModule>();
    return {
        ...actual,
        giftCardPdfsRegenerateForPayedCard: vi.fn(actual.giftCardPdfsRegenerateForPayedCard),
    };
});

const createInput = {
    balanceCents: 15_000,
    occasion: 'Hochzeit',
    recipientName: 'Grace Hopper',
    message: 'Cheers!',
    locale: 'en' as const,
    recaptchaToken: 'token',
};

async function adminCaller() {
    const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    return admin;
}

async function useRealRegenerate(): Promise<void> {
    const actual = await vi.importActual<typeof GiftCardPdfsCreateModule>('../utils/giftCardPdfsCreate');
    vi.mocked(giftCardPdfsRegenerateForPayedCard).mockReset();
    vi.mocked(giftCardPdfsRegenerateForPayedCard).mockImplementation(actual.giftCardPdfsRegenerateForPayedCard);
}

async function preparedGiftCard() {
    const buyer = await commandSetup.withUser();
    vi.mocked(buyer.serverRuntime.stripe.paymentIntentCreate).mockResolvedValue({
        paymentIntentId: `pi_${idCreate()}`,
        clientSecret: `secret_${idCreate()}`,
    });
    const created = await giftCardCreate(
        userMutationParent(buyer.user.userId),
        { input: createInput },
        buyer.requestingSession,
        buyer.serverRuntime,
    );
    return { buyer, giftCardId: created.referenceId! };
}

describe('adminGiftCardPdfsRegenerate', () => {
    it('returns false when the gift card is missing', async () => {
        // Arrange
        const admin = await adminCaller();
        await useRealRegenerate();
        const giftCardId = idCreate();

        // Act
        const result = await adminGiftCardPdfsRegenerate(
            adminMutationParent(admin.user.userId),
            { giftCardId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        const rows = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(rows).toHaveLength(0);
        expect(giftCardPdfsRegenerateForPayedCard).toHaveBeenCalledWith(giftCardId, admin.serverRuntime);
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns false for a prepared card', async () => {
        // Arrange
        const admin = await adminCaller();
        await useRealRegenerate();
        const { giftCardId } = await preparedGiftCard();
        const [before] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));

        // Act
        const result = await adminGiftCardPdfsRegenerate(
            adminMutationParent(admin.user.userId),
            { giftCardId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        const [after] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(after?.paymentStatus).toBe('PREPARED');
        expect(after?.invoiceFileUploadId).toBe(before?.invoiceFileUploadId ?? null);
        expect(after?.voucherFileUploadId).toBe(before?.voucherFileUploadId ?? null);
        expect(giftCardPdfsRegenerateForPayedCard).toHaveBeenCalledWith(giftCardId, admin.serverRuntime);
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('returns the gift card id when regenerate succeeds', async () => {
        // Arrange
        const admin = await adminCaller();
        const { giftCardId } = await preparedGiftCard();
        await testDb
            .update(giftCards)
            .set({ paymentStatus: 'PAYED', payedAt: new Date('2026-06-01T16:00:00.000Z') })
            .where(eq(giftCards.giftCardId, giftCardId));
        vi.mocked(giftCardPdfsRegenerateForPayedCard).mockReset();
        vi.mocked(giftCardPdfsRegenerateForPayedCard).mockResolvedValue(true);

        // Act
        const result = await adminGiftCardPdfsRegenerate(
            adminMutationParent(admin.user.userId),
            { giftCardId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: giftCardId });
        expect(giftCardPdfsRegenerateForPayedCard).toHaveBeenCalledTimes(1);
        expect(giftCardPdfsRegenerateForPayedCard).toHaveBeenCalledWith(giftCardId, admin.serverRuntime);
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
    });

    it('logs and rethrows when regenerate fails', async () => {
        // Arrange
        const admin = await adminCaller();
        const { giftCardId } = await preparedGiftCard();
        vi.mocked(giftCardPdfsRegenerateForPayedCard).mockReset();
        vi.mocked(giftCardPdfsRegenerateForPayedCard).mockRejectedValue(new Error('regenerate failed'));

        // Act
        const pending = adminGiftCardPdfsRegenerate(
            adminMutationParent(admin.user.userId),
            { giftCardId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow('regenerate failed');
        const [after] = await testDb.select().from(giftCards).where(eq(giftCards.giftCardId, giftCardId));
        expect(after?.paymentStatus).toBe('PREPARED');
        expect(after?.invoiceFileUploadId).toBeNull();
        expect(after?.voucherFileUploadId).toBeNull();
        expect(admin.serverRuntime.browser.capturePdf).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && row.message.includes('regenerate failed'))).toBe(true);
    });
});
