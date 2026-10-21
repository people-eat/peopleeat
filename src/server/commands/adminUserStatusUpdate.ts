import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { UserStatus } from '../domain/user';
import type { GqlSAdminMutation, GqlSAdminMutationUserStatusUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import {
    bookingRequestOfferPendingCallSlotsClose,
    bookingRequestOfferPendingCallSlotsCompleteJobsCancel,
} from '../utils/bookingRequestOfferPendingCallSlotsClose';

const BAN_DECLINATION_REASON = 'Nutzer wurde gesperrt';

/**
 * Admin ban / unban (`ACTIVE` ↔ `BANNED`). On ban, open cook offers are
 * auto-declined. Sessions stay bound so the profile restriction banner can
 * appear live via `userUpdates`. See docs/features/admin-users.md.
 */
export async function adminUserStatusUpdate(
    { adminId }: GqlSAdminMutation,
    { userId, status }: GqlSAdminMutationUserStatusUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    if (status !== 'ACTIVE' && status !== 'BANNED') {
        throw new Error('adminUserStatusUpdate: status must be ACTIVE or BANNED');
    }

    try {
        const [target] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);
        if (!target) {
            throw new Error('adminUserStatusUpdate: user not found');
        }
        if (target.status === 'ANONYMIZED') {
            throw new Error('adminUserStatusUpdate: user is anonymized');
        }

        const nextStatus: UserStatus = status;
        if (target.status === nextStatus) {
            return { success: true, referenceId: userId };
        }

        const affectedCustomerIds = new Set<string>();
        const now = new Date();

        const closedCallSlotBookingIds = await serverRuntime.db.transaction(async (transaction) => {
            await transaction.update(users).set({ status: nextStatus }).where(eq(users.userId, userId));

            if (nextStatus !== 'BANNED') {
                return [] as string[];
            }

            const openOffers = await transaction
                .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
                .from(bookingRequestOffers)
                .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
                .where(
                    and(
                        eq(bookingRequestOffers.cookId, userId),
                        or(isNull(bookingRequestOffers.cookAccepted), eq(bookingRequestOffers.cookAccepted, true)),
                        or(isNull(bookingRequestOffers.userAccepted), eq(bookingRequestOffers.userAccepted, true)),
                        sql`NOT (${bookingRequestOffers.cookAccepted} IS TRUE AND ${bookingRequestOffers.userAccepted} IS TRUE)`,
                    ),
                );

            const closedSlotIds: string[] = [];

            for (const row of openOffers) {
                bookingRequestOfferNegotiationAssert(row.offer);

                await transaction
                    .update(bookingRequestOffers)
                    .set({
                        cookAccepted: false,
                        cookDeclinationReason: BAN_DECLINATION_REASON,
                        userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                    })
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, row.offer.bookingRequestOfferId));

                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId: row.offer.bookingRequestOfferId,
                    type: 'COOK_DECLINED',
                    payload: {},
                });

                const slotIds = await bookingRequestOfferPendingCallSlotsClose(transaction, {
                    bookingRequestOfferIds: [row.offer.bookingRequestOfferId],
                    reason: { kind: 'OFFER_DECLINED', declinedBy: 'COOK' },
                    now,
                });
                closedSlotIds.push(...slotIds);

                affectedCustomerIds.add(row.bookingRequest.userId);
            }

            return closedSlotIds;
        });

        await bookingRequestOfferPendingCallSlotsCompleteJobsCancel(serverRuntime, closedCallSlotBookingIds);

        const publishJobs: Array<Promise<unknown>> = [serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.adminUpdates()];
        for (const customerId of affectedCustomerIds) {
            publishJobs.push(serverRuntime.publish.userUpdates({ userId: customerId }));
        }
        await Promise.all(publishJobs);

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
