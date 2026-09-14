import type { User } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSUserLegalAcceptance } from '../graphql/generated';
import { toGqlPublicLegalPrivacyPolicy } from '../mappers/toGqlPublicLegalPrivacyPolicy';
import { toGqlPublicLegalTermsAndConditions } from '../mappers/toGqlPublicLegalTermsAndConditions';
import { legalPrivacyPolicyPublishedFindLatest } from './legalPrivacyPolicyPublishedFindLatest';
import { legalTermsAndConditionsPublishedFindLatest } from './legalTermsAndConditionsPublishedFindLatest';

function isAcceptanceStale(lastAccepted: Date | null, publishedAt: Date): boolean {
    if (!lastAccepted) return true;
    return lastAccepted.getTime() < publishedAt.getTime();
}

/** Shared pending-acceptance computation for the `User.legalAcceptance` field
 * resolver and the mutation guard. */
export async function userLegalAcceptanceCompute(
    user: Pick<User, 'lastAcceptedPrivacyPolicy' | 'lastAcceptedTerms'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserLegalAcceptance> {
    const [privacy, terms] = await Promise.all([
        legalPrivacyPolicyPublishedFindLatest(serverRuntime),
        legalTermsAndConditionsPublishedFindLatest(serverRuntime),
    ]);

    const pendingPrivacyPolicy =
        privacy && privacy.publishedAt && isAcceptanceStale(user.lastAcceptedPrivacyPolicy, privacy.publishedAt)
            ? toGqlPublicLegalPrivacyPolicy(privacy)
            : null;
    const pendingTermsAndConditions =
        terms && terms.publishedAt && isAcceptanceStale(user.lastAcceptedTerms, terms.publishedAt)
            ? toGqlPublicLegalTermsAndConditions(terms)
            : null;

    return {
        required: pendingPrivacyPolicy !== null || pendingTermsAndConditions !== null,
        pendingPrivacyPolicy,
        pendingTermsAndConditions,
    };
}
