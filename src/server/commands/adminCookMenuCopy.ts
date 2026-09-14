import { and, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMenuCopyArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { menuDeepCopyInsert } from '../utils/menuDeepCopyInsert';

/** Admin deep-copy of an inventory cook menu into a new draft. */
export async function adminCookMenuCopy(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationCookMenuCopyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [current] = await serverRuntime.db
            .select({ cookId: menus.cookId })
            .from(menus)
            .where(and(eq(menus.menuId, args.menuId), isNull(menus.deletedAt), isNull(menus.bookingRequestOfferId)))
            .limit(1);

        if (!current) {
            throw new Error('adminCookMenuCopy: menu not found');
        }

        const newMenuId = await serverRuntime.db.transaction(async (transaction) =>
            menuDeepCopyInsert(transaction, {
                cookId: current.cookId,
                sourceMenuId: args.menuId,
            }),
        );

        await Promise.all([serverRuntime.publish.userUpdates({ userId: current.cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: newMenuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
