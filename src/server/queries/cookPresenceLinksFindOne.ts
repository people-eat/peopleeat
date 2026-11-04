import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookPresenceLinks } from '../graphql/generated';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

/** Cook-facing read. Null when `COOK_PRESENCE_LINKS` is off, even if a document is stored. */
export async function cookPresenceLinksFindOne(
    parent: Pick<GqlSCook, 'cookId' | 'presenceLinks'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookPresenceLinks | null> {
    const enabled = await featureToggleIsEnabled('COOK_PRESENCE_LINKS', serverRuntime, parent.cookId);
    if (!enabled) return null;
    return parent.presenceLinks ?? null;
}
