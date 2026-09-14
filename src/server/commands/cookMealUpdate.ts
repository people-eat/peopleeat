import { and, eq, isNull } from 'drizzle-orm';

import { capitalizeFirstLetter } from '../../shared';
import { fileUploads, meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMealUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

export async function cookMealUpdate(
    { cookId }: GqlSCookMutation,
    { mealId, meal }: GqlSCookMutationMealUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const hasTitle = meal.title !== undefined && meal.title !== null;
        const hasDescription = meal.description !== undefined && meal.description !== null;
        const hasImage = meal.imageFileUploadId !== undefined;
        const hasPublishedAt = meal.publishedAt !== undefined;

        if (!hasTitle && !hasDescription && !hasImage && !hasPublishedAt) {
            throw new Error('cookMealUpdate: at least one field is required');
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
            const title = meal.title!.trim();
            if (title.length === 0) {
                throw new Error('cookMealUpdate: title must not be empty');
            }
            set.title = capitalizeFirstLetter(title);
        }

        if (hasDescription) {
            const description = meal.description!.trim();
            set.description = description.length === 0 ? '' : capitalizeFirstLetter(description);
        }

        if (hasImage) {
            const [current] = await serverRuntime.db
                .select({ imageFileUploadId: meals.imageFileUploadId })
                .from(meals)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .limit(1);
            if (!current) {
                throw new Error('cookMealUpdate: meal not found');
            }
            previousImageFileUploadId = current.imageFileUploadId;

            if (meal.imageFileUploadId == null) {
                set.imageFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: meal.imageFileUploadId,
                    userId: cookId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'cookMealUpdate',
                });
                set.imageFileUploadId = meal.imageFileUploadId;
            }
        }

        if (hasPublishedAt) {
            set.publishedAt =
                meal.publishedAt == null ? null : meal.publishedAt instanceof Date ? meal.publishedAt : new Date(meal.publishedAt);
            if (set.publishedAt != null && Number.isNaN(set.publishedAt.getTime())) {
                throw new Error('cookMealUpdate: publishedAt is invalid');
            }
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(meals)
                .set(set)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .returning({ mealId: meals.mealId });

            if (updated.length === 0) {
                throw new Error('cookMealUpdate: meal not found');
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
