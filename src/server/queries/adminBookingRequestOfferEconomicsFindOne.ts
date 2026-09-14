import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOfferEconomics, GqlSSession } from '../graphql/generated';

/** All-time offer funnel economics for the booking-requests overview. */
export async function adminBookingRequestOfferEconomicsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOfferEconomics> {
    try {
        const result = await serverRuntime.db.execute<{
            average_offers_per_request: string | number | null;
            average_menu_price_cents: string | number | null;
            average_paid_customer_total_cents: string | number | null;
            average_paid_platform_revenue_cents: string | number | null;
        }>(sql`
            SELECT
                COALESCE(
                    (SELECT COUNT(*)::float FROM "BookingRequestOffers")
                    / NULLIF((SELECT COUNT(*)::float FROM "BookingRequests"), 0),
                    0
                ) AS average_offers_per_request,
                COALESCE((SELECT ROUND(AVG("menuPriceCents"))::int FROM "BookingRequestOffers"), 0) AS average_menu_price_cents,
                COALESCE(
                    (
                        SELECT ROUND(AVG(COALESCE("totalCentsCustomer", "totalWithoutDiscountsCentsCustomer")))::int
                        FROM "BookingRequestOffers"
                        WHERE "paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                    ),
                    0
                ) AS average_paid_customer_total_cents,
                COALESCE(
                    (
                        SELECT ROUND(AVG("platformFeeCentsCook" + "platformFeeCentsCustomer"))::int
                        FROM "BookingRequestOffers"
                        WHERE "paymentStatus" IN ('PAYED', 'TRANSFERRED', 'PAYED_OUT_OF_SYSTEM')
                    ),
                    0
                ) AS average_paid_platform_revenue_cents
        `);

        const rows = Array.isArray(result) ? result : result.rows;
        const row = rows[0];

        return {
            averageOffersPerRequest: Number(row?.average_offers_per_request ?? 0),
            averageMenuPriceCents: Number(row?.average_menu_price_cents ?? 0),
            averagePaidCustomerTotalCents: Number(row?.average_paid_customer_total_cents ?? 0),
            averagePaidPlatformRevenueCents: Number(row?.average_paid_platform_revenue_cents ?? 0),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
