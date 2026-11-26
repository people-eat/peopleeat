import { t } from '../../i18n/t';
import { bookingRequestFormFunnelArea, bookingRequestFormFunnelSteps } from '../../shared/bookingRequestFormFunnel';
import type { BookingRequestFormFunnelStep } from '../../shared/bookingRequestFormFunnel';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAnalyticsBookingRequestFormFlow, GqlSDateTimeRange, GqlSSession } from '../graphql/generated';
import { userLocaleRequire } from '../utils/userLocaleRequire';
import { adminAnalyticsSessionFunnelFlow } from './adminAnalyticsSessionFunnelFlow';

function funnelLabels(locale: Locale): Record<BookingRequestFormFunnelStep, string> {
    return {
        occasion: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.occasion'),
        participants: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.participants'),
        location: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.location'),
        dateTime: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.dateTime'),
        priceClass: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.priceClass'),
        preferences: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.preferences'),
        restrictions: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.restrictions'),
        message: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.message'),
        auth: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.auth'),
        created: t(locale, 'admin', 'analytics.funnels.bookingRequestForm.created'),
    };
}

/**
 * Booking-form Sankey plus per-step entered/completed session counts, for human
 * sessions whose user is not an admin or cook.
 */
export async function adminAnalyticsBookingRequestFormFlow(
    range: GqlSDateTimeRange,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAnalyticsBookingRequestFormFlow> {
    const locale = requestingSession.userId ? await userLocaleRequire(serverRuntime, requestingSession.userId) : DEFAULT_LOCALE;
    const flow = await adminAnalyticsSessionFunnelFlow(range, requestingSession, serverRuntime, {
        area: bookingRequestFormFunnelArea,
        steps: bookingRequestFormFunnelSteps,
        labels: funnelLabels(locale),
        lifecycleTypes: [{ type: 'BOOKING_REQUEST_CREATED', step: 'created' }],
        excludeCooks: true,
    });
    return {
        nodes: flow.nodes,
        links: flow.links,
        steps: flow.steps,
        sessionsWithCompletion: flow.sessionsWithCompletion,
        bookingRequestsCreated: flow.terminalCount,
    };
}
