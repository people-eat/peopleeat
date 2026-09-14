import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, users } from '../db/schema';
import type { AuthEmailOtpCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    AuthEmailOtpRequestForUserEmail,
    authEmailOtpRequestForUserEmailSubject,
} from '../email/templates/AuthEmailOtpRequestForUserEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSMutationAuthEmailOtpRequestArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import {
    authOtpCodeDecrypt,
    authOtpCodeEncrypt,
    authOtpCodeGenerate,
    authOtpCodeHash,
    authOtpExpiresAt,
    authOtpPepperRequire,
    emailNormalize,
} from '../utils/authOtpUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';

const OTP_COOLDOWN_MS = 60_000;

export async function authEmailOtpRequest(
    args: GqlSMutationAuthEmailOtpRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const email = emailNormalize(args.email);
    const locale = args.locale;

    try {
        const now = new Date();

        // Reuse an unconsumed, unverified, unexpired OTP for this session+email
        // (including soft-dismissed rows) so retries send the same code again.
        const [reusable] = await serverRuntime.db
            .select({
                authEmailOtpId: authEmailOtps.authEmailOtpId,
                codeEncrypted: authEmailOtps.codeEncrypted,
                lastSentAt: authEmailOtps.lastSentAt,
                dismissedAt: authEmailOtps.dismissedAt,
            })
            .from(authEmailOtps)
            .where(
                and(
                    eq(authEmailOtps.emailAddress, email),
                    eq(authEmailOtps.sessionId, requestingSession.sessionId),
                    isNull(authEmailOtps.consumedAt),
                    isNull(authEmailOtps.verifiedAt),
                    gt(authEmailOtps.expiresAt, now),
                ),
            )
            .orderBy(desc(authEmailOtps.createdAt))
            .limit(1);

        if (reusable) {
            const withinCooldown = now.getTime() - reusable.lastSentAt.getTime() < OTP_COOLDOWN_MS;

            if (withinCooldown) {
                if (reusable.dismissedAt) {
                    await serverRuntime.db
                        .update(authEmailOtps)
                        .set({ dismissedAt: null })
                        .where(eq(authEmailOtps.authEmailOtpId, reusable.authEmailOtpId));
                }
                // Re-publish so a client that missed the first update still opens the OTP dialog.
                await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
                return { success: true, referenceId: reusable.authEmailOtpId };
            }

            const code = authOtpCodeDecrypt(reusable.codeEncrypted);
            await serverRuntime.db
                .update(authEmailOtps)
                .set({
                    dismissedAt: null,
                    lastSentAt: now,
                    expiresAt: authOtpExpiresAt(now),
                })
                .where(eq(authEmailOtps.authEmailOtpId, reusable.authEmailOtpId));

            const [existingUser] = await serverRuntime.db
                .select({ userId: users.userId })
                .from(users)
                .where(sql`lower(${users.emailAddress}) = ${email}`)
                .limit(1);

            await serverRuntime.email.send({
                to: email,
                subject: authEmailOtpRequestForUserEmailSubject(locale, code),
                react: AuthEmailOtpRequestForUserEmail({ code, locale, webPageUrl: environmentVariables.webPageUrl }),
                purpose: 'AUTH_EMAIL_OTP',
                locale,
                userId: existingUser?.userId ?? null,
            });

            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_EMAIL_OTP_REQUESTED',
                payload: {},
            });

            await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });
            return { success: true, referenceId: reusable.authEmailOtpId };
        }

        // Phase 1 — Payload construction (pure, no DB calls)
        const pepper = authOtpPepperRequire();
        const code = authOtpCodeGenerate();
        const authEmailOtpId = idCreate();
        const authEmailOtpInsert: AuthEmailOtpCreate = {
            authEmailOtpId,
            sessionId: requestingSession.sessionId,
            emailAddress: email,
            codeHash: authOtpCodeHash(code, pepper),
            codeEncrypted: authOtpCodeEncrypt(code, pepper),
            expiresAt: authOtpExpiresAt(now),
            lastSentAt: now,
        };

        // Phase 2 — Transactional execution (side-effectful)
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .delete(authEmailOtps)
                .where(and(eq(authEmailOtps.sessionId, requestingSession.sessionId), isNull(authEmailOtps.consumedAt)));
            await transaction.insert(authEmailOtps).values(authEmailOtpInsert);
        });

        const [existingUser] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(sql`lower(${users.emailAddress}) = ${email}`)
            .limit(1);

        await serverRuntime.email.send({
            to: email,
            subject: authEmailOtpRequestForUserEmailSubject(locale, code),
            react: AuthEmailOtpRequestForUserEmail({ code, locale, webPageUrl: environmentVariables.webPageUrl }),
            purpose: 'AUTH_EMAIL_OTP',
            locale,
            userId: existingUser?.userId ?? null,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'AUTH_EMAIL_OTP_REQUESTED',
            payload: {},
        });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: authEmailOtpId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
