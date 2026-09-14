export type SessionAuthOtp = {
    verifiedAt?: string | Date | null;
};

export type SessionAuthTotpChallenge = {
    expiresAt?: string | Date | null;
} | null;

export type SessionAuthPhase = 'anonymous' | 'otpPending' | 'register' | 'totpPending' | 'signedIn';

/** Every create path (self-serve register + admin create) collects a full profile. */
export function sessionAuthPhase(session: {
    user: { userId: string } | null | undefined;
    authEmailOtp: SessionAuthOtp | null | undefined;
    authTotpChallenge?: SessionAuthTotpChallenge;
}): SessionAuthPhase {
    if (session.user) {
        return 'signedIn';
    }
    if (session.authTotpChallenge) {
        return 'totpPending';
    }
    if (session.authEmailOtp?.verifiedAt) {
        return 'register';
    }
    if (session.authEmailOtp) {
        return 'otpPending';
    }
    return 'anonymous';
}
