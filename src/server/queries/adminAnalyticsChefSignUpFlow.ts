import { t } from '../../i18n/t';
import { chefSignUpFunnelArea, chefSignUpFunnelSteps } from '../../shared/chefSignUpFunnel';
import type { ChefSignUpFunnelStep } from '../../shared/chefSignUpFunnel';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { userLocaleRequire } from '../utils/userLocaleRequire';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(locale: Locale): Record<ChefSignUpFunnelStep, string> {
    return {
        auth: t(locale, 'admin', 'analytics.funnels.chefSignUp.auth'),
        profile: t(locale, 'admin', 'analytics.funnels.chefSignUp.profile'),
        created: t(locale, 'admin', 'analytics.funnels.chefSignUp.created'),
    };
}

export async function adminAnalyticsChefSignUpFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: chefSignUpFunnelArea,
        steps: chefSignUpFunnelSteps,
        labels: funnelLabels(locale),
        lifecycleTypes: [{ type: 'COOK_CREATED', step: 'created' }],
        excludeCooks: false,
    });
}
