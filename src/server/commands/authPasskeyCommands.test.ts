import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { authPasskeys, authWebAuthnChallenges, sessions } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { authPasskeyAuthenticateOptions } from './authPasskeyAuthenticateOptions';
import { authPasskeyAuthenticateVerify } from './authPasskeyAuthenticateVerify';
import { authPasskeyRegisterOptions } from './authPasskeyRegisterOptions';
import { authPasskeyRegisterVerify } from './authPasskeyRegisterVerify';

vi.mock('@simplewebauthn/server', () => ({
    generateRegistrationOptions: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
}));

function registrationOptionsCreate(challenge = `register-${idCreate()}`) {
    return {
        challenge,
        rp: { name: 'peopleeat', id: 'localhost' },
        user: { id: 'user', name: 'u', displayName: 'u' },
        pubKeyCredParams: [],
    };
}

function authenticationOptionsCreate(challenge = `authenticate-${idCreate()}`) {
    return {
        challenge,
        rpId: 'localhost',
        allowCredentials: [],
    };
}

async function passkeyInsert(userId: string, overrides: Partial<{ authPasskeyId: string; credentialId: string; counter: number }> = {}) {
    const authPasskeyId = overrides.authPasskeyId ?? idCreate();
    const credentialId = overrides.credentialId ?? `cred-${authPasskeyId}`;
    await testDb.insert(authPasskeys).values({
        authPasskeyId,
        userId,
        credentialId,
        publicKey: Buffer.from([9, 8, 7, 6]),
        counter: overrides.counter ?? 1,
        transports: ['internal'],
        deviceType: 'singleDevice',
        backedUp: false,
    });
    return { authPasskeyId, credentialId };
}

async function challengeInsert(args: {
    sessionId: string;
    type: 'register' | 'authenticate';
    challenge?: string;
    userId?: string;
    expiresAt?: Date;
}) {
    const authWebAuthnChallengeId = idCreate();
    const challenge = args.challenge ?? `${args.type}-${idCreate()}`;
    await testDb.insert(authWebAuthnChallenges).values({
        authWebAuthnChallengeId,
        challenge,
        type: args.type,
        sessionId: args.sessionId,
        userId: args.userId,
        expiresAt: args.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
    });
    return authWebAuthnChallengeId;
}

describe('authPasskeyCommands', () => {
    beforeEach(() => {
        vi.mocked(generateRegistrationOptions).mockReset();
        vi.mocked(generateAuthenticationOptions).mockReset();
        vi.mocked(verifyRegistrationResponse).mockReset();
        vi.mocked(verifyAuthenticationResponse).mockReset();
    });

    describe('authPasskeyRegisterOptions', () => {
        it('returns WebAuthn options and persists a register challenge', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            const options = registrationOptionsCreate();
            vi.mocked(generateRegistrationOptions).mockResolvedValue(options);

            // Act
            const result = await authPasskeyRegisterOptions(userMutationParent(user.userId), requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual(options);
            expect(generateRegistrationOptions).toHaveBeenCalledOnce();
            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(
                    and(
                        eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId),
                        eq(authWebAuthnChallenges.type, 'register'),
                        eq(authWebAuthnChallenges.userId, user.userId),
                    ),
                );
            expect(challenges).toHaveLength(1);
            expect(challenges[0]!.challenge).toBe(options.challenge);
            expect(challenges[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('excludes existing credentials when generating options', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            const existing = await passkeyInsert(user.userId, { credentialId: `existing-cred-${idCreate()}` });
            const options = registrationOptionsCreate();
            vi.mocked(generateRegistrationOptions).mockResolvedValue(options);

            // Act
            await authPasskeyRegisterOptions(userMutationParent(user.userId), requestingSession, serverRuntime);

            // Assert
            expect(generateRegistrationOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    excludeCredentials: [expect.objectContaining({ id: existing.credentialId })],
                }),
            );
        });

        it('rejects an unknown user before generating options', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();
            const missingUserId = idCreate();

            // Act + Assert — legal-acceptance guard throws Unauthorized.
            await expect(authPasskeyRegisterOptions(userMutationParent(missingUserId), requestingSession, serverRuntime)).rejects.toThrow(
                /Unauthorized/,
            );

            expect(generateRegistrationOptions).not.toHaveBeenCalled();
            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId));
            expect(challenges).toHaveLength(0);
        });

        it('logs and rethrows when option generation fails', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            vi.mocked(generateRegistrationOptions).mockRejectedValue(new Error('webauthn down'));

            // Act + Assert
            await expect(authPasskeyRegisterOptions(userMutationParent(user.userId), requestingSession, serverRuntime)).rejects.toThrow(
                /webauthn down/,
            );

            const logRows = await findLogsForSession(requestingSession.sessionId);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('error');
            expect(logRows[0]!.message).toMatch(/webauthn down/);
            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId));
            expect(challenges).toHaveLength(0);
        });
    });

    describe('authPasskeyRegisterVerify', () => {
        it('verifies, stores the passkey, and deletes the challenge', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            const credentialId = `new-credential-${idCreate()}`;
            const challengeId = await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'register',
                userId: user.userId,
            });
            vi.mocked(verifyRegistrationResponse).mockResolvedValue({
                verified: true,
                registrationInfo: {
                    credential: {
                        id: credentialId,
                        publicKey: new Uint8Array([1, 2, 3]),
                        counter: 0,
                        transports: ['internal'],
                    },
                    credentialDeviceType: 'singleDevice',
                    credentialBackedUp: true,
                },
            } as never);

            // Act
            const result = await authPasskeyRegisterVerify(
                userMutationParent(user.userId),
                { response: { id: credentialId } },
                requestingSession,
                serverRuntime,
            );

            // Assert
            expect(result).toEqual({ success: true, referenceId: credentialId });
            const passkeys = await testDb.select().from(authPasskeys).where(eq(authPasskeys.userId, user.userId));
            expect(passkeys).toHaveLength(1);
            expect(passkeys[0]!.credentialId).toBe(credentialId);
            expect(passkeys[0]!.counter).toBe(0);
            expect(passkeys[0]!.backedUp).toBe(true);
            expect(Buffer.from(passkeys[0]!.publicKey)).toEqual(Buffer.from([1, 2, 3]));
            expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });

            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.authWebAuthnChallengeId, challengeId));
            expect(challenges).toHaveLength(0);
        });

        it('returns success false when no register challenge exists and warns', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();

            // Act
            const result = await authPasskeyRegisterVerify(
                userMutationParent(user.userId),
                { response: {} },
                requestingSession,
                serverRuntime,
            );

            // Assert
            expect(result).toEqual({ success: false });
            const logRows = await findLogsForSession(requestingSession.sessionId);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('warn');
            expect(logRows[0]!.message).toMatch(/challenge not found or expired/);
            expect(verifyRegistrationResponse).not.toHaveBeenCalled();
        });

        it('returns success false when the register challenge is expired', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'register',
                userId: user.userId,
                expiresAt: new Date(Date.now() - 1_000),
            });

            // Act
            const result = await authPasskeyRegisterVerify(
                userMutationParent(user.userId),
                { response: {} },
                requestingSession,
                serverRuntime,
            );

            // Assert
            expect(result).toEqual({ success: false });
            expect(verifyRegistrationResponse).not.toHaveBeenCalled();
            const passkeys = await testDb.select().from(authPasskeys).where(eq(authPasskeys.userId, user.userId));
            expect(passkeys).toHaveLength(0);
        });

        it('returns success false when verification fails and does not insert a passkey', async () => {
            // Arrange
            const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
            await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'register',
                userId: user.userId,
            });
            vi.mocked(verifyRegistrationResponse).mockResolvedValue({ verified: false } as never);

            // Act
            const result = await authPasskeyRegisterVerify(
                userMutationParent(user.userId),
                { response: {} },
                requestingSession,
                serverRuntime,
            );

            // Assert
            expect(result).toEqual({ success: false });
            const [logRows, passkeys] = await Promise.all([
                findLogsForSession(requestingSession.sessionId),
                testDb.select().from(authPasskeys).where(eq(authPasskeys.userId, user.userId)),
            ]);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('warn');
            expect(logRows[0]!.message).toMatch(/verification failed/);
            expect(passkeys).toHaveLength(0);
        });
    });

    describe('authPasskeyAuthenticateOptions', () => {
        it('returns authentication options and persists an authenticate challenge', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();
            const options = authenticationOptionsCreate();
            vi.mocked(generateAuthenticationOptions).mockResolvedValue(options);

            // Act
            const result = await authPasskeyAuthenticateOptions(requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual(options);
            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(
                    and(eq(authWebAuthnChallenges.sessionId, requestingSession.sessionId), eq(authWebAuthnChallenges.type, 'authenticate')),
                );
            expect(challenges).toHaveLength(1);
            expect(challenges[0]!.challenge).toBe(options.challenge);
            expect(challenges[0]!.userId).toBeNull();
        });

        it('logs and rethrows when authentication option generation fails', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();
            vi.mocked(generateAuthenticationOptions).mockRejectedValue(new Error('auth options failed'));

            // Act + Assert
            await expect(authPasskeyAuthenticateOptions(requestingSession, serverRuntime)).rejects.toThrow(/auth options failed/);

            const logRows = await findLogsForSession(requestingSession.sessionId);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.message).toMatch(/auth options failed/);
        });
    });

    describe('authPasskeyAuthenticateVerify', () => {
        it('verifies, updates the counter, binds the session, and deletes the challenge', async () => {
            // Arrange — passkey owner + anonymous requesting session.
            const owner = await commandSetup.withUser();
            const { serverRuntime, requestingSession } = await commandSetup();
            const { authPasskeyId, credentialId } = await passkeyInsert(owner.user.userId, { counter: 3 });
            const challengeId = await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'authenticate',
            });
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
                verified: true,
                authenticationInfo: { newCounter: 4 },
            } as never);

            // Act
            const result = await authPasskeyAuthenticateVerify({ response: { id: credentialId } }, requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual({ success: true, referenceId: owner.user.userId });
            const [passkey] = await testDb.select().from(authPasskeys).where(eq(authPasskeys.authPasskeyId, authPasskeyId));
            expect(passkey?.counter).toBe(4);

            const challenges = await testDb
                .select()
                .from(authWebAuthnChallenges)
                .where(eq(authWebAuthnChallenges.authWebAuthnChallengeId, challengeId));
            expect(challenges).toHaveLength(0);

            const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
            expect(session?.userId).toBe(owner.user.userId);
            expect(requestingSession.userId).toBe(owner.user.userId);
            expect(serverRuntime.publish.sessionUpdates).toHaveBeenCalledWith({ sessionId: requestingSession.sessionId });
        });

        it('returns success false when no authenticate challenge exists', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();

            // Act
            const result = await authPasskeyAuthenticateVerify({ response: { id: 'missing' } }, requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual({ success: false });
            const logRows = await findLogsForSession(requestingSession.sessionId);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('warn');
            expect(logRows[0]!.message).toMatch(/challenge not found or expired/);
            expect(serverRuntime.publish.sessionUpdates).not.toHaveBeenCalled();
        });

        it('returns success false for an unknown credential', async () => {
            // Arrange
            const { serverRuntime, requestingSession } = await commandSetup();
            await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'authenticate',
            });

            // Act
            const result = await authPasskeyAuthenticateVerify({ response: { id: 'no-such-cred' } }, requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual({ success: false });
            const logRows = await findLogsForSession(requestingSession.sessionId);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('warn');
            expect(logRows[0]!.message).toMatch(/unknown credential/);
            expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
            expect(serverRuntime.publish.sessionUpdates).not.toHaveBeenCalled();
        });

        it('returns success false when authentication verification fails', async () => {
            // Arrange
            const owner = await commandSetup.withUser();
            const { serverRuntime, requestingSession } = await commandSetup();
            const { credentialId } = await passkeyInsert(owner.user.userId);
            await challengeInsert({
                sessionId: requestingSession.sessionId,
                type: 'authenticate',
            });
            vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: false } as never);

            // Act
            const result = await authPasskeyAuthenticateVerify({ response: { id: credentialId } }, requestingSession, serverRuntime);

            // Assert
            expect(result).toEqual({ success: false });
            const [logRows, session] = await Promise.all([
                findLogsForSession(requestingSession.sessionId),
                testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId)),
            ]);
            expect(logRows).toHaveLength(1);
            expect(logRows[0]!.level).toBe('warn');
            expect(logRows[0]!.message).toMatch(/verification failed/);
            expect(session[0]?.userId).toBeNull();
            expect(serverRuntime.publish.sessionUpdates).not.toHaveBeenCalled();
        });
    });
});
