import { and, eq, sql } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationBookingRequestOpenArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookBookingRequestMenuEvaluationSchedule } from '../utils/cookBookingRequestMenuEvaluationSchedule';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

/** Stamps `firstOpenedAt` when a cook opens a pool request; may schedule AI menu evaluation. */
export async function cookBookingRequestOpen(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOpenArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [bookingRequest] = await serverRuntime.db
            .select({ bookingRequestId: bookingRequests.bookingRequestId })
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('cookBookingRequestOpen: booking request not found');
        }

        const now = new Date();
        await serverRuntime.db
            .insert(bookingRequestCooks)
            .values({
                cookId,
                bookingRequestId: args.bookingRequestId,
                menuEvaluationLoading: false,
                firstOpenedAt: now,
            })
            .onConflictDoUpdate({
                target: [bookingRequestCooks.cookId, bookingRequestCooks.bookingRequestId],
                set: {
                    firstOpenedAt: sql`COALESCE(${bookingRequestCooks.firstOpenedAt}, ${now})`,
                },
            });

        const [details] = await serverRuntime.db
            .select({
                menuEvaluation: bookingRequestCooks.menuEvaluation,
                menuEvaluationLoading: bookingRequestCooks.menuEvaluationLoading,
            })
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)))
            .limit(1);

        const shouldScheduleEvaluation =
            details != null &&
            details.menuEvaluation == null &&
            !details.menuEvaluationLoading &&
            (await featureToggleIsEnabled('AI_MENU_EVALUATION', serverRuntime, cookId));

        if (shouldScheduleEvaluation) {
            await cookBookingRequestMenuEvaluationSchedule(serverRuntime, cookId, args.bookingRequestId);
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
