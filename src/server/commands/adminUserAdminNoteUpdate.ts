import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationUserAdminNoteUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminUserAdminNoteUpdate(
    { adminId }: GqlSAdminMutation,
    { userId, adminNote }: GqlSAdminMutationUserAdminNoteUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    // Phase 1 — Payload construction (pure, no DB calls)
    const adminNoteUpdate = adminNote.trim();

    // Phase 2 — Single-write execution
    try {
        const [updated] = await serverRuntime.db
            .update(users)
            .set({ adminNote: adminNoteUpdate })
            .where(eq(users.userId, userId))
            .returning({ userId: users.userId });

        if (!updated) {
            throw new Error('adminUserAdminNoteUpdate: user not found');
        }

        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: userId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
