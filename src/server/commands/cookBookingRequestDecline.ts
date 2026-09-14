import { and, eq } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCookRequestDecline } from '../slack/slackNotifyBooking';

export async function cookBookingRequestDecline(
    { cookId }: GqlSCookMutation,
    input: { bookingRequestId: string; reason: string },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const reason = input.reason.trim();
        if (!reason) {
            throw new Error('cookBookingRequestDecline: reason is required');
        }

        const [bookingRequest] = await serverRuntime.db
            .select({ bookingRequestId: bookingRequests.bookingRequestId })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, input.bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('cookBookingRequestDecline: booking request not found');
        }

        const now = new Date();
        const [existing] = await serverRuntime.db
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, input.bookingRequestId)))
            .limit(1);

        if (!existing) {
            await serverRuntime.db.insert(bookingRequestCooks).values({
                cookId,
                bookingRequestId: input.bookingRequestId,
                menuEvaluationLoading: false,
                declinedAt: now,
                declinationReason: reason,
            });
        } else {
            await serverRuntime.db
                .update(bookingRequestCooks)
                .set({
                    declinedAt: now,
                    declinationReason: reason,
                })
                .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, input.bookingRequestId)));
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);

        await slackNotifyCookRequestDecline(serverRuntime, {
            bookingRequestId: input.bookingRequestId,
            cookName: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
            reason,
        });

        return { success: true, referenceId: input.bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
