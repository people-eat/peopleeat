import { chefSignUpFunnelArea, chefSignUpFunnelSteps } from '../../shared/chefSignUpFunnel';
import type { ChefSignUpFunnelStep } from '../../shared/chefSignUpFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

const FUNNEL_LABELS: Record<ChefSignUpFunnelStep, { de: string; en: string }> = {
    auth: { de: 'Anmeldung', en: 'Sign-in' },
    profile: { de: 'Koch-Profil', en: 'Chef profile' },
    created: { de: 'Koch-Konto erstellt', en: 'Chef account created' },
};

export async function adminAnalyticsChefSignUpFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: chefSignUpFunnelArea,
        steps: chefSignUpFunnelSteps,
        labels: FUNNEL_LABELS,
        lifecycleTypes: [{ type: 'COOK_CREATED', step: 'created' }],
        excludeCooks: false,
    });
}
