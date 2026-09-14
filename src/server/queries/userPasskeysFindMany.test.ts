import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys } from '../db/schema';
import type { AuthPasskeyCreate } from '../db/schema';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userPasskeysFindMany } from './userPasskeysFindMany';

async function insertPasskey(userId: string, overrides: Partial<AuthPasskeyCreate> = {}) {
    const authPasskeyId = overrides.authPasskeyId ?? idCreate();
    const [row] = await testDb
        .insert(authPasskeys)
        .values({
            authPasskeyId,
            userId,
            credentialId: `cred-${authPasskeyId}`,
            publicKey: Buffer.from([1, 2, 3]),
            counter: 0,
            transports: ['internal'],
            deviceType: 'singleDevice',
            backedUp: false,
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertPasskey: no row');
    return row;
}

describe('userPasskeysFindMany', () => {
    it('returns the passkeys owned by the session user', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const passkey = await insertPasskey(user.userId);

        // Act
        const result = await userPasskeysFindMany(toGqlUser(user), requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual([
            {
                authPasskeyId: passkey.authPasskeyId,
                deviceType: passkey.deviceType,
                backedUp: passkey.backedUp,
                createdAt: passkey.createdAt,
            },
        ]);
    });

    it('returns an empty list for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        await insertPasskey(owner.user.userId);
        const other = await commandSetup.withUser();

        // Act
        const result = await userPasskeysFindMany(toGqlUser(owner.user), other.requestingSession, other.serverRuntime);

        // Assert
        expect(result).toEqual([]);
    });
});
