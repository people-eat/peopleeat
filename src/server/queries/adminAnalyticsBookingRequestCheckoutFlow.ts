import { t } from '../../i18n/t';
import { bookingRequestCheckoutFunnelArea, bookingRequestCheckoutFunnelSteps } from '../../shared/bookingRequestCheckoutFunnel';
import type { BookingRequestCheckoutFunnelStep } from '../../shared/bookingRequestCheckoutFunnel';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { userLocaleRequire } from '../utils/userLocaleRequire';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(locale: Locale): Record<BookingRequestCheckoutFunnelStep, string> {
    return {
        checkout: t(locale, 'admin', 'analytics.funnels.checkout.checkout'),
        paid: t(locale, 'admin', 'analytics.funnels.checkout.paid'),
    };
}

export async function adminAnalyticsBookingRequestCheckoutFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: bookingRequestCheckoutFunnelArea,
        steps: bookingRequestCheckoutFunnelSteps,
        labels: funnelLabels(locale),
        lifecycleTypes: [{ type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED', step: 'paid' }],
        excludeCooks: true,
    });
}
