import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { authEmailOtps, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationAuthEmailOtpVerifyArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { authOtpCodeMatches, authOtpPepperRequire, emailNormalize } from '../utils/authOtpUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionPrimaryAuthComplete } from './sessionPrimaryAuthComplete';

const MAX_ATTEMPTS = 5;
const REGISTRATION_TICKET_MS = 30 * 60 * 1000;

export async function authEmailOtpVerify(
    args: GqlSMutationAuthEmailOtpVerifyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    if (requestingSession.userId) {
        throw new Error('authEmailOtpVerify: already signed in');
    }

    const email = emailNormalize(args.email);
    const code = args.code;
    const pepper = authOtpPepperRequire();
    const now = new Date();

    try {
        const [otp] = await serverRuntime.db
            .select()
            .from(authEmailOtps)
            .where(
                and(
                    eq(authEmailOtps.sessionId, requestingSession.sessionId),
                    eq(authEmailOtps.emailAddress, email),
                    isNull(authEmailOtps.consumedAt),
                ),
            )
            .orderBy(desc(authEmailOtps.createdAt))
            .limit(1);

        if (!otp || otp.expiresAt.getTime() <= now.getTime()) {
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_VERIFY_FAILED',
                payload: {},
            });
            throw new Error('authEmailOtpVerify: invalid or expired code');
        }

        if (otp.verifiedAt != null) {
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_VERIFY_FAILED',
                payload: {},
            });
            throw new Error('authEmailOtpVerify: already verified');
        }

        if (otp.attemptCount >= MAX_ATTEMPTS) {
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_VERIFY_FAILED',
                payload: {},
            });
            throw new Error('authEmailOtpVerify: too many attemptCount');
        }

        if (!authOtpCodeMatches(code.trim(), otp.codeHash, pepper)) {
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ attemptCount: otp.attemptCount + 1 })
                .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_VERIFY_FAILED',
                payload: {},
            });
            throw new Error('authEmailOtpVerify: invalid or expired code');
        }

        // Case-insensitive: stored emails may predate normalize-on-write (imports, older seeds).
        const [existing] = await serverRuntime.db
            .select()
            .from(users)
            .where(sql`lower(${users.emailAddress}) = ${email}`)
            .limit(1);

        if (existing) {
            if (existing.status === 'ANONYMIZED') {
                await sessionEventCreate(serverRuntime, {
                    sessionId: requestingSession.sessionId,
                    type: 'AUTH_EMAIL_OTP_VERIFY_FAILED',
                    payload: {},
                });
                throw new Error('authEmailOtpVerify: invalid or expired code');
            }
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ consumedAt: now })
                .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
                payload: { outcome: 'sign_in' },
            });
            await sessionPrimaryAuthComplete(requestingSession.sessionId, existing.userId, requestingSession, serverRuntime);
            return { success: true, referenceId: existing.userId };
        }

        const registrationExpiresAt = new Date(now.getTime() + REGISTRATION_TICKET_MS);
        await serverRuntime.db
            .update(authEmailOtps)
            .set({ verifiedAt: now, expiresAt: registrationExpiresAt })
            .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
            payload: { outcome: 'registration_ticket' },
        });
        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: otp.authEmailOtpId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
