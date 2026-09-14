import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { authPasskeyDelete } from './authPasskeyDelete';

async function passkeyInsert(userId: string, overrides: Partial<{ authPasskeyId: string; credentialId: string }> = {}) {
    const authPasskeyId = overrides.authPasskeyId ?? idCreate();
    const credentialId = overrides.credentialId ?? `cred-${authPasskeyId}`;
    await testDb.insert(authPasskeys).values({
        authPasskeyId,
        userId,
        credentialId,
        publicKey: Buffer.from([1, 2, 3, 4]),
        counter: 0,
        transports: ['internal'],
        deviceType: 'singleDevice',
        backedUp: false,
    });
    return { authPasskeyId, credentialId };
}

describe('authPasskeyDelete', () => {
    it('deletes an owned passkey and publishes userUpdates', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const { authPasskeyId } = await passkeyInsert(user.userId);

        // Act
        const result = await authPasskeyDelete(userMutationParent(user.userId), { authPasskeyId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({ success: true, referenceId: authPasskeyId });
        const rows = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('throws when the passkey does not exist, logs, and does not publish', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const missingId = idCreate();

        // Act + Assert
        await expect(
            authPasskeyDelete(userMutationParent(user.userId), { authPasskeyId: missingId }, requestingSession, serverRuntime),
        ).rejects.toThrow(/authPasskeyDelete: passkey not found/);

        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/authPasskeyDelete: passkey not found/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it("refuses to delete another user's passkey", async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const { authPasskeyId } = await passkeyInsert(other.user.userId);

        // Act + Assert — ownership filter yields not-found.
        await expect(
            authPasskeyDelete(userMutationParent(owner.user.userId), { authPasskeyId }, owner.requestingSession, owner.serverRuntime),
        ).rejects.toThrow(/authPasskeyDelete: passkey not found/);

        const rows = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
        expect(rows).toHaveLength(1);
        expect(owner.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('rejects an unknown user before deleting', async () => {
        // Arrange — legal-acceptance guard rejects missing users.
        const { serverRuntime, requestingSession } = await commandSetup();
        const missingUserId = idCreate();

        // Act + Assert
        await expect(
            authPasskeyDelete(userMutationParent(missingUserId), { authPasskeyId: idCreate() }, requestingSession, serverRuntime),
        ).rejects.toThrow(/Unauthorized/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
