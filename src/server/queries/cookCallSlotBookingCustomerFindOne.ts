import { eq } from 'drizzle-orm';

import { DEFAULT_TIME_ZONE } from '../../shared';
import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookCallSlotBooking, GqlSCookCallSlotBookingCustomer, GqlSSession } from '../graphql/generated';

export async function cookCallSlotBookingCustomerFindOne(
    parent: GqlSCookCallSlotBooking,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookCallSlotBookingCustomer> {
    if (parent.customer.display && parent.customer.timeZone) {
        return parent.customer;
    }

    try {
        const [row] = await serverRuntime.db
            .select({ firstName: users.firstName, timeZone: users.timeZone })
            .from(users)
            .where(eq(users.userId, parent.userId))
            .limit(1);

        return {
            display: parent.customer.display || row?.firstName || '',
            timeZone: parent.customer.timeZone || row?.timeZone || DEFAULT_TIME_ZONE,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
