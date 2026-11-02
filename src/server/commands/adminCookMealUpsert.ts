import { tool } from 'ai';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProseTitled, textNormalizeTitled } from '../../shared/textNormalize';
import type { MealCreate } from '../db/schema';
import { fileUploads, meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminCookMealUpsert,
    GqlSAdminMutation,
    GqlSAdminMutationCookMealUpsertArgs,
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

async function adminCookMealInsert(
    adminId: string,
    meal: GqlSAdminCookMealUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const cookId = meal.cookId?.trim() ?? '';
    if (cookId.length === 0) {
        throw new Error('adminCookMealUpsert: cookId is required when creating');
    }

    const titled = meal.title != null ? textNormalizeTitled(meal.title) : '';
    const title = titled.length > 0 ? titled : DRAFT_TITLE;
    const description = meal.description != null ? textNormalizeProseTitled(meal.description) : '';
    const publishedAt = publishedAtParse(meal.publishedAt ?? undefined, 'adminCookMealUpsert') ?? null;

    const mealId = idCreate();
    const values: MealCreate = {
        mealId,
        cookId,
        title,
        description,
        publishedAt,
        deletedAt: null,
    };

    if (meal.imageFileUploadId !== undefined) {
        if (meal.imageFileUploadId == null) {
            values.imageFileUploadId = null;
        } else {
            await fileUploadAssertOwned(serverRuntime.db, {
                fileUploadId: meal.imageFileUploadId,
                userId: adminId,
                allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                commandName: 'adminCookMealUpsert',
            });
            values.imageFileUploadId = meal.imageFileUploadId;
        }
    }

    try {
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(meals).values(values);
            if (values.imageFileUploadId != null) {
                await transaction
                    .update(fileUploads)
                    .set({ userId: cookId })
                    .where(and(eq(fileUploads.fileUploadId, values.imageFileUploadId), eq(fileUploads.userId, adminId)));
            }
        });
        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function adminCookMealPatch(
    adminId: string,
    mealId: string,
    meal: GqlSAdminCookMealUpsert,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const hasTitle = meal.title !== undefined && meal.title !== null;
        const hasDescription = meal.description !== undefined && meal.description !== null;
        const hasImage = meal.imageFileUploadId !== undefined;
        const hasPublishedAt = meal.publishedAt !== undefined;

        if (!hasTitle && !hasDescription && !hasImage && !hasPublishedAt) {
            throw new Error('adminCookMealUpsert: at least one field is required');
        }

        const [current] = await serverRuntime.db
            .select({
                cookId: meals.cookId,
                imageFileUploadId: meals.imageFileUploadId,
            })
            .from(meals)
            .where(and(eq(meals.mealId, mealId), isNull(meals.deletedAt)))
            .limit(1);

        if (!current) {
            throw new Error('adminCookMealUpsert: meal not found');
        }

        if (meal.cookId != null && meal.cookId !== '' && meal.cookId !== current.cookId) {
            throw new Error('adminCookMealUpsert: cookId does not match meal owner');
        }

        const { cookId } = current;
        const set: {
            title?: string;
            description?: string;
            imageFileUploadId?: string | null;
            publishedAt?: Date | null;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (hasTitle) {
            const title = textNormalizeTitled(meal.title!);
            if (title.length === 0) {
                throw new Error('adminCookMealUpsert: title must not be empty');
            }
            set.title = title;
        }

        if (hasDescription) {
            set.description = textNormalizeProseTitled(meal.description!);
        }

        if (hasImage) {
            if (meal.imageFileUploadId == null) {
                set.imageFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: meal.imageFileUploadId,
                    userId: adminId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'adminCookMealUpsert',
                });
                set.imageFileUploadId = meal.imageFileUploadId;
            }
        }

        if (hasPublishedAt) {
            set.publishedAt = publishedAtParse(meal.publishedAt, 'adminCookMealUpsert') ?? null;
        }

        const previousImageFileUploadId = current.imageFileUploadId;

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(meals)
                .set(set)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .returning({ mealId: meals.mealId });

            if (updated.length === 0) {
                throw new Error('adminCookMealUpsert: meal not found');
            }

            if (hasImage && set.imageFileUploadId != null) {
                await transaction
                    .update(fileUploads)
                    .set({ userId: cookId })
                    .where(and(eq(fileUploads.fileUploadId, set.imageFileUploadId), eq(fileUploads.userId, adminId)));
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

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

export async function adminCookMealUpsert(
    { adminId }: GqlSAdminMutation,
    { meal }: GqlSAdminMutationCookMealUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const mealId = meal.mealId ?? null;
    if (mealId == null || mealId === '') {
        return adminCookMealInsert(adminId, meal, requestingSession, serverRuntime);
    }
    return adminCookMealPatch(adminId, mealId, meal, requestingSession, serverRuntime);
}

// Hand-built: GraphQL DateTime → z.date() breaks Gemini structuredOutputs.
// See docs/architecture/agent-delegation.md#tool-input-schemas.
const adminCookMealUpsertToolSchema = z.object({
    mealId: z
        .string()
        .nullish()
        .describe('Existing meal id when editing. Omit to create. Pass an id from adminCookMealsFindMany — never invent one.'),
    cookId: z
        .string()
        .nullish()
        .describe('Target cook user id. Required when creating. On update, optional; must match the meal owner when set.'),
    title: z.string().nullish().describe('Dish title. On create, blank/omit uses a draft placeholder.'),
    description: z.string().nullish().describe('Short dish description.'),
    imageFileUploadId: z
        .string()
        .nullish()
        .describe('Admin-owned file upload id for the meal image (reassigned to the cook). Pass null to clear on update.'),
    publishedAt: z.string().nullish().describe('ISO-8601 timestamp to publish, or null to unpublish. Omit to leave unchanged.'),
});

/** AI-SDK tool — same write path as `AdminMutation.cookMealUpsert`. */
export function toolAdminCookMealUpsert({
    requestingSession,
    serverRuntime,
}: {
    requestingSession: GqlSSession;
    serverRuntime: ServerRuntime;
}) {
    return tool({
        description: [
            'Create or update a meal on any cook inventory (admin).',
            'Omit mealId and pass cookId to create; pass mealId from a list tool to edit.',
            'On create, meals start as drafts unless publishedAt is set.',
        ].join(' '),
        inputSchema: adminCookMealUpsertToolSchema as never,
        async execute(input: z.infer<typeof adminCookMealUpsertToolSchema>) {
            const adminId = requestingSession.userId;
            if (!adminId) {
                throw new Error('toolAdminCookMealUpsert requires a signed-in admin');
            }
            const meal: GqlSAdminCookMealUpsert = {
                mealId: input.mealId ?? undefined,
                cookId: input.cookId ?? undefined,
                title: input.title ?? undefined,
                description: input.description ?? undefined,
                imageFileUploadId: input.imageFileUploadId === undefined ? undefined : input.imageFileUploadId,
                publishedAt: input.publishedAt === undefined ? undefined : input.publishedAt === null ? null : new Date(input.publishedAt),
            };
            const result = await adminCookMealUpsert({ adminId } as GqlSAdminMutation, { meal }, requestingSession, serverRuntime);
            return {
                success: result.success,
                mealId: result.referenceId,
                created: meal.mealId == null || meal.mealId === '',
            };
        },
    });
}
