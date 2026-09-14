import { desc, eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookTravelOriginAddress, GqlSSession, GqlSUser } from '../graphql/generated';
import { toGqlCookTravelOriginAddress } from '../mappers/toGqlCook';

const PREVIOUS_EVENT_ADDRESSES_MAX = 5;

function previousEventAddressKey(address: { addressLine1: string; postCode: string; city: string; country: string }): string {
    return [address.addressLine1, address.postCode, address.city, address.country].map((part) => part.trim().toLowerCase()).join('|');
}

export async function userPreviousEventAddressesFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookTravelOriginAddress[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const rows = await serverRuntime.db
            .select({ exactEventAddress: bookingRequests.exactEventAddress })
            .from(bookingRequests)
            .where(eq(bookingRequests.userId, parentUser.userId))
            .orderBy(desc(bookingRequests.createdAt));

        const unique: GqlSCookTravelOriginAddress[] = [];
        const seen = new Set<string>();
        for (const row of rows) {
            const key = previousEventAddressKey(row.exactEventAddress);
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(toGqlCookTravelOriginAddress(row.exactEventAddress));
            if (unique.length >= PREVIOUS_EVENT_ADDRESSES_MAX) break;
        }
        return unique;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
