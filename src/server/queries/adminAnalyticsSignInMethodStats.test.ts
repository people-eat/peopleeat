import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessionEvents, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { adminAnalyticsSignInMethodStats } from './adminAnalyticsSignInMethodStats';

function windowCreate() {
    const startMs = Date.UTC(2400, 0, 1) + Math.floor(Math.random() * 1e12);
    return {
        range: { startDateTime: new Date(startMs), endDateTime: new Date(startMs + 86_400_000) },
        at(index: number) {
            return new Date(startMs + (index + 1) * 1_000);
        },
    };
}

async function stamp(sessionEventId: string, createdAt: Date) {
    await testDb.update(sessionEvents).set({ createdAt }).where(eq(sessionEvents.sessionEventId, sessionEventId));
}

describe('adminAnalyticsSignInMethodStats', () => {
    it('counts sign-ins, registration tickets, Google account creates, and subtracts them from email creates', async () => {
        const setup = await commandSetup();
        const window = windowCreate();
        const sessionId = setup.requestingSession.sessionId;

        const googleSignIn = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
            payload: { provider: 'GOOGLE', outcome: 'sign_in' },
        });
        await stamp(googleSignIn.sessionEventId, window.at(0));

        const googleTicket = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
            payload: { provider: 'GOOGLE', outcome: 'registration_ticket' },
        });
        await stamp(googleTicket.sessionEventId, window.at(1));

        const googleCreated = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_ACCOUNT_CREATED',
            payload: { provider: 'GOOGLE' },
        });
        await stamp(googleCreated.sessionEventId, window.at(2));

        const userCreated = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'USER_CREATE_SUCCESSFUL',
            payload: {},
        });
        await stamp(userCreated.sessionEventId, window.at(3));

        const emailSignIn = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'AUTH_EMAIL_OTP_VERIFY_SUCCEEDED',
            payload: { outcome: 'sign_in' },
        });
        await stamp(emailSignIn.sessionEventId, window.at(4));

        const passkeyFail = await sessionEventCreate(setup.serverRuntime, {
            sessionId,
            type: 'AUTH_PASSKEY_SIGN_IN_FAILED',
            payload: {},
        });
        await stamp(passkeyFail.sessionEventId, window.at(5));

        const botSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: botSessionId, isBot: true });
        const botEvent = await sessionEventCreate(setup.serverRuntime, {
            sessionId: botSessionId,
            type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
            payload: { provider: 'GOOGLE', outcome: 'sign_in' },
        });
        await stamp(botEvent.sessionEventId, window.at(6));

        const stats = await adminAnalyticsSignInMethodStats(window.range, setup.requestingSession, setup.serverRuntime);
        const google = stats.methods.find((row) => row.method === 'GOOGLE');
        const email = stats.methods.find((row) => row.method === 'EMAIL_OTP');
        const passkey = stats.methods.find((row) => row.method === 'PASSKEY');

        expect(google).toMatchObject({
            signInCount: 1,
            registrationTicketCount: 1,
            accountCreatedCount: 1,
            failedCount: 0,
        });
        expect(email).toMatchObject({
            signInCount: 1,
            accountCreatedCount: 0,
        });
        expect(passkey?.failedCount).toBe(1);
        expect(stats.buckets.some((bucket) => bucket.method === 'GOOGLE' && bucket.signInCount === 1)).toBe(true);
    });
});
