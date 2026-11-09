export type SessionAuthOtp = {
    verifiedAt?: string | Date | null;
};

export type SessionAuthOauthTicket = {
    verifiedAt?: string | Date | null;
} | null;

export type SessionAuthTotpChallenge = {
    expiresAt?: string | Date | null;
} | null;

export type SessionAuthLegalAcceptance = {
    required: boolean;
} | null;

export type SessionAuthPhase = 'anonymous' | 'otpPending' | 'register' | 'totpPending' | 'legalPending' | 'signedIn';

/** Every create path (self-serve register + admin create) collects a full profile. */
export function sessionAuthPhase(session: {
    user:
        | {
              userId: string;
              legalAcceptance?: SessionAuthLegalAcceptance;
          }
        | null
        | undefined;
    authEmailOtp: SessionAuthOtp | null | undefined;
    authOauthTicket?: SessionAuthOauthTicket;
    authTotpChallenge?: SessionAuthTotpChallenge;
}): SessionAuthPhase {
    if (session.user) {
        if (session.user.legalAcceptance?.required) {
            return 'legalPending';
        }
        return 'signedIn';
    }
    if (session.authTotpChallenge) {
        return 'totpPending';
    }
    if (session.authEmailOtp?.verifiedAt || session.authOauthTicket?.verifiedAt) {
        return 'register';
    }
    if (session.authEmailOtp) {
        return 'otpPending';
    }
    return 'anonymous';
}
