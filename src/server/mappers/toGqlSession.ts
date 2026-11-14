import type { Session } from '../db/schema';
import type { GqlSSession } from '../graphql/generated';

export function toGqlSession(session: Session): GqlSSession {
    return {
        sessionId: session.sessionId,
        userId: session.userId,
        impersonationReturnSessionId: session.impersonationReturnSessionId,

        // resolved fields
        user: null,
        authEmailOtp: null,
        authTotpChallenge: null,
        giftCard: null,
        giftCardPurchaseError: null,
        cookieSetting: null,
        activeFeatureToggleKeys: [],
        locationSuggestions: [],
        lastVisitedCookProfiles: [],
        impersonation: session.impersonationReturnSessionId ? { active: true } : null,
    };
}
