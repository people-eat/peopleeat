import { tool } from 'ai';
import { and, eq } from 'drizzle-orm';

import { isCookCallDurationMinutes } from '../../shared/cookCallAvailability';
import { isCookingPhilosophy, isCuisineStyle } from '../../shared/cookProfile';
import type { Cook } from '../db/schema';
import { cooks, fileUploads } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSCookUpdateSchema } from '../graphql/generated';
import type { GqlSCookMutation, GqlSCookMutationUpdateArgs, GqlSCookUpdate, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestCookTravelDistanceKmClear } from '../utils/bookingRequestCookTravelDistanceKmEnsure';
import { cookBiographySummaryGenerateCancel, cookBiographySummaryGenerateSchedule } from '../utils/cookBiographySummaryGenerateSchedule';
import {
    COOK_MAXIMUM_TRAVEL_DISTANCE_KM,
    COOK_MINIMUM_TRAVEL_DISTANCE_KM,
    COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT,
} from '../utils/cookCreatePayloadBuild';
import { cookTravelOriginAddressResolve } from '../utils/cookTravelOriginAddressResolve';
import { fileUploadAssertOwned, PROFILE_PICTURE_MEDIA_TYPES } from '../utils/fileUploadAssertOwned';

export async function cookUpdate(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const {
        isVisible,
        stageName,
        biography,
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
    // `biographySummary` on CookUpdate is admin-only — ignored here.

    const hasLogo = logoFileUploadId !== undefined;
    const hasField =
        isVisible !== undefined ||
        stageName !== undefined ||
        biography !== undefined ||
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
        throw new Error('cookUpdate: at least one field is required');
    }

    if (callDurationMinutes !== undefined && callDurationMinutes !== null && !isCookCallDurationMinutes(callDurationMinutes)) {
        throw new Error('cookUpdate: callDurationMinutes is invalid');
    }

    if (travelExpensesAmount !== undefined && travelExpensesAmount !== null && travelExpensesAmount < COOK_MINIMUM_TRAVEL_EXPENSES_AMOUNT) {
        throw new Error('cookUpdate: travelExpensesAmount is below minimum');
    }

    if (maximumTravelDistance !== undefined && maximumTravelDistance !== null) {
        if (maximumTravelDistance < COOK_MINIMUM_TRAVEL_DISTANCE_KM || maximumTravelDistance > COOK_MAXIMUM_TRAVEL_DISTANCE_KM) {
            throw new Error('cookUpdate: maximumTravelDistance is out of range');
        }
    }

    if (cuisineStyle !== undefined && cuisineStyle !== null && cuisineStyle.trim() !== '' && !isCuisineStyle(cuisineStyle.trim())) {
        throw new Error('cookUpdate: cuisineStyle is invalid');
    }

    if (
        cookingPhilosophy !== undefined &&
        cookingPhilosophy !== null &&
        cookingPhilosophy.trim() !== '' &&
        !isCookingPhilosophy(cookingPhilosophy.trim())
    ) {
        throw new Error('cookUpdate: cookingPhilosophy is invalid');
    }

    const resolvedAddress =
        exactTravelOriginAddress !== undefined && exactTravelOriginAddress !== null
            ? await cookTravelOriginAddressResolve({
                  exactTravelOriginAddress,
                  sessionToken: requestingSession.sessionId,
                  places: serverRuntime.places,
                  errorPrefix: 'cookUpdate',
              })
            : undefined;

    const patch: Partial<Cook> = { lastModifiedAt: new Date() };
    if (isVisible !== undefined && isVisible !== null) {
        patch.isVisible = isVisible;
    }
    if (stageName !== undefined) {
        patch.stageName = stageName === null || stageName.trim() === '' ? null : stageName.trim();
    }
    if (biography !== undefined && biography !== null) {
        patch.biography = biography;
    }
    if (cuisineStyle !== undefined) {
        patch.cuisineStyle = cuisineStyle === null || cuisineStyle.trim() === '' ? null : cuisineStyle.trim();
    }
    if (cookingPhilosophy !== undefined) {
        patch.cookingPhilosophy = cookingPhilosophy === null || cookingPhilosophy.trim() === '' ? null : cookingPhilosophy.trim();
    }
    let travelOriginChanged = false;
    if (resolvedAddress) {
        const [currentCook] = await serverRuntime.db
            .select({ exactTravelOriginAddress: cooks.exactTravelOriginAddress })
            .from(cooks)
            .where(eq(cooks.cookId, cookId))
            .limit(1);
        const previousOrigin = currentCook?.exactTravelOriginAddress;
        travelOriginChanged =
            previousOrigin == null ||
            previousOrigin.latitude !== resolvedAddress.latitude ||
            previousOrigin.longitude !== resolvedAddress.longitude;
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

    let scheduleBiographySummary = false;
    let cancelBiographySummary = false;
    if (biography !== undefined && biography !== null) {
        const trimmedBiography = biography.trim();
        if (!trimmedBiography) {
            patch.biographySummary = '';
            cancelBiographySummary = true;
        } else {
            scheduleBiographySummary = true;
        }
    }

    try {
        let previousLogoFileUploadId: string | null | undefined;

        if (hasLogo) {
            const [current] = await serverRuntime.db
                .select({ logoFileUploadId: cooks.logoFileUploadId })
                .from(cooks)
                .where(eq(cooks.cookId, cookId))
                .limit(1);
            if (!current) {
                throw new Error('cookUpdate: cook not found');
            }
            previousLogoFileUploadId = current.logoFileUploadId;

            if (logoFileUploadId == null) {
                patch.logoFileUploadId = null;
            } else {
                await fileUploadAssertOwned(serverRuntime.db, {
                    fileUploadId: logoFileUploadId,
                    userId: cookId,
                    allowedMediaTypes: PROFILE_PICTURE_MEDIA_TYPES,
                    commandName: 'cookUpdate',
                });
                patch.logoFileUploadId = logoFileUploadId;
            }
        }

        await serverRuntime.db.transaction(async (transaction) => {
            const [updated] = await transaction
                .update(cooks)
                .set(patch)
                .where(eq(cooks.cookId, cookId))
                .returning({ cookId: cooks.cookId });
            if (!updated) {
                throw new Error('cookUpdate: cook not found');
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

        if (travelOriginChanged) {
            await bookingRequestCookTravelDistanceKmClear(serverRuntime, { cookId });
        }

        if (cancelBiographySummary) {
            await cookBiographySummaryGenerateCancel(serverRuntime, cookId);
        } else if (scheduleBiographySummary) {
            await cookBiographySummaryGenerateSchedule(serverRuntime, cookId);
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: cookId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

/** AI-SDK tool — same write path as `CookMutation.update`. */
export function toolCookUpdate({
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
            'Update the signed-in cook profile (visibility, stage name, biography, logo, cuisine, travel, pricing, call settings).',
            'Only include fields that should change. cuisineStyle / cookingPhilosophy must be catalog values (or null to clear).',
            'stageName is an optional public display name (null / blank clears).',
            'logoFileUploadId links a previously uploaded square image (null clears). Use exactTravelOriginAddress as a free-text address.',
        ].join(' '),
        // Codegen Zod schemas are runtime-compatible; AI SDK brands differ across Zod majors.
        inputSchema: GqlSCookUpdateSchema() as never,
        async execute(input: GqlSCookUpdate) {
            const result = await cookUpdate({ cookId } as GqlSCookMutation, { input }, requestingSession, serverRuntime);
            return { success: result.success, cookId: result.referenceId, updatedFields: Object.keys(input) };
        },
    });
}
