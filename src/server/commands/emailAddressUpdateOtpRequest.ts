import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, users } from '../db/schema';
import type { AuthEmailOtpCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    EmailAddressUpdateOtpRequestForUserEmail,
    emailAddressUpdateOtpRequestForUserEmailSubject,
} from '../email/templates/EmailAddressUpdateOtpRequestForUserEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationEmailAddressUpdateOtpRequestArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import {
    authOtpCodeDecrypt,
    authOtpCodeEncrypt,
    authOtpCodeGenerate,
    authOtpCodeHash,
    authOtpExpiresAt,
    authOtpPepperRequire,
    emailNormalize,
} from '../utils/authOtpUtils';

const OTP_COOLDOWN_MS = 60_000;

export async function emailAddressUpdateOtpRequest(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationEmailAddressUpdateOtpRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const email = emailNormalize(args.emailAddress);
    const locale = args.locale;

    try {
        const [currentUser] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress, firstName: users.firstName })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!currentUser) {
            throw new Error('emailAddressUpdateOtpRequest: user not found');
        }
        if (currentUser.emailAddress === email) {
            throw new Error('emailAddressUpdateOtpRequest: email unchanged');
        }

        const [taken] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(and(eq(users.emailAddress, email), ne(users.userId, userId)))
            .limit(1);
        if (taken) {
            throw new Error('emailAddressUpdateOtpRequest: email already registered');
        }

        const now = new Date();
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

            await serverRuntime.email.send({
                to: email,
                subject: emailAddressUpdateOtpRequestForUserEmailSubject(locale),
                react: EmailAddressUpdateOtpRequestForUserEmail({
                    code,
                    locale,
                    webPageUrl: environmentVariables.webPageUrl,
                    recipientFirstName: currentUser.firstName,
                }),
                purpose: 'EMAIL_ADDRESS_UPDATE_CONFIRM',
                locale,
                userId,
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

        await serverRuntime.email.send({
            to: email,
            subject: emailAddressUpdateOtpRequestForUserEmailSubject(locale),
            react: EmailAddressUpdateOtpRequestForUserEmail({
                code,
                locale,
                webPageUrl: environmentVariables.webPageUrl,
                recipientFirstName: currentUser.firstName,
            }),
            purpose: 'EMAIL_ADDRESS_UPDATE_CONFIRM',
            locale,
            userId,
        });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: authEmailOtpId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
