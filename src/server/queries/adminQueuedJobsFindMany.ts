import { eq, inArray } from 'drizzle-orm';

import { bookingRequestOfferCallRooms, bookingRequestOffers, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminQueuedJob, GqlSSession } from '../graphql/generated';
import { jobDefinitions } from '../jobs/jobDefinitions';
import type { QueuedJobDefinition } from '../jobs/types';
import { toGqlAdminQueuedJob } from '../mappers/toGqlAdminQueuedJob';

function sortByStartAfter(jobs: GqlSAdminQueuedJob[]): GqlSAdminQueuedJob[] {
    return [...jobs].sort((a, b) => a.startAfter.getTime() - b.startAfter.getTime());
}

function stringIdFromData(data: unknown, key: string): string | null {
    if (!data || typeof data !== 'object') return null;
    const value = (data as Record<string, unknown>)[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Live pending pg-boss jobs across every queued definition (`created` | `retry`),
 * sorted by due time. Resolves offer / slot / room payloads to booking-request
 * deep-link ids when the job payload omits them.
 */
export async function adminQueuedJobsFindMany(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdminQueuedJob[]> {
    try {
        const queuedDefinitions = jobDefinitions.filter((definition): definition is QueuedJobDefinition => definition.kind === 'queued');

        const batches = await Promise.all(queuedDefinitions.map((definition) => serverRuntime.jobs.findByData(definition, {})));

        const mapped = batches
            .flat()
            .map(toGqlAdminQueuedJob)
            .filter((job): job is GqlSAdminQueuedJob => job != null);

        const offerIdsNeedingRequest = new Set<string>();
        const slotIds = new Set<string>();
        const roomIds = new Set<string>();

        for (const job of mapped) {
            if (job.bookingRequestOfferId && !job.bookingRequestId) {
                offerIdsNeedingRequest.add(job.bookingRequestOfferId);
            }
            const slotId = stringIdFromData(job.data, 'cookCallSlotBookingId');
            if (slotId && (!job.bookingRequestId || !job.bookingRequestOfferId)) {
                slotIds.add(slotId);
            }
            const roomId = stringIdFromData(job.data, 'bookingRequestOfferCallRoomId');
            if (roomId && (!job.bookingRequestId || !job.bookingRequestOfferId)) {
                roomIds.add(roomId);
            }
        }

        const [offerRows, slotRows, roomRows] = await Promise.all([
            offerIdsNeedingRequest.size > 0
                ? serverRuntime.db
                      .select({
                          bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                          bookingRequestId: bookingRequestOffers.bookingRequestId,
                      })
                      .from(bookingRequestOffers)
                      .where(inArray(bookingRequestOffers.bookingRequestOfferId, [...offerIdsNeedingRequest]))
                : Promise.resolve([]),
            slotIds.size > 0
                ? serverRuntime.db
                      .select({
                          cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId,
                          bookingRequestOfferId: cookCallSlotBookings.bookingRequestOfferId,
                          bookingRequestId: bookingRequestOffers.bookingRequestId,
                      })
                      .from(cookCallSlotBookings)
                      .innerJoin(
                          bookingRequestOffers,
                          eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId),
                      )
                      .where(inArray(cookCallSlotBookings.cookCallSlotBookingId, [...slotIds]))
                : Promise.resolve([]),
            roomIds.size > 0
                ? serverRuntime.db
                      .select({
                          bookingRequestOfferCallRoomId: bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId,
                          bookingRequestOfferId: bookingRequestOfferCallRooms.bookingRequestOfferId,
                          bookingRequestId: bookingRequestOffers.bookingRequestId,
                      })
                      .from(bookingRequestOfferCallRooms)
                      .innerJoin(
                          bookingRequestOffers,
                          eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId),
                      )
                      .where(inArray(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, [...roomIds]))
                : Promise.resolve([]),
        ]);

        const offerToRequest = new Map(offerRows.map((row) => [row.bookingRequestOfferId, row.bookingRequestId]));
        const slotToRelated = new Map(
            slotRows.map((row) => [
                row.cookCallSlotBookingId,
                { bookingRequestOfferId: row.bookingRequestOfferId, bookingRequestId: row.bookingRequestId },
            ]),
        );
        const roomToRelated = new Map(
            roomRows.map((row) => [
                row.bookingRequestOfferCallRoomId,
                { bookingRequestOfferId: row.bookingRequestOfferId, bookingRequestId: row.bookingRequestId },
            ]),
        );

        const enriched = mapped.map((job) => {
            let bookingRequestId = job.bookingRequestId;
            let bookingRequestOfferId = job.bookingRequestOfferId;

            if (bookingRequestOfferId && !bookingRequestId) {
                bookingRequestId = offerToRequest.get(bookingRequestOfferId) ?? bookingRequestId;
            }

            const slotId = stringIdFromData(job.data, 'cookCallSlotBookingId');
            if (slotId) {
                const related = slotToRelated.get(slotId);
                if (related) {
                    bookingRequestOfferId ??= related.bookingRequestOfferId;
                    bookingRequestId ??= related.bookingRequestId;
                }
            }

            const roomId = stringIdFromData(job.data, 'bookingRequestOfferCallRoomId');
            if (roomId) {
                const related = roomToRelated.get(roomId);
                if (related) {
                    bookingRequestOfferId ??= related.bookingRequestOfferId;
                    bookingRequestId ??= related.bookingRequestId;
                }
            }

            if (bookingRequestId === job.bookingRequestId && bookingRequestOfferId === job.bookingRequestOfferId) {
                return job;
            }

            return { ...job, bookingRequestId, bookingRequestOfferId };
        });

        return sortByStartAfter(enriched);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
