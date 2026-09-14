import { and, eq } from 'drizzle-orm';

import { cookCallAvailabilityExceptions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationCallAvailabilityExceptionDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookCallAvailabilityExceptionDelete(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationCallAvailabilityExceptionDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(cookCallAvailabilityExceptions)
            .where(
                and(
                    eq(cookCallAvailabilityExceptions.cookCallAvailabilityExceptionId, args.cookCallAvailabilityExceptionId),
                    eq(cookCallAvailabilityExceptions.cookId, cookId),
                ),
            )
            .returning({ cookCallAvailabilityExceptionId: cookCallAvailabilityExceptions.cookCallAvailabilityExceptionId });

        if (deleted.length === 0) {
            throw new Error('cookCallAvailabilityExceptionDelete: exception not found');
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.cookCallAvailabilityExceptionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
