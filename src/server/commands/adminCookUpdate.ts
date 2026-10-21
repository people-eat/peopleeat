import { and, eq } from 'drizzle-orm';

import { isCookCallDurationMinutes } from '../../shared/cookCallAvailability';
import { isCookingPhilosophy, isCuisineStyle } from '../../shared/cookProfile';
import { textNormalizeProse, textNormalizeTitled } from '../../shared/textNormalize';
import type { Cook } from '../db/schema';
import { cooks, fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCookUpdateArgs,
    GqlSCookUpdate,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import {
    COOK_MAXIMUM_TRAVEL_DISTANCE_KM,
    COOK_MINIMUM_TRAVEL_DISTANCE_KM,
    COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT,
} from '../utils/cookCreatePayloadBuild';
import { cookTravelOriginAddressResolve } from '../utils/cookTravelOriginAddressResolve';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

/**
 * Admin patch of any cook profile. Legal acceptance is asserted on the admin,
 * not the cook (ops can edit cooks who have not yet accepted).
 */
export async function adminCookUpdate(
    { adminId }: GqlSAdminMutation,
    { cookId, input }: GqlSAdminMutationCookUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        return await cookUpdateAdminApply(adminId, cookId, input, requestingSession, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

async function cookUpdateAdminApply(
    adminId: string,
    cookId: string,
    input: GqlSCookUpdate,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const {
        isVisible,
        stageName,
        biography,
        biographySummary,
        logoFileUploadId,
        cuisineStyle,
        cookingPhilosophy,
        exactTravelOriginAddress,
        travelExpensesAmount,
        maximumTravelDistance,
        minimumPriceAmount,
        maximumPriceAmount,
        minimumParticipants,
        maximumParticipants,
        callSchedulingEnabled,
        callDurationMinutes,
    } = input;

    const hasLogo = logoFileUploadId !== undefined;
    const hasField =
        isVisible !== undefined ||
        stageName !== undefined ||
        biography !== undefined ||
        biographySummary !== undefined ||
        hasLogo ||
        cuisineStyle !== undefined ||
        cookingPhilosophy !== undefined ||
        exactTravelOriginAddress !== undefined ||
        travelExpensesAmount !== undefined ||
        maximumTravelDistance !== undefined ||
        minimumPriceAmount !== undefined ||
        maximumPriceAmount !== undefined ||
        minimumParticipants !== undefined ||
        maximumParticipants !== undefined ||
        callSchedulingEnabled !== undefined ||
        callDurationMinutes !== undefined;

    if (!hasField) {
        throw new Error('adminCookUpdate: at least one field is required');
    }

    if (callDurationMinutes !== undefined && callDurationMinutes !== null && !isCookCallDurationMinutes(callDurationMinutes)) {
        throw new Error('adminCookUpdate: callDurationMinutes is invalid');
    }

    if (travelExpensesAmount !== undefined && travelExpensesAmount !== null && travelExpensesAmount < COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT) {
        throw new Error('adminCookUpdate: travelExpensesAmount is below minimum');
    }

    if (maximumTravelDistance !== undefined && maximumTravelDistance !== null) {
        if (maximumTravelDistance < COOK_MINIMUM_TRAVEL_DISTANCE_KM || maximumTravelDistance > COOK_MAXIMUM_TRAVEL_DISTANCE_KM) {
            throw new Error('adminCookUpdate: maximumTravelDistance is out of range');
        }
    }

    if (cuisineStyle !== undefined && cuisineStyle !== null && cuisineStyle.trim() !== '' && !isCuisineStyle(cuisineStyle.trim())) {
        throw new Error('adminCookUpdate: cuisineStyle is invalid');
    }

    if (
        cookingPhilosophy !== undefined &&
        cookingPhilosophy !== null &&
        cookingPhilosophy.trim() !== '' &&
        !isCookingPhilosophy(cookingPhilosophy.trim())
    ) {
        throw new Error('adminCookUpdate: cookingPhilosophy is invalid');
    }

    const resolvedAddress =
        exactTravelOriginAddress !== undefined && exactTravelOriginAddress !== null
            ? await cookTravelOriginAddressResolve({
                  exactTravelOriginAddress,
                  sessionToken: requestingSession.sessionId,
                  places: serverRuntime.places,
                  errorPrefix: 'adminCookUpdate',
              })
            : undefined;

    const patch: Partial<Cook> = { lastModifiedAt: new Date() };
    if (isVisible !== undefined && isVisible !== null) {
        patch.isVisible = isVisible;
    }
    if (stageName !== undefined) {
        const normalizedStageName = stageName == null ? '' : textNormalizeTitled(stageName);
        patch.stageName = normalizedStageName.length === 0 ? null : normalizedStageName;
    }
    if (biography !== undefined && biography !== null) {
        patch.biography = textNormalizeProse(biography);
    }
    if (biographySummary !== undefined && biographySummary !== null) {
        patch.biographySummary = textNormalizeProse(biographySummary);
    }
    if (cuisineStyle !== undefined) {
        patch.cuisineStyle = cuisineStyle === null || cuisineStyle.trim() === '' ? null : cuisineStyle.trim();
    }
    if (cookingPhilosophy !== undefined) {
        patch.cookingPhilosophy = cookingPhilosophy === null || cookingPhilosophy.trim() === '' ? null : cookingPhilosophy.trim();
    }
    if (resolvedAddress) {
        patch.exactTravelOriginAddress = resolvedAddress;
    }
    if (travelExpensesAmount !== undefined && travelExpensesAmount !== null) {
        patch.travelExpensesAmount = travelExpensesAmount;
    }
    if (maximumTravelDistance !== undefined) {
        patch.maximumTravelDistance = maximumTravelDistance;
    }
    if (minimumPriceAmount !== undefined) {
        patch.minimumPriceAmount = minimumPriceAmount;
    }
    if (maximumPriceAmount !== undefined) {
        patch.maximumPriceAmount = maximumPriceAmount;
    }
    if (minimumParticipants !== undefined) {
        patch.minimumParticipants = minimumParticipants;
    }
    if (maximumParticipants !== undefined) {
        patch.maximumParticipants = maximumParticipants;
    }
    if (callSchedulingEnabled !== undefined && callSchedulingEnabled !== null) {
        patch.callSchedulingEnabled = callSchedulingEnabled;
    }
    if (callDurationMinutes !== undefined && callDurationMinutes !== null) {
        patch.callDurationMinutes = callDurationMinutes;
    }

    let previousLogoFileUploadId: string | null | undefined;
    if (hasLogo) {
        const [current] = await serverRuntime.db
            .select({ logoFileUploadId: cooks.logoFileUploadId })
            .from(cooks)
            .where(eq(cooks.cookId, cookId))
            .limit(1);
        if (!current) {
            throw new Error('adminCookUpdate: cook not found');
        }
        previousLogoFileUploadId = current.logoFileUploadId;

        if (logoFileUploadId == null) {
            patch.logoFileUploadId = null;
        } else {
            await fileUploadAssertOwned(serverRuntime.db, {
                fileUploadId: logoFileUploadId,
                userId: adminId,
                allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                commandName: 'adminCookUpdate',
            });
            patch.logoFileUploadId = logoFileUploadId;
        }
    }

    await serverRuntime.db.transaction(async (transaction) => {
        const [updated] = await transaction.update(cooks).set(patch).where(eq(cooks.cookId, cookId)).returning({ cookId: cooks.cookId });
        if (!updated) {
            throw new Error('adminCookUpdate: cook not found');
        }

        if (hasLogo && patch.logoFileUploadId != null) {
            await transaction
                .update(fileUploads)
                .set({ userId: cookId })
                .where(and(eq(fileUploads.fileUploadId, patch.logoFileUploadId), eq(fileUploads.userId, adminId)));
        }

        if (hasLogo && previousLogoFileUploadId != null) {
            const nextId = patch.logoFileUploadId ?? null;
            if (nextId !== previousLogoFileUploadId) {
                await transaction
                    .delete(fileUploads)
                    .where(and(eq(fileUploads.fileUploadId, previousLogoFileUploadId), eq(fileUploads.userId, cookId)));
            }
        }
    });

    await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
    return { success: true, referenceId: cookId };
}
