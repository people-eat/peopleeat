import { t } from '../../i18n/t';
import { chefSignUpFunnelArea, chefSignUpFunnelSteps } from '../../shared/chefSignUpFunnel';
import type { ChefSignUpFunnelStep } from '../../shared/chefSignUpFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(): Record<ChefSignUpFunnelStep, { de: string; en: string }> {
    return {
        auth: {
            de: t('de', 'admin', 'analytics.funnels.chefSignUp.auth'),
            en: t('en', 'admin', 'analytics.funnels.chefSignUp.auth'),
        },
        profile: {
            de: t('de', 'admin', 'analytics.funnels.chefSignUp.profile'),
            en: t('en', 'admin', 'analytics.funnels.chefSignUp.profile'),
        },
        created: {
            de: t('de', 'admin', 'analytics.funnels.chefSignUp.created'),
            en: t('en', 'admin', 'analytics.funnels.chefSignUp.created'),
        },
    };
}

export async function adminAnalyticsChefSignUpFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: chefSignUpFunnelArea,
        steps: chefSignUpFunnelSteps,
        labels: funnelLabels(),
        lifecycleTypes: [{ type: 'COOK_CREATED', step: 'created' }],
        excludeCooks: false,
    });
}
