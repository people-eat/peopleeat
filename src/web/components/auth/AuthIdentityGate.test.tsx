import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { toast } from 'sonner';
import type { Client, OperationResult } from 'urql';
import { Provider } from 'urql';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fromValue, never } from 'wonka';

import { i18nResourcesLoad } from '../../../i18n/catalogCache';
import { i18nCreateSync } from '../../../i18n/i18nCreate';

import type { AuthSession } from './AuthIdentityGate';
import { AuthIdentityGate } from './AuthIdentityGate';

vi.mock('../../hooks/useLocale', () => ({ useLocale: () => 'en' as const }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to, target }: { children: ReactNode; to: string; target?: string }) => (
        <a href={to} target={target}>
            {children}
        </a>
    ),
}));

const legalAcceptanceCurrent = {
    required: false,
    pendingPrivacyPolicy: null,
    pendingTermsAndConditions: null,
} as const;

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
    authOauthTicket: null,
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
        legalAcceptance: legalAcceptanceCurrent,
    },
    authEmailOtp: null,
    authOauthTicket: null,
    authTotpChallenge: null,
};

const legalPendingSession: AuthSession = {
    ...signedInSession,
    user: {
        ...signedInSession.user!,
        legalAcceptance: {
            required: true,
            pendingPrivacyPolicy: null,
            pendingTermsAndConditions: {
                termsAndConditionsId: 'terms-1',
                changeSummaryDe: 'Updated cancellation rules',
                publishedAt: '2026-11-01T00:00:00.000Z',
            },
        },
    },
};

function operationName(query: { definitions?: ReadonlyArray<{ kind?: string; name?: { value?: string } }> }): string | undefined {
    return query.definitions?.find((definition) => definition.kind === 'OperationDefinition')?.name?.value;
}

function clientWithDeadSubscription(verifyResult: Partial<OperationResult>, sessionAfterVerify: AuthSession = signedInSession) {
    return {
        executeSubscription: vi.fn(() => never),
        executeMutation: vi.fn(() => fromValue(verifyResult)),
        query: vi.fn(() => ({ toPromise: () => Promise.resolve({ data: { currentSession: sessionAfterVerify } }) })),
    } as unknown as Client;
}

let i18n: ReturnType<typeof i18nCreateSync>;

beforeAll(async () => {
    await i18nResourcesLoad('en', ['common', 'public']);
    i18n = i18nCreateSync('en', ['common', 'public']);
    void i18n.use(initReactI18next);
});

function gateRender(client: Client, onReady: (session: AuthSession) => void) {
    render(
        <I18nextProvider i18n={i18n}>
            <Provider value={client}>
                <AuthIdentityGate initialSession={otpPendingSession} onReady={onReady} />
            </Provider>
        </I18nextProvider>,
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

    it('does not call onReady while latest legal terms are still pending', async () => {
        // Arrange
        const client = clientWithDeadSubscription(
            { data: { authEmailOtpVerify: { success: true, referenceId: 'user-1' } } },
            legalPendingSession,
        );
        const onReady = vi.fn();
        gateRender(client, onReady);

        // Act
        fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });

        // Assert
        await waitFor(() => {
            screen.getByRole('button', { name: 'I agree' });
        });
        expect(screen.getByText('Updated legal terms')).toBeTruthy();
        expect(screen.getByText('Updated cancellation rules')).toBeTruthy();
        expect(onReady).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('calls onReady after the pending legal terms are accepted', async () => {
        // Arrange
        let currentSession: AuthSession = legalPendingSession;
        const client = {
            executeSubscription: vi.fn(() => never),
            executeMutation: vi.fn((request: { query: { definitions?: ReadonlyArray<{ kind?: string; name?: { value?: string } }> } }) => {
                if (operationName(request.query) === 'SessionStartupGatesLegalAccept') {
                    currentSession = signedInSession;
                    return fromValue({ data: { user: { userLegalAccept: { success: true } } } });
                }
                return fromValue({ data: { authEmailOtpVerify: { success: true, referenceId: 'user-1' } } });
            }),
            query: vi.fn(() => ({ toPromise: () => Promise.resolve({ data: { currentSession } }) })),
        } as unknown as Client;
        const onReady = vi.fn();
        gateRender(client, onReady);

        // Act
        fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
        await waitFor(() => {
            screen.getByRole('button', { name: 'I agree' });
        });
        fireEvent.click(screen.getByRole('button', { name: 'I agree' }));

        // Assert
        await waitFor(() => expect(onReady).toHaveBeenCalledWith(signedInSession));
        expect(toast.error).not.toHaveBeenCalled();
    });
});
