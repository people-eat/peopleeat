import { and, eq, isNull } from 'drizzle-orm';

import { capitalizeFirstLetter } from '../../shared';
import { fileUploads, meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMealUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

/**
 * Admin patch of any cook meal. Image uploads must be owned by the admin and are
 * reassigned to the meal's cook (same pattern as `adminCookUpdate` logo).
 */
export async function adminCookMealUpdate(
    { adminId }: GqlSAdminMutation,
    { mealId, meal }: GqlSAdminMutationCookMealUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const hasTitle = meal.title !== undefined && meal.title !== null;
        const hasDescription = meal.description !== undefined && meal.description !== null;
        const hasImage = meal.imageFileUploadId !== undefined;
        const hasPublishedAt = meal.publishedAt !== undefined;

        if (!hasTitle && !hasDescription && !hasImage && !hasPublishedAt) {
            throw new Error('adminCookMealUpdate: at least one field is required');
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
            throw new Error('adminCookMealUpdate: meal not found');
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
            const title = meal.title!.trim();
            if (title.length === 0) {
                throw new Error('adminCookMealUpdate: title must not be empty');
            }
            set.title = capitalizeFirstLetter(title);
        }

        if (hasDescription) {
            const description = meal.description!.trim();
            set.description = description.length === 0 ? '' : capitalizeFirstLetter(description);
        }

        if (hasImage) {
            if (meal.imageFileUploadId == null) {
                set.imageFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: meal.imageFileUploadId,
                    userId: adminId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'adminCookMealUpdate',
                });
                set.imageFileUploadId = meal.imageFileUploadId;
            }
        }

        if (hasPublishedAt) {
            set.publishedAt =
                meal.publishedAt == null ? null : meal.publishedAt instanceof Date ? meal.publishedAt : new Date(meal.publishedAt);
            if (set.publishedAt != null && Number.isNaN(set.publishedAt.getTime())) {
                throw new Error('adminCookMealUpdate: publishedAt is invalid');
            }
        }

        const previousImageFileUploadId = current.imageFileUploadId;

        await serverRuntime.db.transaction(async (transaction) => {
            const updated = await transaction
                .update(meals)
                .set(set)
                .where(and(eq(meals.mealId, mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
                .returning({ mealId: meals.mealId });

            if (updated.length === 0) {
                throw new Error('adminCookMealUpdate: meal not found');
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
