import { and, eq, isNotNull } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords, sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationAuthTotpVerifyArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import {
    authTotpCodeValid,
    authTotpEncryptionKeyRequire,
    authTotpLooksLikeRecoveryCode,
    authTotpRecoveryCodeConsume,
    authTotpSecretDecrypt,
} from '../utils/authTotpUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionUserBind } from './sessionUserBind';

export async function authTotpVerify(
    args: GqlSMutationAuthTotpVerifyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    if (requestingSession.userId) {
        throw new Error('authTotpVerify: already signed in');
    }

    authTotpEncryptionKeyRequire();
    const now = new Date();

    try {
        const [session] = await serverRuntime.db
            .select({
                pendingTotpUserId: sessions.pendingTotpUserId,
                pendingTotpExpiresAt: sessions.pendingTotpExpiresAt,
            })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId))
            .limit(1);

        if (!session?.pendingTotpUserId || !session.pendingTotpExpiresAt) {
            serverRuntime.log.warn('authTotpVerify: no pending challenge', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_TOTP_VERIFY_FAILED',
                payload: {},
            });
            return { success: false };
        }

        if (session.pendingTotpExpiresAt.getTime() <= now.getTime()) {
            await serverRuntime.db
                .update(sessions)
                .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
                .where(eq(sessions.sessionId, requestingSession.sessionId));
            await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
            serverRuntime.log.warn('authTotpVerify: challenge expired', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_TOTP_VERIFY_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const userId = session.pendingTotpUserId;
        const [totpUser] = await serverRuntime.db.select({ status: users.status }).from(users).where(eq(users.userId, userId)).limit(1);
        if (!totpUser || totpUser.status === 'ANONYMIZED') {
            await serverRuntime.db
                .update(sessions)
                .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
                .where(eq(sessions.sessionId, requestingSession.sessionId));
            await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
            serverRuntime.log.warn('authTotpVerify: user anonymized or missing', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_TOTP_VERIFY_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const [totp] = await serverRuntime.db
            .select()
            .from(authTimeBasedOneTimePasswords)
            .where(and(eq(authTimeBasedOneTimePasswords.userId, userId), isNotNull(authTimeBasedOneTimePasswords.confirmedAt)))
            .limit(1);

        if (!totp) {
            serverRuntime.log.warn('authTotpVerify: TOTP not enabled', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_TOTP_VERIFY_FAILED',
                payload: {},
            });
            return { success: false };
        }

        const code = args.code.trim();
        let matched = false;
        let nextRecoveryCodes = totp.recoveryCodes;
        let via: 'code' | 'recovery' = 'code';

        if (authTotpLooksLikeRecoveryCode(code)) {
            const consumed = authTotpRecoveryCodeConsume(totp.recoveryCodes, code, undefined, now);
            if (consumed) {
                matched = true;
                nextRecoveryCodes = consumed;
                via = 'recovery';
            }
        } else {
            const secret = authTotpSecretDecrypt(totp.secretEncrypted);
            matched = authTotpCodeValid(secret, code, now);
        }

        if (!matched) {
            serverRuntime.log.warn('authTotpVerify: invalid code', requestingSession);
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_TOTP_VERIFY_FAILED',
                payload: {},
            });
            return { success: false };
        }

        await serverRuntime.db
            .update(authTimeBasedOneTimePasswords)
            .set({
                lastUsedAt: now,
                recoveryCodes: nextRecoveryCodes,
            })
            .where(eq(authTimeBasedOneTimePasswords.authTimeBasedOneTimePasswordId, totp.authTimeBasedOneTimePasswordId));

        await serverRuntime.db
            .update(sessions)
            .set({ pendingTotpUserId: null, pendingTotpExpiresAt: null })
            .where(eq(sessions.sessionId, requestingSession.sessionId));

        await sessionUserBind(requestingSession.sessionId, userId, requestingSession, serverRuntime);
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'AUTH_TOTP_VERIFY_SUCCEEDED',
            payload: { via },
        });

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
