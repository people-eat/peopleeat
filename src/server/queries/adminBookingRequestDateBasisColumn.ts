import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { GqlSAdminBookingRequestDateBasis } from '../graphql/generated';

/** SQL identifier for the booking-request timestamp used by conversion stats. */
export function adminBookingRequestDateBasisColumn(dateBasis: GqlSAdminBookingRequestDateBasis): SQL {
    return dateBasis === 'dateTime' ? sql.raw('br."dateTime"') : sql.raw('br."createdAt"');
}
