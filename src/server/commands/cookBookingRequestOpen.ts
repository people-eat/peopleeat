import { and, eq, sql } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationBookingRequestOpenArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCookTravelDistanceKmEnsure } from '../utils/bookingRequestCookTravelDistanceKmEnsure';
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
        const [[bookingRequest], [cook]] = await Promise.all([
            serverRuntime.db
                .select({
                    bookingRequestId: bookingRequests.bookingRequestId,
                    exactEventAddress: bookingRequests.exactEventAddress,
                })
                .from(bookingRequests)
                .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
                .limit(1),
            serverRuntime.db
                .select({ exactTravelOriginAddress: cooks.exactTravelOriginAddress })
                .from(cooks)
                .where(eq(cooks.cookId, cookId))
                .limit(1),
        ]);

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
                travelDistanceKm: bookingRequestCooks.travelDistanceKm,
            })
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)))
            .limit(1);

        const origin = cook?.exactTravelOriginAddress;
        if (origin) {
            await bookingRequestCookTravelDistanceKmEnsure(serverRuntime, {
                cookId,
                bookingRequestId: args.bookingRequestId,
                origin: { latitude: origin.latitude, longitude: origin.longitude },
                destination: {
                    latitude: bookingRequest.exactEventAddress.latitude,
                    longitude: bookingRequest.exactEventAddress.longitude,
                },
                existingTravelDistanceKm: details?.travelDistanceKm ?? null,
            });
        }

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
