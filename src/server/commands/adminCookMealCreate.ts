import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MealCreate } from '../db/schema';
import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMealCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

const DRAFT_TITLE = 'Neues Gericht';

/** Admin create of a draft meal on a cook's inventory. */
export async function adminCookMealCreate(
    { adminId }: GqlSAdminMutation,
    { cookId, meal }: GqlSAdminMutationCookMealCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const titled = meal?.title != null ? textNormalizeTitled(meal.title) : '';
    const title = titled.length > 0 ? titled : DRAFT_TITLE;
    const description = meal?.description != null ? textNormalizeProseTitled(meal.description) : '';

    const mealId = idCreate();
    const values: MealCreate = {
        mealId,
        cookId,
        title,
        description,
        publishedAt: null,
        deletedAt: null,
    };

    try {
        await serverRuntime.db.insert(meals).values(values);
        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
