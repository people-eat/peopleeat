import { count, eq } from 'drizzle-orm';

import { bookingRequestOffers, cooks, users } from '../db/schema';
import { cookStripeStatusDerive } from '../domain/cook';
import { cookOnboardingStepsDerive } from '../domain/cookAttention';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookOnboardingStep, GqlSSession } from '../graphql/generated';
import { cookMealCounts } from './cookMealCounts';
import { cookMenuCounts } from './cookMenuCounts';

export async function cookOnboardingStepsFindMany(
    parent: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookOnboardingStep[]> {
    try {
        const [[row], [mealCount = 0], [menuCount = 0], [offerRow]] = await Promise.all([
            serverRuntime.db
                .select({ cook: cooks, profilePictureFileUploadId: users.profilePictureFileUploadId })
                .from(cooks)
                .innerJoin(users, eq(users.userId, cooks.cookId))
                .where(eq(cooks.cookId, parent.cookId))
                .limit(1),
            cookMealCounts(parent, { criteria: [{}] }, requestingSession, serverRuntime),
            cookMenuCounts(parent, { criteria: [{}] }, requestingSession, serverRuntime),
            serverRuntime.db.select({ value: count() }).from(bookingRequestOffers).where(eq(bookingRequestOffers.cookId, parent.cookId)),
        ]);
        if (!row) {
            return [];
        }

        return cookOnboardingStepsDerive({
            isApprovedByAdmin: row.cook.isApprovedByAdmin,
            stripeStatus: cookStripeStatusDerive(row.cook),
            hasTravelOrigin: row.cook.exactTravelOriginAddress != null,
            hasProfilePicture: row.profilePictureFileUploadId != null,
            biography: row.cook.biography,
            cuisineStyle: row.cook.cuisineStyle,
            cookingPhilosophy: row.cook.cookingPhilosophy,
            mealCount,
            menuCount,
            offerCount: offerRow?.value ?? 0,
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
