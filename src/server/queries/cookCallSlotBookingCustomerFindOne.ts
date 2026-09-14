import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookCallSlotBooking, GqlSCookCallSlotBookingCustomer, GqlSSession } from '../graphql/generated';

export async function cookCallSlotBookingCustomerFindOne(
    parent: GqlSCookCallSlotBooking,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookCallSlotBookingCustomer> {
    if (parent.customer.display) {
        return parent.customer;
    }

    try {
        const [row] = await serverRuntime.db
            .select({ firstName: users.firstName })
            .from(users)
            .where(eq(users.userId, parent.userId))
            .limit(1);

        return { display: row?.firstName ?? '' };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
