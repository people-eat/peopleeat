import { and, eq, inArray, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferSuggestedMenusUpdated } from '../slack/slackNotifyBooking';
import { cookBookingRequestOfferSuggestedMenusUpdateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { bookingRequestReactionReminderSchedule } from '../utils/bookingRequestReactionReminderSchedule';
import { menuDeepCopyInsert } from '../utils/menuDeepCopyInsert';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

function stringArrayDiff(before: string[], after: string[]): { added: string[]; removed: string[] } {
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    return {
        added: [...afterSet].filter((id) => !beforeSet.has(id)),
        removed: [...beforeSet].filter((id) => !afterSet.has(id)),
    };
}

export async function cookBookingRequestOfferSuggestedMenusUpdate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferSuggestedMenusUpdate');

    const { bookingRequestOfferId, suggestedMenuIds } = args.input;
    const uniqueMenuIds = [...new Set(suggestedMenuIds)];

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferSuggestedMenusUpdate: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        if (uniqueMenuIds.length > 0) {
            const inventoryMenus = await serverRuntime.db
                .select({ menuId: menus.menuId, title: menus.title })
                .from(menus)
                .where(
                    and(
                        eq(menus.cookId, cookId),
                        isNull(menus.deletedAt),
                        isNull(menus.bookingRequestOfferId),
                        inArray(menus.menuId, uniqueMenuIds),
                    ),
                );
            if (inventoryMenus.length !== uniqueMenuIds.length) {
                throw new Error('cookBookingRequestOfferSuggestedMenusUpdate: one or more menus not found');
            }
        }

        const oldSuggestedMenus = await serverRuntime.db
            .select()
            .from(menus)
            .where(and(eq(menus.bookingRequestOfferId, bookingRequestOfferId), isNull(menus.deletedAt)));

        const oldSourceIds = oldSuggestedMenus
            .map((menu) => menu.copyOfMenuId)
            .filter((copyOfMenuId): copyOfMenuId is string => copyOfMenuId != null);

        const { added, removed } = stringArrayDiff(oldSourceIds, uniqueMenuIds);

        const menuTitlesAfter =
            uniqueMenuIds.length === 0
                ? []
                : (await serverRuntime.db.select({ title: menus.title }).from(menus).where(inArray(menus.menuId, uniqueMenuIds))).map(
                      (menu) => menu.title,
                  );

        await serverRuntime.db.transaction(async (transaction) => {
            for (const removedMenuId of removed) {
                await transaction
                    .delete(menus)
                    .where(and(eq(menus.bookingRequestOfferId, bookingRequestOfferId), eq(menus.copyOfMenuId, removedMenuId)));
            }

            for (const sourceMenuId of added) {
                await menuDeepCopyInsert(transaction, {
                    cookId,
                    sourceMenuId,
                    bookingRequestOfferId,
                });
            }

            await transaction
                .update(bookingRequestOffers)
                .set({
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                    userRequestedMenuAdjustments: false,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_UPDATED_SUGGESTED_MENU',
                payload: {
                    menuTitlesBefore: oldSuggestedMenus.map((menu) => menu.title),
                    menuTitlesAfter,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        await cookBookingRequestOfferSuggestedMenusUpdateEmailSend(serverRuntime, {
            bookingRequestOfferId,
            bookingRequestId: row.bookingRequest.bookingRequestId,
            customerUserId: row.bookingRequest.userId,
            cookId,
        });

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);

        await slackNotifyOfferSuggestedMenusUpdated(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            cookName: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
        });

        await bookingRequestReactionReminderSchedule(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
