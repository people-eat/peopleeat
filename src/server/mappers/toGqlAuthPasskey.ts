import type { AuthPasskey } from '../db/schema';
import type { GqlSAuthPasskey } from '../graphql/generated';

export function toGqlAuthPasskey(passkey: AuthPasskey): GqlSAuthPasskey {
    return {
        authPasskeyId: passkey.authPasskeyId,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
    };
}
