import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { phoneNumberAssert } from '../../shared/phoneNumber';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { userBirthDateAssertMinimumAge } from '../../shared/userBirthDate';
import type { UserCreate } from '../db/schema';
import { authEmailOtps, authOauthIdentities, authOauthTickets, cooks, fileUploads, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSMutationUserCreateArgs, GqlSSession } from '../graphql/generated';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';
import { cookCreatePayloadBuild } from '../utils/cookCreatePayloadBuild';
import { cookInviteAttributionResolve } from '../utils/cookInviteAttributionResolve';
import { cookInviteRewardUnlock } from '../utils/cookInviteRewardUnlock';
import { cookPathNameAllocate } from '../utils/cookPathName';
import { outboundEmailsUserIdBackfillByToEmail } from '../utils/outboundEmailsUserIdBackfillByToEmail';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionUserBind } from './sessionUserBind';

export async function userCreate(
    args: GqlSMutationUserCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    if (requestingSession.userId) {
        throw new Error('userCreate: already signed in');
    }

    const firstName = textNormalizeTitled(args.input.firstName);
    const lastName = textNormalizeTitled(args.input.lastName);
    const phoneNumberInput = args.input.phoneNumber;
    const phoneNumber =
        phoneNumberInput === undefined || phoneNumberInput === null ? null : phoneNumberAssert(phoneNumberInput, 'userCreate');
    const birthDate = args.input.birthDate ?? null;
    const preferredCommunication = args.input.preferredCommunication ?? null;
    const cookInput = args.input.cook;

    if (firstName.length === 0) {
        throw new Error('userCreate: firstName must not be empty');
    }
    if (lastName.length === 0) {
        throw new Error('userCreate: lastName must not be empty');
    }
    if (birthDate) {
        userBirthDateAssertMinimumAge(birthDate, 'userCreate');
    }

    const now = new Date();

    try {
        const cookPayload = cookInput
            ? await cookCreatePayloadBuild({
                  input: cookInput,
                  sessionToken: requestingSession.sessionId,
                  places: serverRuntime.places,
                  errorPrefix: 'userCreate',
              })
            : undefined;

        const created = await serverRuntime.db.transaction(async (transaction) => {
            const [oauthTicket] = await transaction
                .select()
                .from(authOauthTickets)
                .where(and(eq(authOauthTickets.sessionId, requestingSession.sessionId), isNull(authOauthTickets.consumedAt)))
                .orderBy(desc(authOauthTickets.createdAt))
                .limit(1);

            const oauthTicketValid = oauthTicket && oauthTicket.expiresAt.getTime() > now.getTime();

            const [otp] = oauthTicketValid
                ? [undefined]
                : await transaction
                      .select()
                      .from(authEmailOtps)
                      .where(
                          and(
                              eq(authEmailOtps.sessionId, requestingSession.sessionId),
                              isNull(authEmailOtps.consumedAt),
                              isNotNull(authEmailOtps.verifiedAt),
                          ),
                      )
                      .orderBy(desc(authEmailOtps.createdAt))
                      .limit(1);

            const emailAddress = oauthTicketValid ? oauthTicket.emailAddress : otp?.emailAddress;
            if (!emailAddress || (!oauthTicketValid && (!otp || otp.expiresAt.getTime() <= now.getTime()))) {
                await sessionEventCreate(serverRuntime, {
                    sessionId: requestingSession.sessionId,
                    type: 'USER_CREATE_FAILED',
                    payload: {},
                });
                throw new Error('userCreate: verified email required');
            }

            const [existingEmail] = await transaction
                .select({ userId: users.userId })
                .from(users)
                .where(eq(users.emailAddress, emailAddress))
                .limit(1);
            if (existingEmail) {
                await sessionEventCreate(serverRuntime, {
                    sessionId: requestingSession.sessionId,
                    type: 'USER_CREATE_USER_WITH_EMAIL_ADDRESS_ALREADY_EXISTS',
                    payload: {},
                });
                throw new Error('userCreate: email already registered');
            }

            if (phoneNumber) {
                const [existingPhone] = await transaction
                    .select({ userId: users.userId })
                    .from(users)
                    .where(eq(users.phoneNumber, phoneNumber))
                    .limit(1);
                if (existingPhone) {
                    await sessionEventCreate(serverRuntime, {
                        sessionId: requestingSession.sessionId,
                        type: 'USER_CREATE_FAILED',
                        payload: {},
                    });
                    throw new Error('userCreate: phoneNumber already registered');
                }
            }

            const newUserId = idCreate();
            const profilePictureFileUploadId = oauthTicketValid ? (oauthTicket.profilePictureFileUploadId ?? null) : null;
            const userInsert: UserCreate = {
                userId: newUserId,
                emailAddress,
                firstName,
                lastName,
                phoneNumber,
                birthDate,
                preferredCommunication,
                locale: args.input.locale,
                timeZone: args.input.timeZone,
                lastAcceptedPrivacyPolicy: now,
                lastAcceptedTerms: now,
                ...(profilePictureFileUploadId ? { profilePictureFileUploadId } : {}),
            };

            await transaction.insert(users).values(userInsert);
            if (profilePictureFileUploadId) {
                await transaction
                    .update(fileUploads)
                    .set({ userId: newUserId })
                    .where(eq(fileUploads.fileUploadId, profilePictureFileUploadId));
            }
            let invitedByCookId: string | undefined;
            let inviteUnlockSignUp = false;
            if (cookPayload && cookInput) {
                const attribution = await cookInviteAttributionResolve({
                    inviteCookId: cookInput.inviteCookId,
                    inviteeUserId: newUserId,
                    inviteeEmailAddress: emailAddress,
                    inviteePhoneNumber: phoneNumber,
                    db: transaction as unknown as ServerRuntime['db'],
                });
                invitedByCookId = attribution?.invitedByCookId;
                inviteUnlockSignUp = attribution?.inviteReward.unlockKind === 'SIGN_UP';
                const pathName = await cookPathNameAllocate(transaction, firstName, lastName);
                await transaction.insert(cooks).values({
                    cookId: newUserId,
                    pathName,
                    ...cookPayload,
                    ...(attribution ?? {}),
                });
            }
            await outboundEmailsUserIdBackfillByToEmail(transaction, {
                toEmail: emailAddress,
                userId: newUserId,
            });
            if (oauthTicketValid) {
                const consumed = await transaction
                    .update(authOauthTickets)
                    .set({ consumedAt: now })
                    .where(and(eq(authOauthTickets.authOauthTicketId, oauthTicket.authOauthTicketId), isNull(authOauthTickets.consumedAt)))
                    .returning({ authOauthTicketId: authOauthTickets.authOauthTicketId });
                if (consumed.length === 0) {
                    throw new Error('userCreate: verified email required');
                }
                await transaction.insert(authOauthIdentities).values({
                    authOauthIdentityId: idCreate(),
                    userId: newUserId,
                    provider: oauthTicket.provider,
                    subject: oauthTicket.subject,
                });
            } else if (otp) {
                await transaction
                    .update(authEmailOtps)
                    .set({ consumedAt: now })
                    .where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));
            }

            return {
                userId: newUserId,
                emailAddress,
                oauthProvider: oauthTicketValid ? oauthTicket.provider : null,
                cookCreated: Boolean(cookPayload),
                invitedByCookId,
                inviteUnlockSignUp,
            };
        });

        await sessionUserBind(requestingSession.sessionId, created.userId, requestingSession, serverRuntime);
        if (created.cookCreated && created.inviteUnlockSignUp) {
            await cookInviteRewardUnlock(serverRuntime, { inviteeCookId: created.userId });
        }
        if (created.invitedByCookId) {
            await serverRuntime.publish.userUpdates({ userId: created.invitedByCookId });
        }
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'USER_CREATE_SUCCESSFUL',
            payload: {},
        });
        if (created.oauthProvider) {
            await sessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                type: 'AUTH_OAUTH_ACCOUNT_CREATED',
                payload: { provider: created.oauthProvider },
            });
        }

        try {
            await serverRuntime.jobs.enqueue(userKlaviyoProfileSync, { userId: created.userId });
        } catch (enqueueError) {
            serverRuntime.log.error(enqueueError, requestingSession);
        }

        if (cookPayload) {
            const { slackNotifyCookSignUp } = await import('../slack/slackNotifyAdjacent');
            await slackNotifyCookSignUp(serverRuntime, {
                userId: created.userId,
                firstName,
                lastName,
                emailAddress: created.emailAddress,
                phoneNumber,
                city: cookPayload.exactTravelOriginAddress?.city,
            });
        } else {
            const { slackNotifyCustomerSignUp } = await import('../slack/slackNotifyAdjacent');
            await slackNotifyCustomerSignUp(serverRuntime, {
                userId: created.userId,
                firstName,
                lastName,
                emailAddress: created.emailAddress,
                phoneNumber,
            });
        }

        return { success: true, referenceId: created.userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
