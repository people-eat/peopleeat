import { giftCardFunnelArea, giftCardFunnelSteps } from '../../shared/giftCardFunnel';
import type { GiftCardFunnelStep } from '../../shared/giftCardFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

const FUNNEL_LABELS: Record<GiftCardFunnelStep, { de: string; en: string }> = {
    configure: { de: 'Konfiguration', en: 'Configure' },
    auth: { de: 'Anmeldung', en: 'Sign-in' },
    created: { de: 'Geschenkkarte erstellt', en: 'Gift card created' },
    checkout: { de: 'Checkout', en: 'Checkout' },
    paid: { de: 'Bezahlt', en: 'Paid' },
};

export async function adminAnalyticsGiftCardFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: giftCardFunnelArea,
        steps: giftCardFunnelSteps,
        labels: FUNNEL_LABELS,
        lifecycleTypes: [
            { type: 'GIFT_CARD_CREATED', step: 'created' },
            { type: 'GIFT_CARD_PAYED', step: 'paid' },
        ],
        excludeCooks: true,
    });
}
