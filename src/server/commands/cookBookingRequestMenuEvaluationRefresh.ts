import { and, eq } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookBookingRequestMenuEvaluationSchedule } from '../utils/cookBookingRequestMenuEvaluationSchedule';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

/** Explicit re-run of AI menu evaluation + inventory generation (lazy refresh). */
export async function cookBookingRequestMenuEvaluationRefresh(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const enabled = await featureToggleIsEnabled('AI_MENU_EVALUATION', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('cookBookingRequestMenuEvaluationRefresh: AI_MENU_EVALUATION is disabled');
        }

        const [bookingRequest] = await serverRuntime.db
            .select({ bookingRequestId: bookingRequests.bookingRequestId })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('cookBookingRequestMenuEvaluationRefresh: booking request not found');
        }

        const [details] = await serverRuntime.db
            .select({ cookId: bookingRequestCooks.cookId })
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)))
            .limit(1);

        if (!details) {
            throw new Error('cookBookingRequestMenuEvaluationRefresh: pool details not found');
        }

        await cookBookingRequestMenuEvaluationSchedule(serverRuntime, cookId, args.bookingRequestId);
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
