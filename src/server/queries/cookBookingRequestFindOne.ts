import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequest, GqlSCookBookingRequestArgs, GqlSSession } from '../graphql/generated';
import { cookBookingRequestFindMany } from './cookBookingRequestFindMany';

export async function cookBookingRequestFindOne(
    parent: GqlSCook,
    args: GqlSCookBookingRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequest | null> {
    const rows = await cookBookingRequestFindMany(parent, { criterion: { onlyDeclined: false } }, requestingSession, serverRuntime);
    const declined = await cookBookingRequestFindMany(parent, { criterion: { onlyDeclined: true } }, requestingSession, serverRuntime);
    return [...rows, ...declined].find((row) => row.bookingRequestId === args.bookingRequestId) ?? null;
}
