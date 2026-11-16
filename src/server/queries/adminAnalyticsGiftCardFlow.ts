import { t } from '../../i18n/t';
import { giftCardFunnelArea, giftCardFunnelSteps } from '../../shared/giftCardFunnel';
import type { GiftCardFunnelStep } from '../../shared/giftCardFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(): Record<GiftCardFunnelStep, { de: string; en: string }> {
    return {
        configure: {
            de: t('de', 'admin', 'analytics.funnels.giftCard.configure'),
            en: t('en', 'admin', 'analytics.funnels.giftCard.configure'),
        },
        auth: {
            de: t('de', 'admin', 'analytics.funnels.giftCard.auth'),
            en: t('en', 'admin', 'analytics.funnels.giftCard.auth'),
        },
        created: {
            de: t('de', 'admin', 'analytics.funnels.giftCard.created'),
            en: t('en', 'admin', 'analytics.funnels.giftCard.created'),
        },
        checkout: {
            de: t('de', 'admin', 'analytics.funnels.giftCard.checkout'),
            en: t('en', 'admin', 'analytics.funnels.giftCard.checkout'),
        },
        paid: {
            de: t('de', 'admin', 'analytics.funnels.giftCard.paid'),
            en: t('en', 'admin', 'analytics.funnels.giftCard.paid'),
        },
    };
}

export async function adminAnalyticsGiftCardFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: giftCardFunnelArea,
        steps: giftCardFunnelSteps,
        labels: funnelLabels(),
        lifecycleTypes: [
            { type: 'GIFT_CARD_CREATED', step: 'created' },
            { type: 'GIFT_CARD_PAYED', step: 'paid' },
        ],
        excludeCooks: true,
    });
}
