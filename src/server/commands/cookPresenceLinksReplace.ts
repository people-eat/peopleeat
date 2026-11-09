import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationPresenceLinksReplaceArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookPresenceLinksReplaceApply } from '../utils/cookPresenceLinksReplaceApply';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookPresenceLinksReplace(
    { cookId }: GqlSCookMutation,
    { input }: GqlSCookMutationPresenceLinksReplaceArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    const enabled = await featureToggleIsEnabled('COOK_PRESENCE_LINKS', serverRuntime, cookId);
    if (!enabled) {
        throw new Error('cookPresenceLinksReplace: COOK_PRESENCE_LINKS is disabled');
    }

    return cookPresenceLinksReplaceApply(cookId, input, requestingSession, serverRuntime, 'cookPresenceLinksReplace');
}
