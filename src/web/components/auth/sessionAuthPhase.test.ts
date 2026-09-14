import { describe, expect, it } from 'vitest';

import { sessionAuthPhase } from './sessionAuthPhase';

describe('sessionAuthPhase', () => {
    it('detects anonymous', () => {
        expect(sessionAuthPhase({ user: null, authEmailOtp: null })).toBe('anonymous');
    });

    it('detects otp pending', () => {
        expect(sessionAuthPhase({ user: null, authEmailOtp: { verifiedAt: null } })).toBe('otpPending');
    });

    it('detects register ticket', () => {
        expect(sessionAuthPhase({ user: null, authEmailOtp: { verifiedAt: '2026-01-01T00:00:00.000Z' } })).toBe('register');
    });

    it('detects signed-in user', () => {
        expect(sessionAuthPhase({ user: { userId: 'u1' }, authEmailOtp: null })).toBe('signedIn');
    });

    it('detects totp pending before signed-in', () => {
        expect(
            sessionAuthPhase({
                user: null,
                authEmailOtp: null,
                authTotpChallenge: { expiresAt: '2026-01-01T00:15:00.000Z' },
            }),
        ).toBe('totpPending');
    });

    it('prefers signed-in over a stale totp challenge', () => {
        expect(
            sessionAuthPhase({
                user: { userId: 'u1' },
                authEmailOtp: null,
                authTotpChallenge: { expiresAt: '2026-01-01T00:15:00.000Z' },
            }),
        ).toBe('signedIn');
    });
});
