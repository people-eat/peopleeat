import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMenuCopyArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { menuDeepCopyInsert } from '../utils/menuDeepCopyInsert';

export async function cookMenuCopy(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMenuCopyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const newMenuId = await serverRuntime.db.transaction(async (transaction) =>
            menuDeepCopyInsert(transaction, {
                cookId,
                sourceMenuId: args.menuId,
            }),
        );

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: newMenuId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
