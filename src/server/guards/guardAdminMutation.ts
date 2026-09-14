import { eq } from 'drizzle-orm';
import { admins } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSSession } from '../graphql/generated';

// Gates the admin write namespace (`Mutation.admin`).
//
// Read-side equivalent: `userAdminFindOne` (wired as `User.admin`) runs the
// same `Admins` membership check but returns null instead of throwing, so the
// field can be composed off the public `currentSession.user` shape (drives
// admin entry points on public pages). The write side stays throw-on-mismatch —
// `Mutation.admin` is non-nullable and the resolver throws when the caller is
// not an admin so a bad request fails loudly. See
// `docs/architecture/authorization-admin.md`.
//
// Stamps `adminId` on the parent via module augmentation in `extensions.ts`
// (not in the SDL) so child commands can read identity without a wire field.
export async function guardAdminMutation(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdminMutation> {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }
    const [row] = await serverRuntime.db
        .select({ adminId: admins.adminId })
        .from(admins)
        .where(eq(admins.adminId, requestingSession.userId))
        .limit(1);
    if (!row) {
        throw new Error('Unauthorized');
    }
    return { adminId: requestingSession.userId } as GqlSAdminMutation;
}
