import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { phoneNumberAssert } from '../../shared/phoneNumber';
import { textNormalizeTitled } from '../../shared/textNormalize';
import { userBirthDateAssertMinimumAge } from '../../shared/userBirthDate';
import type { UserCreate } from '../db/schema';
import { authEmailOtps, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSMutationUserCreateArgs, GqlSSession } from '../graphql/generated';
import { userKlaviyoProfileSync } from '../jobs/handlers/userKlaviyoProfileSync';
import { cookCreatePayloadBuild } from '../utils/cookCreatePayloadBuild';
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
            const [otp] = await transaction
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

            if (!otp || otp.expiresAt.getTime() <= now.getTime()) {
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
                .where(eq(users.emailAddress, otp.emailAddress))
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
            const userInsert: UserCreate = {
                userId: newUserId,
                emailAddress: otp.emailAddress,
                firstName,
                lastName,
                phoneNumber,
                birthDate,
                preferredCommunication,
                locale: args.input.locale,
                timeZone: args.input.timeZone,
                lastAcceptedPrivacyPolicy: now,
                lastAcceptedTerms: now,
            };

            await transaction.insert(users).values(userInsert);
            if (cookPayload) {
                await transaction.insert(cooks).values({ cookId: newUserId, ...cookPayload });
            }
            await outboundEmailsUserIdBackfillByToEmail(transaction, {
                toEmail: otp.emailAddress,
                userId: newUserId,
            });
            await transaction.update(authEmailOtps).set({ consumedAt: now }).where(eq(authEmailOtps.authEmailOtpId, otp.authEmailOtpId));

            return { userId: newUserId, emailAddress: otp.emailAddress };
        });

        await sessionUserBind(requestingSession.sessionId, created.userId, requestingSession, serverRuntime);
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'USER_CREATE_SUCCESSFUL',
            payload: {},
        });

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
