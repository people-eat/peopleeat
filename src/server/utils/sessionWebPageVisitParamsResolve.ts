import { expansionMarketFromCountry, expansionMarketFromParam } from '../../shared/expansionMarkets';
import type { Database } from '../db';
import type { SessionEventWebPageVisitedPayload } from '../domain/sessionEvent';
import {
    blogPostFindByPathNameAny,
    cityFindByPathNameAny,
    occasionFindByPathNameAny,
    partnerVenueFindByPathNameAny,
} from './contentPageFind';
import { cookFindByPathNameAny } from './cookPathName';

export type SessionWebPageVisitParamsInput = {
    cityId?: string | null;
    cookId?: string | null;
    blogPostId?: string | null;
    partnerVenueId?: string | null;
    occasionId?: string | null;
    bookingRequestId?: string | null;
    countryId?: string | null;
};

type VisitParams = NonNullable<SessionEventWebPageVisitedPayload['params']>;

/**
 * Resolves public URL segments (slug / previous path / legacy id) to stable
 * entity ids so visit analytics survive a rename.
 */
export async function sessionWebPageVisitParamsResolve(
    db: Database,
    input: SessionWebPageVisitParamsInput,
): Promise<VisitParams | undefined> {
    const params: VisitParams = {};
    if (input.cityId) {
        const city = await cityFindByPathNameAny(db, input.cityId);
        params.cityId = city?.cityId ?? input.cityId;
    }
    if (input.cookId) {
        const cook = await cookFindByPathNameAny(db, input.cookId);
        params.cookId = cook?.cookId ?? input.cookId;
    }
    if (input.blogPostId) {
        const blogPost = await blogPostFindByPathNameAny(db, input.blogPostId);
        params.blogPostId = blogPost?.blogPostId ?? input.blogPostId;
    }
    if (input.partnerVenueId) {
        const venue = await partnerVenueFindByPathNameAny(db, input.partnerVenueId);
        params.partnerVenueId = venue?.partnerVenueId ?? input.partnerVenueId;
    }
    if (input.occasionId) {
        const occasion = await occasionFindByPathNameAny(db, input.occasionId);
        params.occasionId = occasion?.occasionId ?? input.occasionId;
    }
    if (input.bookingRequestId) params.bookingRequestId = input.bookingRequestId;
    if (input.countryId) {
        const market = expansionMarketFromParam(input.countryId) ?? expansionMarketFromCountry(input.countryId);
        params.countryId = market?.slug ?? input.countryId;
    }

    return Object.keys(params).length > 0 ? params : undefined;
}
