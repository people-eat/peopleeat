import type { AuthEmailOtp } from '../db/schema';
import type { GqlSAuthEmailOtp } from '../graphql/generated';

export function toGqlAuthEmailOtp(otp: AuthEmailOtp): GqlSAuthEmailOtp {
    return {
        authEmailOtpId: otp.authEmailOtpId,
        emailAddress: otp.emailAddress,
        expiresAt: otp.expiresAt,
        verifiedAt: otp.verifiedAt ?? null,
        createdAt: otp.createdAt,
    };
}
