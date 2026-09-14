import { and, eq, isNull } from 'drizzle-orm';

import { capitalizeFirstLetter } from '../../shared';
import type { MenuCourseCreate, MenuCourseMealOptionCreate } from '../db/schema';
import { menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMenuUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuMealIdsAssertOwned } from '../utils/cookMenuHydrate';
import { menuCoursePayloadsBuild } from '../utils/menuCoursePayloadsBuild';

/**
 * Admin patch of a cook menu (inventory or offer-scoped). Offer copies accept
 * title / description / courses only (`publishedAt` is inventory-only).
 */
export async function adminCookMenuUpdate(
    { adminId }: GqlSAdminMutation,
    { menuId, menu }: GqlSAdminMutationCookMenuUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const hasTitle = menu.title !== undefined && menu.title !== null;
        const hasDescription = menu.description !== undefined && menu.description !== null;
        const hasPublishedAt = menu.publishedAt !== undefined;
        const hasCourses = menu.courses !== undefined && menu.courses !== null;

        if (!hasTitle && !hasDescription && !hasPublishedAt && !hasCourses) {
            throw new Error('adminCookMenuUpdate: at least one field is required');
        }

        const [existing] = await serverRuntime.db
            .select({
                menuId: menus.menuId,
                cookId: menus.cookId,
                bookingRequestOfferId: menus.bookingRequestOfferId,
            })
            .from(menus)
            .where(and(eq(menus.menuId, menuId), isNull(menus.deletedAt)))
            .limit(1);

        if (!existing) {
            throw new Error('adminCookMenuUpdate: menu not found');
        }

        const { cookId } = existing;
        const isOfferScoped = existing.bookingRequestOfferId != null;

        if (isOfferScoped && hasPublishedAt) {
            throw new Error('adminCookMenuUpdate: publishedAt is inventory-only');
        }

        const set: {
            title?: string;
            description?: string;
            publishedAt?: Date | null;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (hasTitle) {
            const title = menu.title!.trim();
            if (title.length === 0) {
                throw new Error('adminCookMenuUpdate: title must not be empty');
            }
            set.title = capitalizeFirstLetter(title);
        }

        if (hasDescription) {
            const description = menu.description!.trim();
            set.description = description.length === 0 ? '' : capitalizeFirstLetter(description);
        }

        if (hasPublishedAt) {
            set.publishedAt =
                menu.publishedAt == null ? null : menu.publishedAt instanceof Date ? menu.publishedAt : new Date(menu.publishedAt);
            if (set.publishedAt != null && Number.isNaN(set.publishedAt.getTime())) {
                throw new Error('adminCookMenuUpdate: publishedAt is invalid');
            }
        }

        let courseInserts: MenuCourseCreate[] | undefined;
        let optionInserts: MenuCourseMealOptionCreate[] | undefined;

        if (hasCourses) {
            const mealIds = menu.courses!.flatMap((course) => course.mealIds);
            await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'adminCookMenuUpdate');
            ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'adminCookMenuUpdate'));
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(menus)
                .set(set)
                .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
                .returning({ menuId: menus.menuId });

            if (updated.length === 0) {
                throw new Error('adminCookMenuUpdate: menu not found');
            }

            if (courseInserts != null && optionInserts != null) {
                await transaction.delete(menuCourses).where(and(eq(menuCourses.menuId, menuId), eq(menuCourses.cookId, cookId)));
                await transaction.insert(menuCourses).values(courseInserts);
                if (optionInserts.length > 0) {
                    await transaction.insert(menuCourseMealOptions).values(optionInserts);
                }
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
