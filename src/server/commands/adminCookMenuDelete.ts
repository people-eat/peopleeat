import { and, eq, isNull } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMenuDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/** Admin soft-delete of an inventory cook menu. */
export async function adminCookMenuDelete(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationCookMenuDeleteArgs,
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
            throw new Error('adminCookMenuDelete: menu not found');
        }

        const now = new Date();
        const updated = await serverRuntime.db
            .update(menus)
            .set({ deletedAt: now, updatedAt: now })
            .where(
                and(
                    eq(menus.menuId, args.menuId),
                    eq(menus.cookId, current.cookId),
                    isNull(menus.deletedAt),
                    isNull(menus.bookingRequestOfferId),
                ),
            )
            .returning({ menuId: menus.menuId });

        if (updated.length === 0) {
            throw new Error('adminCookMenuDelete: menu not found');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: current.cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: args.menuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
