import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps } from '../db/schema';
import type { AuthEmailOtp, AuthEmailOtpCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionAuthEmailOtpFindOne } from './sessionAuthEmailOtpFindOne';

async function insertOtp(sessionId: string, overrides: Partial<AuthEmailOtpCreate> = {}): Promise<AuthEmailOtp> {
    const authEmailOtpId = overrides.authEmailOtpId ?? idCreate();
    const [row] = await testDb
        .insert(authEmailOtps)
        .values({
            authEmailOtpId,
            sessionId,
            emailAddress: 'otp@example.com',
            codeHash: 'hash',
            codeEncrypted: 'encrypted',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attemptCount: 0,
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertOtp: no row');
    return row;
}

describe('sessionAuthEmailOtpFindOne', () => {
    it('returns the latest unconsumed, unexpired OTP for the session', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        await insertOtp(requestingSession.sessionId, { createdAt: new Date(Date.now() - 60_000) });
        const latest = await insertOtp(requestingSession.sessionId, { createdAt: new Date() });

        // Act
        const result = await sessionAuthEmailOtpFindOne(requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({ authEmailOtpId: latest.authEmailOtpId, emailAddress: latest.emailAddress });
    });

    it('returns null when there is no OTP for the session', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(sessionAuthEmailOtpFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the only OTP is consumed', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        await insertOtp(requestingSession.sessionId, { consumedAt: new Date() });

        // Act / Assert
        await expect(sessionAuthEmailOtpFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the only OTP is expired', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        await insertOtp(requestingSession.sessionId, { expiresAt: new Date(Date.now() - 1_000) });

        // Act / Assert
        await expect(sessionAuthEmailOtpFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the only OTP is soft-dismissed', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        await insertOtp(requestingSession.sessionId, { dismissedAt: new Date() });

        await expect(sessionAuthEmailOtpFindOne(requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
