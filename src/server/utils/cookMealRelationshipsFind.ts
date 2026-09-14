import { and, eq, isNull, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, menuCourseMealOptions, menuCourses, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMealRelationships, GqlSSession } from '../graphql/generated';

/**
 * Where a meal is used (inventory menus vs offer-copied menus) and whether
 * soft-delete would leave any course with zero active meal options.
 * Fail-closed: on error return empty lists with deletion blocked.
 */
export async function cookMealRelationshipsFind(
    mealId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMealRelationships> {
    try {
        const rows = await serverRuntime.db
            .select({
                menuId: menus.menuId,
                menuTitle: menus.title,
                courseTitle: menuCourses.title,
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                bookingRequestUserName: users.firstName,
                bookingRequestDateTime: bookingRequests.dateTime,
                // Count only options whose meal is still active — matches
                // cookMenuHydrate omitting soft-deleted meals from courses.
                mealOptionCount: sql<number>`(
                    SELECT COUNT(*)::int
                    FROM "MenuCourseMealOptions" AS "opts"
                    INNER JOIN "Meals" AS "m" ON "m"."mealId" = "opts"."mealId"
                    WHERE "opts"."courseId" = ${menuCourses.courseId}
                      AND "m"."deletedAt" IS NULL
                )`.mapWith(Number),
            })
            .from(menuCourseMealOptions)
            .innerJoin(menuCourses, eq(menuCourses.courseId, menuCourseMealOptions.courseId))
            .innerJoin(menus, eq(menus.menuId, menuCourses.menuId))
            .leftJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, menus.bookingRequestOfferId))
            .leftJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .leftJoin(users, eq(users.userId, bookingRequests.userId))
            .where(and(eq(menuCourseMealOptions.mealId, mealId), isNull(menus.deletedAt)));

        const menuRelationships: GqlSCookMealRelationships['menus'] = [];
        const offerRelationships: GqlSCookMealRelationships['offers'] = [];

        for (const row of rows) {
            const blocksDeletion = row.mealOptionCount === 1;

            if (row.bookingRequestOfferId != null && row.bookingRequestUserName != null && row.bookingRequestDateTime != null) {
                offerRelationships.push({
                    bookingRequestOfferId: row.bookingRequestOfferId,
                    bookingRequestUserName: row.bookingRequestUserName,
                    bookingRequestDateTime: row.bookingRequestDateTime,
                    menuTitle: row.menuTitle,
                    courseTitle: row.courseTitle,
                    blocksDeletion,
                });
            } else {
                menuRelationships.push({
                    menuId: row.menuId,
                    menuTitle: row.menuTitle,
                    courseTitle: row.courseTitle,
                    blocksDeletion,
                });
            }
        }

        return {
            menus: menuRelationships,
            offers: offerRelationships,
            deletionBlockedByRelationships:
                menuRelationships.some((relationship) => relationship.blocksDeletion) ||
                offerRelationships.some((relationship) => relationship.blocksDeletion),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return {
            menus: [],
            offers: [],
            deletionBlockedByRelationships: true,
        };
    }
}
