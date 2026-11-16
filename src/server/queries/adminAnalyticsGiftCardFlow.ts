import { t } from '../../i18n/t';
import { giftCardFunnelArea, giftCardFunnelSteps } from '../../shared/giftCardFunnel';
import type { GiftCardFunnelStep } from '../../shared/giftCardFunnel';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { userLocaleRequire } from '../utils/userLocaleRequire';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(locale: Locale): Record<GiftCardFunnelStep, string> {
    return {
        configure: t(locale, 'admin', 'analytics.funnels.giftCard.configure'),
        auth: t(locale, 'admin', 'analytics.funnels.giftCard.auth'),
        created: t(locale, 'admin', 'analytics.funnels.giftCard.created'),
        checkout: t(locale, 'admin', 'analytics.funnels.giftCard.checkout'),
        paid: t(locale, 'admin', 'analytics.funnels.giftCard.paid'),
    };
}

export async function adminAnalyticsGiftCardFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: giftCardFunnelArea,
        steps: giftCardFunnelSteps,
        labels: funnelLabels(locale),
        lifecycleTypes: [
            { type: 'GIFT_CARD_CREATED', step: 'created' },
            { type: 'GIFT_CARD_PAYED', step: 'paid' },
        ],
        excludeCooks: true,
    });
}
