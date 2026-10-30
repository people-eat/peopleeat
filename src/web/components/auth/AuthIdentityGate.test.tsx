import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import type { Client, OperationResult } from 'urql';
import { Provider } from 'urql';
import { describe, expect, it, vi } from 'vitest';
import { fromValue, never } from 'wonka';

import type { AuthSession } from './AuthIdentityGate';
import { AuthIdentityGate } from './AuthIdentityGate';

vi.mock('../../hooks/useLocale', () => ({ useLocale: () => 'en' as const }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const otpPendingSession: AuthSession = {
    sessionId: 'session-1',
    activeFeatureToggleKeys: [],
    user: null,
    authEmailOtp: {
        authEmailOtpId: 'otp-1',
        emailAddress: 'guest@example.com',
        expiresAt: '2099-01-01T00:00:00.000Z',
        verifiedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
    },
    authTotpChallenge: null,
};

const signedInSession: AuthSession = {
    sessionId: 'session-1',
    activeFeatureToggleKeys: [],
    user: {
        userId: 'user-1',
        emailAddress: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        phoneNumber: null,
        birthDate: null,
        preferredCommunication: null,
        admin: null,
        cook: null,
    },
    authEmailOtp: null,
    authTotpChallenge: null,
};

function clientWithDeadSubscription(verifyResult: Partial<OperationResult>) {
    return {
        executeSubscription: vi.fn(() => never),
        executeMutation: vi.fn(() => fromValue(verifyResult)),
        query: vi.fn(() => ({ toPromise: () => Promise.resolve({ data: { currentSession: signedInSession } }) })),
    } as unknown as Client;
}

function gateRender(client: Client, onReady: (session: AuthSession) => void) {
    render(
        <Provider value={client}>
            <AuthIdentityGate initialSession={otpPendingSession} onReady={onReady} />
        </Provider>,
    );
}

describe('AuthIdentityGate', () => {
    it('signs in after OTP verify even when no sessionUpdates push arrives', async () => {
        // Arrange
        const client = clientWithDeadSubscription({ data: { authEmailOtpVerify: { success: true, referenceId: 'user-1' } } });
        const onReady = vi.fn();
        gateRender(client, onReady);

        // Act
        fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });

        // Assert
        await waitFor(() => expect(onReady).toHaveBeenCalledWith(signedInSession));
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('does not report an invalid code when an earlier verify already signed the session in', async () => {
        // Arrange
        const client = clientWithDeadSubscription({
            data: null,
            error: { message: 'authEmailOtpVerify: already signed in' } as OperationResult['error'],
        });
        const onReady = vi.fn();
        gateRender(client, onReady);

        // Act
        fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });

        // Assert
        await waitFor(() => expect(onReady).toHaveBeenCalledWith(signedInSession));
        expect(toast.error).not.toHaveBeenCalled();
    });
});
