import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationCookCreateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookCreatePayloadBuild } from '../utils/cookCreatePayloadBuild';
import { cookInviteAttributionResolve } from '../utils/cookInviteAttributionResolve';
import { cookInviteRewardUnlock } from '../utils/cookInviteRewardUnlock';
import { cookPathNameAllocate } from '../utils/cookPathName';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function userCookCreate(
    { userId }: GqlSUserMutation,
    { input }: GqlSUserMutationCookCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);
    await userActiveStatusAssert(userId, serverRuntime, 'userCookCreate');

    try {
        const [user] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);
        if (!user) {
            throw new Error('userCookCreate: user not found');
        }

        const [existing] = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(eq(cooks.cookId, userId)).limit(1);
        if (existing) {
            throw new Error('userCookCreate: already a cook');
        }

        const cookPayload = await cookCreatePayloadBuild({
            input,
            sessionToken: requestingSession.sessionId,
            places: serverRuntime.places,
            errorPrefix: 'userCookCreate',
        });

        const attribution = await cookInviteAttributionResolve({
            inviteCookId: input.inviteCookId,
            inviteeUserId: userId,
            inviteeEmailAddress: user.emailAddress,
            inviteePhoneNumber: user.phoneNumber,
            db: serverRuntime.db,
        });

        const pathName = await cookPathNameAllocate(serverRuntime.db, user.firstName, user.lastName);
        await serverRuntime.db.insert(cooks).values({
            cookId: userId,
            pathName,
            ...cookPayload,
            ...(attribution ?? {}),
        });

        if (attribution?.inviteReward.unlockKind === 'SIGN_UP') {
            await cookInviteRewardUnlock(serverRuntime, { inviteeCookId: userId });
        }

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'COOK_CREATED',
            payload: {},
        });

        await serverRuntime.publish.userUpdates({ userId });
        if (attribution) {
            await serverRuntime.publish.userUpdates({ userId: attribution.invitedByCookId });
        }

        const { slackNotifyCookSignUp } = await import('../slack/slackNotifyAdjacent');
        await slackNotifyCookSignUp(serverRuntime, {
            userId,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.emailAddress ?? '',
            phoneNumber: user.phoneNumber ?? '',
            city: cookPayload.exactTravelOriginAddress?.city,
        });

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
