import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCook, GqlSAdminUser, GqlSSession } from '../graphql/generated';
import { adminUserFindOne } from './adminUserFindOne';

/** Resolve `AdminCook.user` — `cookId` equals `Users.userId`. */
export async function adminCookUserFindOne(
    parent: GqlSAdminCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUser> {
    const user = await adminUserFindOne({ userId: parent.cookId }, requestingSession, serverRuntime);
    if (!user) {
        throw new Error(`adminCookUserFindOne: user missing for cookId ${parent.cookId}`);
    }
    return user;
}
