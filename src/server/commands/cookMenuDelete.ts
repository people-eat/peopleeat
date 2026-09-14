import { and, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMenuDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookMenuDelete(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const now = new Date();
        const updated = await serverRuntime.db
            .update(menus)
            .set({ deletedAt: now, updatedAt: now })
            .where(
                and(eq(menus.menuId, args.menuId), eq(menus.cookId, cookId), isNull(menus.deletedAt), isNull(menus.bookingRequestOfferId)),
            )
            .returning({ menuId: menus.menuId });

        if (updated.length === 0) {
            throw new Error('cookMenuDelete: menu not found');
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
