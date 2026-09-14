import { and, eq, inArray, isNull } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { MenuCourseCreate, MenuCourseMealOptionCreate } from '../db/schema';
import { menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMenuSyncToTemplateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/**
 * Overwrite the inventory template (`copyOfMenuId`) with an offer-scoped copy's
 * title, description, and course tree. Returns the template menuId.
 */
export async function cookMenuSyncToTemplate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuSyncToTemplateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [source] = await serverRuntime.db
            .select()
            .from(menus)
            .where(and(eq(menus.menuId, args.menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt)))
            .limit(1);

        if (!source || source.bookingRequestOfferId == null) {
            throw new Error('cookMenuSyncToTemplate: offer menu not found');
        }

        if (source.copyOfMenuId == null) {
            throw new Error('cookMenuSyncToTemplate: no template linked');
        }

        const templateMenuId = source.copyOfMenuId;

        const [template] = await serverRuntime.db
            .select({ menuId: menus.menuId })
            .from(menus)
            .where(
                and(
                    eq(menus.menuId, templateMenuId),
                    eq(menus.cookId, cookId),
                    isNull(menus.deletedAt),
                    isNull(menus.bookingRequestOfferId),
                ),
            )
            .limit(1);

        if (!template) {
            throw new Error('cookMenuSyncToTemplate: template not found');
        }

        // Phase 1 — Build replacement course tree from the offer copy
        const sourceCourses = await serverRuntime.db
            .select()
            .from(menuCourses)
            .where(and(eq(menuCourses.menuId, source.menuId), eq(menuCourses.cookId, cookId)));

        const sourceCourseIds = sourceCourses.map((course) => course.courseId);
        const sourceOptions =
            sourceCourseIds.length === 0
                ? []
                : await serverRuntime.db
                      .select()
                      .from(menuCourseMealOptions)
                      .where(and(eq(menuCourseMealOptions.cookId, cookId), inArray(menuCourseMealOptions.courseId, sourceCourseIds)));

        const optionsByCourseId = new Map<string, typeof sourceOptions>();
        for (const option of sourceOptions) {
            const list = optionsByCourseId.get(option.courseId) ?? [];
            list.push(option);
            optionsByCourseId.set(option.courseId, list);
        }

        const courseInserts: MenuCourseCreate[] = [];
        const optionInserts: MenuCourseMealOptionCreate[] = [];

        for (const course of sourceCourses) {
            const courseId = idCreate();
            courseInserts.push({
                courseId,
                menuId: templateMenuId,
                cookId,
                index: course.index,
                title: course.title,
                mealSelectionLimit: course.mealSelectionLimit,
            });
            for (const option of optionsByCourseId.get(course.courseId) ?? []) {
                optionInserts.push({
                    mealOptionId: idCreate(),
                    courseId,
                    cookId,
                    mealId: option.mealId,
                    index: option.index,
                });
            }
        }

        // Phase 2 — Replace template content
        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(menus)
                .set({
                    title: source.title,
                    description: source.description,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(menus.menuId, templateMenuId),
                        eq(menus.cookId, cookId),
                        isNull(menus.deletedAt),
                        isNull(menus.bookingRequestOfferId),
                    ),
                )
                .returning({ menuId: menus.menuId });

            if (updated.length === 0) {
                throw new Error('cookMenuSyncToTemplate: template not found');
            }

            await transaction.delete(menuCourses).where(and(eq(menuCourses.menuId, templateMenuId), eq(menuCourses.cookId, cookId)));

            if (courseInserts.length > 0) {
                await transaction.insert(menuCourses).values(courseInserts);
            }
            if (optionInserts.length > 0) {
                await transaction.insert(menuCourseMealOptions).values(optionInserts);
            }
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: templateMenuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
