import { tool } from 'ai';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MealCreate } from '../db/schema';
import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSCookMealCreateSchema } from '../graphql/generated';
import type {
    GqlSCookMealCreate,
    GqlSCookMutation,
    GqlSCookMutationMealCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

const DRAFT_TITLE = 'Neues Gericht';

export async function cookMealCreate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMealCreateArgs | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const mealInput = args?.meal;
    const titled = mealInput?.title != null ? textNormalizeTitled(mealInput.title) : '';
    const title = titled.length > 0 ? titled : DRAFT_TITLE;
    const description = mealInput?.description != null ? textNormalizeProseTitled(mealInput.description) : '';

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
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

/** AI-SDK tool — same write path as `CookMutation.mealCreate`. */
export function toolCookMealCreate({
    cookId,
    requestingSession,
    serverRuntime,
}: {
    cookId: string;
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'Create a new meal (dish) on the signed-in cook inventory.',
            'Use when the cook asks to add a dish. Prefer a clear title and short description.',
            'Does not publish — the meal starts as a draft (publishedAt null).',
        ].join(' '),
        // Codegen Zod schemas are runtime-compatible; AI SDK brands differ across Zod majors.
        inputSchema: GqlSCookMealCreateSchema() as never,
        async execute(input: GqlSCookMealCreate) {
            const result = await cookMealCreate({ cookId } as GqlSCookMutation, { meal: input }, requestingSession, serverRuntime);
            return {
                success: result.success,
                mealId: result.referenceId,
                title: input.title.trim(),
                description: input.description?.trim() ?? '',
            };
        },
    });
}
