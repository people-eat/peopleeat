import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { authEmailOtps, users } from '../db/schema';
import type { AuthEmailOtpCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    AccountDeleteOtpRequestForUserEmail,
    accountDeleteOtpRequestForUserEmailSubject,
} from '../email/templates/AccountDeleteOtpRequestForUserEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationUserAnonymizeOtpRequestArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import {
    authOtpCodeDecrypt,
    authOtpCodeEncrypt,
    authOtpCodeGenerate,
    authOtpCodeHash,
    authOtpExpiresAt,
    authOtpPepperRequire,
} from '../utils/authOtpUtils';

const OTP_COOLDOWN_MS = 60_000;
const PURPOSE = 'ACCOUNT_DELETE';

export async function userAnonymizeOtpRequest(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationUserAnonymizeOtpRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);
    const locale = args.locale;

    try {
        const [currentUser] = await serverRuntime.db
            .select({ emailAddress: users.emailAddress, firstName: users.firstName, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!currentUser) {
            throw new Error('userAnonymizeOtpRequest: user not found');
        }
        if (currentUser.status === 'ANONYMIZED') {
            throw new Error('userAnonymizeOtpRequest: already anonymized');
        }
        if (!currentUser.emailAddress) {
            throw new Error('userAnonymizeOtpRequest: user not found');
        }

        const email = currentUser.emailAddress;
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
                    eq(authEmailOtps.purpose, PURPOSE),
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
                return { success: true, referenceId: reusable.authEmailOtpId };
            }

            const code = authOtpCodeDecrypt(reusable.codeEncrypted);
            await serverRuntime.db
                .update(authEmailOtps)
                .set({ dismissedAt: null, lastSentAt: now, expiresAt: authOtpExpiresAt(now) })
                .where(eq(authEmailOtps.authEmailOtpId, reusable.authEmailOtpId));

            await serverRuntime.email.send({
                to: email,
                subject: accountDeleteOtpRequestForUserEmailSubject(locale),
                react: AccountDeleteOtpRequestForUserEmail({
                    code,
                    locale,
                    webPageUrl: environmentVariables.webPageUrl,
                    recipientFirstName: currentUser.firstName,
                }),
                purpose: 'ACCOUNT_DELETE_CONFIRM',
                locale,
                userId,
            });
            return { success: true, referenceId: reusable.authEmailOtpId };
        }

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
            purpose: PURPOSE,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .delete(authEmailOtps)
                .where(
                    and(
                        eq(authEmailOtps.sessionId, requestingSession.sessionId),
                        eq(authEmailOtps.purpose, PURPOSE),
                        isNull(authEmailOtps.consumedAt),
                    ),
                );
            await transaction.insert(authEmailOtps).values(authEmailOtpInsert);
        });

        await serverRuntime.email.send({
            to: email,
            subject: accountDeleteOtpRequestForUserEmailSubject(locale),
            react: AccountDeleteOtpRequestForUserEmail({
                code,
                locale,
                webPageUrl: environmentVariables.webPageUrl,
                recipientFirstName: currentUser.firstName,
            }),
            purpose: 'ACCOUNT_DELETE_CONFIRM',
            locale,
            userId,
        });

        return { success: true, referenceId: authEmailOtpId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
