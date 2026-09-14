import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionGiftCardPurchaseErrorFindOne } from './sessionGiftCardPurchaseErrorFindOne';

describe('sessionGiftCardPurchaseErrorFindOne', () => {
    it('returns the code when the session has a gift card purchase error', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        await testDb
            .update(sessions)
            .set({ giftCardPurchaseError: 'RECAPTCHA_FAILED' })
            .where(eq(sessions.sessionId, requestingSession.sessionId));

        // Act
        const result = await sessionGiftCardPurchaseErrorFindOne(requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ code: 'RECAPTCHA_FAILED' });
    });

    it('returns null when the session has no gift card purchase error', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(sessionGiftCardPurchaseErrorFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
