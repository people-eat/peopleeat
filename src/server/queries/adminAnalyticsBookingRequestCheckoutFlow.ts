import { bookingRequestCheckoutFunnelArea, bookingRequestCheckoutFunnelSteps } from '../../shared/bookingRequestCheckoutFunnel';
import type { BookingRequestCheckoutFunnelStep } from '../../shared/bookingRequestCheckoutFunnel';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsSessionFunnelFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

const FUNNEL_LABELS: Record<BookingRequestCheckoutFunnelStep, { de: string; en: string }> = {
    checkout: { de: 'Checkout', en: 'Checkout' },
    paid: { de: 'Bezahlt', en: 'Paid' },
};

export async function adminAnalyticsBookingRequestCheckoutFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsSessionFunnelFlow> {
    return adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: bookingRequestCheckoutFunnelArea,
        steps: bookingRequestCheckoutFunnelSteps,
        labels: FUNNEL_LABELS,
        lifecycleTypes: [{ type: 'BOOKING_REQUEST_OFFER_PAYMENT_SUCCEEDED', step: 'paid' }],
        excludeCooks: true,
    });
}
