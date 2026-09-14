import { eq } from 'drizzle-orm';

import { geoDistance } from '../../shared/geoDistance';
import { cooks, users } from '../db/schema';
import { cookCanCreateOffersDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookInTravelRadiusPreview, GqlSAdminCooksInTravelRadiusArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { cookIsInTravelRadius } from '../utils/cookIsInTravelRadius';

/**
 * Offer-capable cooks whose travel radius covers a venue point — admin create
 * picker before a booking request exists.
 */
export async function adminCooksInTravelRadiusPreviewFindMany(
    args: GqlSAdminCooksInTravelRadiusArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookInTravelRadiusPreview[]> {
    const eventLocation = { latitude: args.latitude, longitude: args.longitude };
    const excludeUserId = args.excludeUserId?.trim() || undefined;

    const cookRows = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId));
    const results: GqlSAdminCookInTravelRadiusPreview[] = [];

    for (const { cook, status } of cookRows) {
        if (!cookCanCreateOffersDerive(cook, status) || cook.cookId === excludeUserId) {
            continue;
        }
        if (!cookIsInTravelRadius(cook, eventLocation) || !cook.exactTravelOriginAddress) {
            continue;
        }

        results.push({
            cook: toGqlAdminCook(cook, status),
            estimatedTravelDistanceKm: geoDistance(cook.exactTravelOriginAddress, eventLocation),
        });
    }

    results.sort((a, b) => a.estimatedTravelDistanceKm - b.estimatedTravelDistanceKm);
    return results;
}
