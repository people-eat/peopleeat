import type { Cook, User } from '../db/schema';
import type { GqlSFileUpload, GqlSPublicCook } from '../graphql/generated';
import { toGqlPublicUser } from './toGqlPublicUser';

export function toGqlPublicCook(
    cook: Cook,
    user: Pick<User, 'firstName' | 'createdAt'>,
    profilePicture: GqlSFileUpload | null = null,
): GqlSPublicCook {
    const stageName = cook.stageName?.trim() || null;
    const publicUser = toGqlPublicUser(user, profilePicture);
    return {
        cookId: cook.cookId,
        user: stageName ? { ...publicUser, display: stageName } : publicUser,
        hasPublicProfile: cook.isVisible && cook.isApprovedByAdmin,
        stageName,
        biography: cook.biography,
        biographySummary: cook.biographySummary,
        // Field resolver loads FileUpload when `logoFileUploadId` is set.
        logo: null,
        cuisineStyle: cook.cuisineStyle ?? null,
        cookingPhilosophy: cook.cookingPhilosophy ?? null,
        city: cook.exactTravelOriginAddress?.city.trim() || cook.legacyCityName?.trim() || null,
        minimumPriceAmount: cook.minimumPriceAmount ?? null,
        maximumPriceAmount: cook.maximumPriceAmount ?? null,
        minimumParticipants: cook.minimumParticipants ?? null,
        maximumParticipants: cook.maximumParticipants ?? null,
        callSchedulingEnabled: cook.callSchedulingEnabled,
        callDurationMinutes: cook.callDurationMinutes,
        // Field resolvers populate slots / meals / testimonials / rating.
        callSlots: [],
        meals: [],
        testimonials: [],
        rating: undefined as unknown as GqlSPublicCook['rating'],
    };
}
