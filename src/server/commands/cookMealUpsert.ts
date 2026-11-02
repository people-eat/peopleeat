import { tool } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MealCreate } from '../db/schema';
import { fileUploads, meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMealUpsert,
    GqlSCookMutation,
    GqlSCookMutationMealUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

const DRAFT_TITLE = 'Neues Gericht';

function publishedAtParse(value: Date | string | null | undefined, commandName: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${commandName}: publishedAt is invalid`);
    }
    return date;
}

async function cookMealInsert(
    cookId: string,
    meal: GqlSCookMealUpsert | null | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const titled = meal?.title != null ? textNormalizeTitled(meal.title) : '';
    const title = titled.length > 0 ? titled : DRAFT_TITLE;
    const description = meal?.description != null ? textNormalizeProseTitled(meal.description) : '';
    const publishedAt = publishedAtParse(meal?.publishedAt ?? undefined, 'cookMealUpsert') ?? null;

    const mealId = idCreate();
    const values: MealCreate = {
        mealId,
        cookId,
        title,
        description,
        publishedAt,
        deletedAt: null,
    };

    if (meal?.imageFileUploadId !== undefined) {
        if (meal.imageFileUploadId == null) {
            values.imageFileUploadId = null;
        } else {
            await fileUploadAssertOwned(serverRuntime.db, {
                fileUploadId: meal.imageFileUploadId,
                userId: cookId,
                allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                commandName: 'cookMealUpsert',
            });
            values.imageFileUploadId = meal.imageFileUploadId;
        }
    }

    try {
        await serverRuntime.db.insert(meals).values(values);
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function cookMealPatch(
    cookId: string,
    mealId: string,
    meal: GqlSCookMealUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const hasTitle = meal.title !== undefined && meal.title !== null;
        const hasDescription = meal.description !== undefined && meal.description !== null;
        const hasImage = meal.imageFileUploadId !== undefined;
        const hasPublishedAt = meal.publishedAt !== undefined;

        if (!hasTitle && !hasDescription && !hasImage && !hasPublishedAt) {
            throw new Error('cookMealUpsert: at least one field is required');
        }

        const set: {
            title?: string;
            description?: string;
            imageFileUploadId?: string | null;
            publishedAt?: Date | null;
            updatedAt: Date;
        } = { updatedAt: new Date() };
        let previousImageFileUploadId: string | null | undefined;

        if (hasTitle) {
            const title = textNormalizeTitled(meal.title!);
            if (title.length === 0) {
                throw new Error('cookMealUpsert: title must not be empty');
            }
            set.title = title;
        }

        if (hasDescription) {
            set.description = textNormalizeProseTitled(meal.description!);
        }

        if (hasImage) {
            const [current] = await serverRuntime.db
                .select({ imageFileUploadId: meals.imageFileUploadId })
                .from(meals)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .limit(1);
            if (!current) {
                throw new Error('cookMealUpsert: meal not found');
            }
            previousImageFileUploadId = current.imageFileUploadId;

            if (meal.imageFileUploadId == null) {
                set.imageFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: meal.imageFileUploadId,
                    userId: cookId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'cookMealUpsert',
                });
                set.imageFileUploadId = meal.imageFileUploadId;
            }
        }

        if (hasPublishedAt) {
            set.publishedAt = publishedAtParse(meal.publishedAt, 'cookMealUpsert') ?? null;
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(meals)
                .set(set)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .returning({ mealId: meals.mealId });

            if (updated.length === 0) {
                throw new Error('cookMealUpsert: meal not found');
            }

            if (hasImage && previousImageFileUploadId != null) {
                const nextId = set.imageFileUploadId ?? null;
                if (nextId !== previousImageFileUploadId) {
                    await transaction
                        .delete(fileUploads)
                        .where(and(eq(fileUploads.fileUploadId, previousImageFileUploadId), eq(fileUploads.userId, cookId)));
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

export async function cookMealUpsert(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMealUpsertArgs | undefined,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const meal = args?.meal;
    const mealId = meal?.mealId ?? null;
    if (mealId == null || mealId === '') {
        return cookMealInsert(cookId, meal, requestingSession, serverRuntime);
    }
    return cookMealPatch(cookId, mealId, meal ?? {}, requestingSession, serverRuntime);
}

// Hand-built: GraphQL DateTime → z.date() breaks Gemini structuredOutputs.
// See docs/architecture/agent-delegation.md#tool-input-schemas.
const cookMealUpsertToolSchema = z.object({
    mealId: z
        .string()
        .nullish()
        .describe('Existing meal id when editing. Omit to create. Pass an id from the cook inventory snapshot — never invent one.'),
    title: z.string().nullish().describe('Dish title. On create, blank/omit uses a draft placeholder.'),
    description: z.string().nullish().describe('Short dish description.'),
    imageFileUploadId: z.string().nullish().describe('Owned file upload id for the meal image. Pass null to clear on update.'),
    publishedAt: z.string().nullish().describe('ISO-8601 timestamp to publish, or null to unpublish. Omit to leave unchanged.'),
});

/** AI-SDK tool — same write path as `CookMutation.mealUpsert`. */
export function toolCookMealUpsert({
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
            'Create or update a meal (dish) on the signed-in cook inventory.',
            'Omit mealId to create; pass mealId from the inventory snapshot to edit (avoids duplicate drafts).',
            'On create, meals start as drafts unless publishedAt is set.',
        ].join(' '),
        inputSchema: cookMealUpsertToolSchema as never,
        async execute(input: z.infer<typeof cookMealUpsertToolSchema>) {
            const meal: GqlSCookMealUpsert = {
                mealId: input.mealId ?? undefined,
                title: input.title ?? undefined,
                description: input.description ?? undefined,
                imageFileUploadId: input.imageFileUploadId === undefined ? undefined : input.imageFileUploadId,
                publishedAt: input.publishedAt === undefined ? undefined : input.publishedAt === null ? null : new Date(input.publishedAt),
            };
            const result = await cookMealUpsert({ cookId } as GqlSCookMutation, { meal }, requestingSession, serverRuntime);
            return {
                success: result.success,
                mealId: result.referenceId,
                created: meal.mealId == null || meal.mealId === '',
            };
        },
    });
}
