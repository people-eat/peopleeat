import { and, eq, isNull } from 'drizzle-orm';

import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MenuCourseCreate, MenuCourseMealOptionCreate } from '../db/schema';
import { menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMenuUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuMealIdsAssertOwned } from '../utils/cookMenuHydrate';
import { cookMenuOfferContextsLoad } from '../utils/cookMenuOfferContextsLoad';
import { menuCoursePayloadsBuild } from '../utils/menuCoursePayloadsBuild';

const OFFER_MENU_NEGOTIABLE_STATUSES = new Set(['USER_NEEDS_TO_ACCEPT', 'COOK_NEEDS_TO_ACCEPT']);

export async function cookMenuUpdate(
    { cookId }: GqlSCookMutation,
    { menuId, menu }: GqlSCookMutationMenuUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const hasTitle = menu.title !== undefined && menu.title !== null;
        const hasDescription = menu.description !== undefined && menu.description !== null;
        const hasPublishedAt = menu.publishedAt !== undefined;
        const hasCourses = menu.courses !== undefined && menu.courses !== null;

        if (!hasTitle && !hasDescription && !hasPublishedAt && !hasCourses) {
            throw new Error('cookMenuUpdate: at least one field is required');
        }

        const [existing] = await serverRuntime.db
            .select({
                menuId: menus.menuId,
                bookingRequestOfferId: menus.bookingRequestOfferId,
            })
            .from(menus)
            .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
            .limit(1);

        if (!existing) {
            throw new Error('cookMenuUpdate: menu not found');
        }

        const isOfferScoped = existing.bookingRequestOfferId != null;

        if (isOfferScoped && hasPublishedAt) {
            throw new Error('cookMenuUpdate: publishedAt is inventory-only');
        }

        if (isOfferScoped) {
            const contexts = await cookMenuOfferContextsLoad(serverRuntime.db, [existing.bookingRequestOfferId!]);
            const context = contexts.get(existing.bookingRequestOfferId!);
            if (context == null || !OFFER_MENU_NEGOTIABLE_STATUSES.has(context.status)) {
                throw new Error('cookMenuUpdate: offer menu is not editable');
            }
        }

        // Phase 1 — Payload construction
        const set: {
            title?: string;
            description?: string;
            publishedAt?: Date | null;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (hasTitle) {
            const title = textNormalizeTitled(menu.title!);
            if (title.length === 0) {
                throw new Error('cookMenuUpdate: title must not be empty');
            }
            set.title = title;
        }

        if (hasDescription) {
            set.description = textNormalizeProseTitled(menu.description!);
        }

        if (hasPublishedAt) {
            set.publishedAt =
                menu.publishedAt == null ? null : menu.publishedAt instanceof Date ? menu.publishedAt : new Date(menu.publishedAt);
            if (set.publishedAt != null && Number.isNaN(set.publishedAt.getTime())) {
                throw new Error('cookMenuUpdate: publishedAt is invalid');
            }
        }

        let courseInserts: MenuCourseCreate[] | undefined;
        let optionInserts: MenuCourseMealOptionCreate[] | undefined;

        if (hasCourses) {
            const mealIds = menu.courses!.flatMap((course) => course.mealIds);
            await cookMenuMealIdsAssertOwned(serverRuntime.db, cookId, mealIds, 'cookMenuUpdate');
            ({ courseInserts, optionInserts } = menuCoursePayloadsBuild(cookId, menuId, menu.courses!, 'cookMenuUpdate'));
        }

        // Phase 2 — Transactional execution
        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(menus)
                .set(set)
                .where(and(eq(menus.menuId, menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
                .returning({ menuId: menus.menuId });

            if (updated.length === 0) {
                throw new Error('cookMenuUpdate: menu not found');
            }

            if (courseInserts != null && optionInserts != null) {
                await transaction.delete(menuCourses).where(and(eq(menuCourses.menuId, menuId), eq(menuCourses.cookId, cookId)));
                await transaction.insert(menuCourses).values(courseInserts);
                if (optionInserts.length > 0) {
                    await transaction.insert(menuCourseMealOptions).values(optionInserts);
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
