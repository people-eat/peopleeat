import { and, eq, isNull } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMenuSuggestion,
    GqlSCookMutation,
    GqlSCookMutationMenuSuggestionFromInventoryArgs,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMenuSuggestionDraftMaterialize } from '../utils/cookMenuSuggestionDraftMaterialize';
import { cookMenuSuggestionFromInventoryGenerate } from './cookMenuSuggestionFromInventoryGenerate';

/** Sync GraphQL: assemble a menu from meal inventory and insert NEW_MEAL drafts. */
export async function cookMenuSuggestionFromInventory(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuSuggestionFromInventoryArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMenuSuggestion> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const draft = await cookMenuSuggestionFromInventoryGenerate({
            cookId,
            brief: args.brief,
            requestingSession,
            serverRuntime,
        });

        if (!draft) {
            throw new Error('cookMenuSuggestionFromInventory: cook has no meals');
        }

        const cookMeals = await serverRuntime.db
            .select({ mealId: meals.mealId })
            .from(meals)
            .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)));
        const existingMealIds = new Set(cookMeals.map((meal) => meal.mealId));

        const suggestion = await cookMenuSuggestionDraftMaterialize(cookId, draft, existingMealIds, serverRuntime);
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return suggestion;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
