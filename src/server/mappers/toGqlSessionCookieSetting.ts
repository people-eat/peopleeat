import type { CookieSetting } from '../db/schema';
import type { GqlSSessionCookieSetting } from '../graphql/generated';

export function toGqlSessionCookieSetting(cookieSetting: CookieSetting): GqlSSessionCookieSetting {
    return {
        googleAnalytics: cookieSetting.googleAnalytics,
        clarity: cookieSetting.clarity,
    };
}
