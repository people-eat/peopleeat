import { t } from '../../i18n/t';
import { bookingRequestCheckoutFunnelArea, bookingRequestCheckoutFunnelSteps } from '../../shared/bookingRequestCheckoutFunnel';
import type { BookingRequestCheckoutFunnelStep } from '../../shared/bookingRequestCheckoutFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(): Record<BookingRequestCheckoutFunnelStep, { de: string; en: string }> {
    return {
        checkout: {
            de: t('de', 'admin', 'analytics.funnels.checkout.checkout'),
            en: t('en', 'admin', 'analytics.funnels.checkout.checkout'),
        },
        paid: {
            de: t('de', 'admin', 'analytics.funnels.checkout.paid'),
            en: t('en', 'admin', 'analytics.funnels.checkout.paid'),
        },
    };
}

export async function adminAnalyticsBookingRequestCheckoutFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: bookingRequestCheckoutFunnelArea,
        steps: bookingRequestCheckoutFunnelSteps,
        labels: funnelLabels(),
        lifecycleTypes: [{ type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED', step: 'paid' }],
        excludeCooks: true,
    });
}
