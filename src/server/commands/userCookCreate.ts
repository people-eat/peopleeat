import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationCookCreateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookCreatePayloadBuild } from '../utils/cookCreatePayloadBuild';

export async function userCookCreate(
    { userId }: GqlSUserMutation,
    { input }: GqlSUserMutationCookCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

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

        await serverRuntime.db.insert(cooks).values({ cookId: userId, ...cookPayload });
        await serverRuntime.publish.userUpdates({ userId });

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
