import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationCookPresenceLinksReplaceArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookPresenceLinksReplaceApply } from '../utils/cookPresenceLinksReplaceApply';

/**
 * Admin replace of a cook's private review links. Legal acceptance is asserted
 * on the admin, not the cook. Not gated by `COOK_PRESENCE_LINKS`.
 */
export async function adminCookPresenceLinksReplace(
    { adminId }: GqlSAdminMutation,
    { cookId, input }: GqlSAdminMutationCookPresenceLinksReplaceArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);
    return cookPresenceLinksReplaceApply(cookId, input, requestingSession, serverRuntime, 'adminCookPresenceLinksReplace');
}
