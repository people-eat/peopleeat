import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { users } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { userLegalAccept } from './userLegalAccept';

describe('userLegalAccept', () => {
    it('stamps privacy and terms acceptance and publishes userUpdates', async () => {
        // Arrange — user with no prior acceptance timestamps.
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            lastAcceptedPrivacyPolicy: null,
            lastAcceptedTerms: null,
        });
        const before = Date.now();

        // Act
        const result = await userLegalAccept(userMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert — mutation success + both timestamps set.
        expect(result).toEqual({ success: true, referenceId: user.userId });
        const [row] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(row?.lastAcceptedPrivacyPolicy).toBeInstanceOf(Date);
        expect(row?.lastAcceptedTerms).toBeInstanceOf(Date);
        expect(row!.lastAcceptedPrivacyPolicy!.getTime()).toBeGreaterThanOrEqual(before);
        expect(row!.lastAcceptedTerms!.getTime()).toBeGreaterThanOrEqual(before);
        expect(row!.lastAcceptedPrivacyPolicy!.getTime()).toBe(row!.lastAcceptedTerms!.getTime());

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('refreshes acceptance timestamps when already accepted', async () => {
        // Arrange — stale acceptance in the past.
        const stale = new Date('2020-01-01T00:00:00.000Z');
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            lastAcceptedPrivacyPolicy: stale,
            lastAcceptedTerms: stale,
        });

        // Act
        const result = await userLegalAccept(userMutationParent(user.userId), requestingSession, serverRuntime);

        // Assert — timestamps moved forward.
        expect(result.success).toBe(true);
        const [row] = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(row!.lastAcceptedPrivacyPolicy!.getTime()).toBeGreaterThan(stale.getTime());
        expect(row!.lastAcceptedTerms!.getTime()).toBeGreaterThan(stale.getTime());
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('throws when the user does not exist, logs the error, and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingUserId = idCreate();

        // Act + Assert
        await expect(userLegalAccept(userMutationParent(missingUserId), requestingSession, serverRuntime)).rejects.toThrow(
            /userLegalAccept: user not found/,
        );

        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, missingUserId)),
            findLogsForSession(requestingSession.sessionId),
        ]);
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/userLegalAccept: user not found/);
    });
});
