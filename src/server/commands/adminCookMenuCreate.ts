import { eq } from 'drizzle-orm';

import { cookMenuDefaultCourseTitles, cookMenuDraftTitle, DEFAULT_LOCALE } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import type { MenuCourseCreate, MenuCreate } from '../db/schema';
import { menuCourses, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMenuCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/** Admin create of a draft menu (3 empty courses) on a cook's inventory. */
export async function adminCookMenuCreate(
    { adminId }: GqlSAdminMutation,
    { cookId }: GqlSAdminMutationCookMenuCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
    const locale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;

    const menuId = idCreate();
    const menuInsert: MenuCreate = {
        menuId,
        cookId,
        title: cookMenuDraftTitle(locale),
        description: '',
        publishedAt: null,
        deletedAt: null,
    };
    const courseInserts: MenuCourseCreate[] = cookMenuDefaultCourseTitles(locale).map((title, index) => ({
        courseId: idCreate(),
        menuId,
        cookId,
        index,
        title,
        mealSelectionLimit: null,
    }));

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(menus).values(menuInsert);
            await transaction.insert(menuCourses).values(courseInserts);
        });
        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
