import { eq } from 'drizzle-orm';

import { cookMenuDefaultCourseTitles, cookMenuDraftTitle, DEFAULT_LOCALE } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { Locale } from '../../shared/locale';
import type { MenuCourseCreate, MenuCreate } from '../db/schema';
import { menuCourses, menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookMenuCreate(
    { cookId }: GqlSCookMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const [cookUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, cookId)).limit(1);
    const locale: Locale = cookUser?.locale === 'en' ? 'en' : DEFAULT_LOCALE;

    // Phase 1 — Payload construction
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

    // Phase 2 — Transactional execution
    try {
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(menus).values(menuInsert);
            await transaction.insert(menuCourses).values(courseInserts);
        });
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
