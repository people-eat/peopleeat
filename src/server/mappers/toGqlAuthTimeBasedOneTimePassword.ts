import type { AuthTimeBasedOneTimePassword } from '../db/schema';
import type { GqlSAuthTimeBasedOneTimePassword } from '../graphql/generated';
import { authTotpRecoveryCodesRemaining } from '../utils/authTotpUtils';

export function toGqlAuthTimeBasedOneTimePassword(row: AuthTimeBasedOneTimePassword): GqlSAuthTimeBasedOneTimePassword {
    return {
        authTimeBasedOneTimePasswordId: row.authTimeBasedOneTimePasswordId,
        confirmedAt: row.confirmedAt,
        recoveryCodesRemaining: authTotpRecoveryCodesRemaining(row.recoveryCodes),
        createdAt: row.createdAt,
    };
}
