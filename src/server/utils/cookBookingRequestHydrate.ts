import { inArray } from 'drizzle-orm';

import { geoDistance } from '../../shared/geoDistance';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { BookingRequest, BookingRequestCook, Cook } from '../db/schema';
import { bookingRequestParticipants, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookBookingRequest } from '../graphql/generated';
import { toGqlBookingRequestCookMenuEvaluation } from '../mappers/toGqlBookingRequestCookMenuEvaluation';
import { toGqlCookBookingRequest } from '../mappers/toGqlCookBookingRequest';
import { publicUsersByIdFindMany } from './publicUserHydrate';

type CookBookingRequestVisibleRow = {
    bookingRequest: BookingRequest;
    details: BookingRequestCook | null;
};

/** Batch-load nested cook booking-request fields (participants, public user, travel estimates). */
export async function cookBookingRequestHydrate(
    cook: Cook,
    visible: CookBookingRequestVisibleRow[],
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequest[]> {
    if (visible.length === 0) return [];

    const bookingRequestIds = visible.map((row) => row.bookingRequest.bookingRequestId);
    const promoCodeIds = [...new Set(visible.map((row) => row.bookingRequest.promoCodeId).filter((id): id is string => id != null))];

    const [participants, promoRows] = await Promise.all([
        serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(inArray(bookingRequestParticipants.bookingRequestId, bookingRequestIds)),
        promoCodeIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db
                  .select({
                      promoCodeId: promoCodes.promoCodeId,
                      minimumTotalAmountCustomerCents: promoCodes.minimumTotalAmountCustomerCents,
                  })
                  .from(promoCodes)
                  .where(inArray(promoCodes.promoCodeId, promoCodeIds)),
    ]);

    const participantsByRequest = new Map<string, typeof participants>();
    for (const participant of participants) {
        const list = participantsByRequest.get(participant.bookingRequestId) ?? [];
        list.push(participant);
        participantsByRequest.set(participant.bookingRequestId, list);
    }

    const promoMinById = new Map(promoRows.map((row) => [row.promoCodeId, row.minimumTotalAmountCustomerCents ?? null] as const));

    const publicUsers = await publicUsersByIdFindMany(
        serverRuntime.db,
        visible.map((row) => row.bookingRequest.userId),
    );

    return visible.flatMap(({ bookingRequest, details }) => {
        const user = publicUsers.get(bookingRequest.userId);
        if (!user) return [];

        const origin = cook.exactTravelOriginAddress;
        const event = bookingRequest.exactEventAddress;
        const estimatedTravelDistanceKm = origin
            ? geoDistance(
                  { latitude: origin.latitude, longitude: origin.longitude },
                  { latitude: event.latitude, longitude: event.longitude },
              )
            : null;
        const estimatedTravelExpensesCents =
            estimatedTravelDistanceKm != null ? Math.round(estimatedTravelDistanceKm * cook.travelExpensesAmount * 2) : null;

        return [
            toGqlCookBookingRequest({
                bookingRequest,
                participants: participantsByRequest.get(bookingRequest.bookingRequestId) ?? [],
                offers: [],
                locale: DEFAULT_LOCALE,
                user,
                estimatedTravelDistanceKm,
                estimatedTravelExpensesCents,
                promoMinimumTotalAmountCustomerCents: bookingRequest.promoCodeId
                    ? (promoMinById.get(bookingRequest.promoCodeId) ?? null)
                    : null,
                cookPoolDetails: details
                    ? {
                          declinedAt: details.declinedAt ?? null,
                          declinationReason: details.declinationReason ?? null,
                          notifiedAt: details.notifiedAt ?? null,
                          firstOpenedAt: details.firstOpenedAt ?? null,
                          menuEvaluationLoading: details.menuEvaluationLoading,
                          menuEvaluation: details.menuEvaluation ? toGqlBookingRequestCookMenuEvaluation(details.menuEvaluation) : null,
                      }
                    : null,
            }),
        ];
    });
}
