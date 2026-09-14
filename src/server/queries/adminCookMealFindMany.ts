import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { ChatAdminMealListItem } from '../db/chatPayloadTypes';
import { meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMeal, GqlSAdminCookMealsArgs, GqlSSession } from '../graphql/generated';
import { GqlSAdminCookInventoryStatusSchema, GqlSAdminCookMealImageFilterSchema } from '../graphql/generated';
import { toGqlAdminCookMeal } from '../mappers/toGqlAdminCookMeal';
import { adminCookMealCriterionWhere, adminCookMealOrderBy } from '../utils/adminCookMealCriterionWhere';
import { findManySkip, findManyTake } from '../utils/findManyTake';

const TOOL_TAKE_DEFAULT = 25;
const TOOL_TAKE_MAX = 25;

export async function adminCookMealFindMany(
    args: GqlSAdminCookMealsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookMeal[]> {
    try {
        const criterion = args.criterion;
        const where = adminCookMealCriterionWhere(criterion);

        const rows = await serverRuntime.db
            .select({
                meal: meals,
                cookFirstName: users.firstName,
                cookLastName: users.lastName,
            })
            .from(meals)
            .innerJoin(users, eq(users.userId, meals.cookId))
            .where(where)
            .orderBy(adminCookMealOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map((row) => toGqlAdminCookMeal(row.meal, `${row.cookFirstName} ${row.cookLastName}`.trim()));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

function dateToIso(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function adminCookMealListCardSnapshot(rows: GqlSAdminCookMeal[]): ChatAdminMealListItem[] {
    return rows.map((meal) => ({
        mealId: meal.mealId,
        cookId: meal.cookId,
        cookName: meal.cookName,
        title: meal.title,
        description: meal.description,
        imageUrl: meal.imageUrl ?? null,
        publishedAt: dateToIso(meal.publishedAt),
        deletedAt: dateToIso(meal.deletedAt),
        createdAt: dateToIso(meal.createdAt) ?? new Date(0).toISOString(),
    }));
}

const toolAdminCookMealsFindManyInputSchema = z.object({
    searchText: z.string().optional().describe('Optional title, description, or cook name search.'),
    cookIds: z.array(z.string()).optional().describe('Optional cook user ids to scope the list.'),
    status: GqlSAdminCookInventoryStatusSchema.optional().describe('Optional lifecycle filter (PUBLISHED / DRAFT / DELETED).'),
    imageFilter: GqlSAdminCookMealImageFilterSchema.optional().describe('Optional image / public-catalog filter.'),
    includeDeleted: z.boolean().optional().describe('Include soft-deleted meals (default true; ignored when status is set).'),
    take: z.coerce
        .number()
        .int()
        .min(1)
        .max(TOOL_TAKE_MAX)
        .optional()
        .describe(`Max rows to return (default ${TOOL_TAKE_DEFAULT}, max ${TOOL_TAKE_MAX}).`),
});

export type ToolAdminCookMealsFindManyInput = z.infer<typeof toolAdminCookMealsFindManyInputSchema>;

export type ToolAdminCookMealsFindManyOutput = {
    count: number;
    meals: ChatAdminMealListItem[];
};

/** AI-SDK tool — same read path as `Admin.cookMeals`, card-shaped for chat. */
export function toolAdminCookMealsFindMany({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'List admin cook meals (dishes) matching a criterion.',
            'Use when the operator asks to show / list / find meals or dishes.',
            'Optionally narrow with searchText, cookIds, status, or imageFilter.',
            'After the tool returns, summarize the count briefly in markdown — the UI renders the meal cards.',
            'Do not invent meal ids or details not present in the tool result.',
        ].join(' '),
        inputSchema: toolAdminCookMealsFindManyInputSchema,
        async execute(input: ToolAdminCookMealsFindManyInput): Promise<ToolAdminCookMealsFindManyOutput> {
            const take = Math.min(Math.max(input.take ?? TOOL_TAKE_DEFAULT, 1), TOOL_TAKE_MAX);
            const rows = await adminCookMealFindMany(
                {
                    criterion: {
                        skip: 0,
                        take,
                        searchText: input.searchText,
                        cookIds: input.cookIds,
                        status: input.status,
                        imageFilter: input.imageFilter,
                        includeDeleted: input.includeDeleted ?? true,
                        sortField: 'createdAt',
                        sortDirection: 'DESC',
                    },
                },
                requestingSession,
                serverRuntime,
            );
            const mealCards = adminCookMealListCardSnapshot(rows);
            return { count: mealCards.length, meals: mealCards };
        },
    });
}
