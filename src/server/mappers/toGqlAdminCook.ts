import { stripeDashboardConnectAccountUrl, stripeDashboardIsTestMode } from '../../shared';
import type { Cook } from '../db/schema';
import { cookCanCreateOffersDerive, cookStripeStatusDerive } from '../domain/cook';
import type { UserStatus } from '../domain/user';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSAdminCook, GqlSAdminUser, GqlSPublicCookRating } from '../graphql/generated';
import { toGqlCookTravelOriginAddress } from './toGqlCook';

export function toGqlAdminCook(row: Cook, userStatus: UserStatus): GqlSAdminCook {
    const stripeAccountId = row.stripeAccountId ?? null;
    const testMode = stripeDashboardIsTestMode(environmentVariables.stripeSecretKey);
    return {
        cookId: row.cookId,
        // Populated by `AdminCook.user` field resolver (or hydrated by booking queries).
        user: undefined as unknown as GqlSAdminUser,
        isVisible: row.isVisible,
        isApprovedByAdmin: row.isApprovedByAdmin,
        canCreateOffers: cookCanCreateOffersDerive(row, userStatus),
        stripeStatus: cookStripeStatusDerive(row),
        stripeAccountId,
        stripeAccountUrl: stripeAccountId ? stripeDashboardConnectAccountUrl(stripeAccountId, testMode) : null,
        stripeAccountActive: row.stripeAccountActive,
        stripeAccountActiveWasReset: row.stripeAccountActiveWasReset,
        // Field resolvers load live Stripe snapshots (cook-profile tab only).
        stripeAccountDetails: null,
        stripeWallet: null,
        exactTravelOriginAddress: row.exactTravelOriginAddress ? toGqlCookTravelOriginAddress(row.exactTravelOriginAddress) : null,
        biography: row.biography,
        biographySummary: row.biographySummary,
        // Field resolver derives live pg-boss state (deterministic job id).
        biographySummaryGenerating: false,
        // Field resolver loads FileUpload when `logoFileUploadId` is set.
        logo: null,
        cuisineStyle: row.cuisineStyle ?? null,
        cookingPhilosophy: row.cookingPhilosophy ?? null,
        // Field resolver populates from published customer testimonials.
        rating: undefined as unknown as GqlSPublicCookRating,
        travelExpensesAmount: row.travelExpensesAmount,
        maximumTravelDistance: row.maximumTravelDistance ?? null,
        minimumPriceAmount: row.minimumPriceAmount ?? null,
        maximumPriceAmount: row.maximumPriceAmount ?? null,
        minimumParticipants: row.minimumParticipants ?? null,
        maximumParticipants: row.maximumParticipants ?? null,
        callSchedulingEnabled: row.callSchedulingEnabled,
        callDurationMinutes: row.callDurationMinutes,
        // Field resolvers populate nested lists.
        callAvailabilityRules: [],
        featuredOn: [],
        stageName: row.stageName ?? null,
        createdAt: row.createdAt,
        lastModifiedAt: row.lastModifiedAt,
    };
}
