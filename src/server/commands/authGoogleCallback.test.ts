import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    authOauthIdentities,
    authOauthStates,
    authOauthTickets,
    authTimeBasedOneTimePasswords,
    featureToggles,
    featureToggleUserOverrides,
    fileUploads,
    sessionEvents,
    sessions,
} from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { AUTH_OAUTH_STATE_TTL_MS } from '../utils/authGoogleOauth';
import { authGoogleCallback } from './authGoogleCallback';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const testEnv = {
    googleOauthClientId: 'test-google-oauth-client-id',
    googleOauthClientSecret: 'test-google-oauth-client-secret',
    googleOauthPeopleScopes: false,
    webPageUrl: 'https://example.com',
};

function jwtCreate(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.sig`;
}

function googleFetchMock(args: {
    nonce: string;
    subject: string;
    email: string;
    emailVerified?: boolean;
    givenName?: string;
    familyName?: string | null;
    pictureUrl?: string;
    peopleStatus?: number;
    peopleBody?: unknown;
}) {
    const idToken = jwtCreate({
        iss: 'https://accounts.google.com',
        aud: testEnv.googleOauthClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: args.nonce,
        sub: args.subject,
        email: args.email,
        email_verified: args.emailVerified ?? true,
        given_name: args.givenName ?? 'Ada',
        family_name: args.familyName === undefined ? 'Lovelace' : args.familyName,
    });
    return vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/token')) {
            return new Response(JSON.stringify({ access_token: 'access-token', id_token: idToken }), { status: 200 });
        }
        if (args.pictureUrl && url.includes('googleusercontent.com')) {
            return new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } });
        }
        if (url.includes('userinfo')) {
            return new Response(
                JSON.stringify({
                    sub: args.subject,
                    email: args.email,
                    given_name: args.givenName ?? 'Ada',
                    family_name: args.familyName === undefined ? 'Lovelace' : args.familyName,
                    ...(args.pictureUrl ? { picture: args.pictureUrl } : {}),
                }),
                { status: 200 },
            );
        }
        if (url.includes('people.googleapis.com')) {
            return new Response(JSON.stringify(args.peopleBody ?? {}), { status: args.peopleStatus ?? 403 });
        }
        return new Response('not found', { status: 404 });
    });
}

async function signInGoogleEnable(enabled = true) {
    await testDb.insert(featureToggles).values({ featureToggleKey: 'SIGN_IN_GOOGLE', enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

async function oauthStateInsert(sessionId: string, overrides: { nonce?: string; returnTo?: string; expiresAt?: Date } = {}) {
    const state = `state-${idCreate()}`;
    const nonce = overrides.nonce ?? `nonce-${idCreate()}`;
    await testDb.insert(authOauthStates).values({
        authOauthStateId: idCreate(),
        sessionId,
        state,
        codeVerifier: 'verifier',
        nonce,
        returnTo: overrides.returnTo ?? '/log-on',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + AUTH_OAUTH_STATE_TTL_MS),
    });
    return { state, nonce };
}

describe('authGoogleCallback', () => {
    afterEach(async () => {
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'SIGN_IN_GOOGLE'));
    });

    it('writes a registration ticket for a new verified Google email', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await signInGoogleEnable();
        const email = `google-new-${idCreate().toLowerCase()}@example.com`;
        const subject = `sub-${idCreate()}`;
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId);

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject, email, familyName: null }),
                env: testEnv,
            },
            serverRuntime,
        );

        expect(result.sessionId).toBe(requestingSession.sessionId);
        expect(result.returnTo).toBe('/log-on');
        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.emailAddress).toBe(email);
        expect(ticket?.firstName).toBe('Ada');
        expect(ticket?.lastName).toBeNull();
        expect(ticket?.phoneNumber).toBeNull();
        expect(ticket?.birthDate).toBeNull();
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
        expect(session?.userId).toBeNull();
        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(events.some((event) => event.type === 'AUTH_OAUTH_SIGN_IN_SUCCEEDED')).toBe(true);
    });

    it('binds an existing email and inserts the Google identity', async () => {
        const existing = await commandSetup.withUser();
        await signInGoogleEnable();
        const anonymous = await commandSetup();
        const { state, nonce } = await oauthStateInsert(anonymous.requestingSession.sessionId);
        const subject = `sub-${idCreate()}`;

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toBe('/log-on');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBe(existing.user.userId);
        const identities = await testDb.select().from(authOauthIdentities).where(eq(authOauthIdentities.userId, existing.user.userId));
        expect(identities).toHaveLength(1);
        expect(identities[0]?.subject).toBe(subject);
        expect(existing.user.firstName).toBe('test');
    });

    it('leaves the session unbound when the existing user has confirmed TOTP', async () => {
        const existing = await commandSetup.withUser();
        await testDb.insert(authTimeBasedOneTimePasswords).values({
            authTimeBasedOneTimePasswordId: idCreate(),
            userId: existing.user.userId,
            secretEncrypted: 'test-secret',
            confirmedAt: new Date(),
            recoveryCodes: [],
        });
        await signInGoogleEnable();
        const anonymous = await commandSetup();
        const { state, nonce } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject: `sub-${idCreate()}`, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBeNull();
        expect(session?.pendingTotpUserId).toBe(existing.user.userId);
    });

    it('rejects an anonymized account', async () => {
        const existing = await commandSetup.withUser({
            status: 'ANONYMIZED',
            emailAddress: `anon-${idCreate().toLowerCase()}@example.com`,
        });
        await signInGoogleEnable();
        const anonymous = await commandSetup();
        const { state, nonce } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject: `sub-${idCreate()}`, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=google');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBeNull();
    });

    it('refuses when Google sub and email belong to different users', async () => {
        const identityUser = await commandSetup.withUser();
        const emailUser = await commandSetup.withUser();
        const subject = `sub-${idCreate()}`;
        await testDb.insert(authOauthIdentities).values({
            authOauthIdentityId: idCreate(),
            userId: identityUser.user.userId,
            provider: 'GOOGLE',
            subject,
        });
        await signInGoogleEnable();
        const anonymous = await commandSetup();
        const { state, nonce } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject, email: emailUser.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=google');
        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, anonymous.requestingSession.sessionId));
        expect(events.some((event) => event.type === 'AUTH_OAUTH_SIGN_IN_FAILED')).toBe(true);
    });

    it('drops a phone that already belongs to another user', async () => {
        const takenPhone = phoneNumberCreate();
        await commandSetup.withUser({ phoneNumber: takenPhone });
        await signInGoogleEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId);
        const email = `google-phone-${idCreate().toLowerCase()}@example.com`;

        await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: googleFetchMock({
                    nonce,
                    subject: `sub-${idCreate()}`,
                    email,
                    peopleStatus: 200,
                    peopleBody: {
                        names: [{ givenName: 'Ada', familyName: 'Lovelace', metadata: { primary: true } }],
                        phoneNumbers: [{ canonicalForm: takenPhone, metadata: { primary: true } }],
                        birthdays: [{ date: { year: 1990, month: 1, day: 15 }, metadata: { primary: true } }],
                    },
                }),
                env: { ...testEnv, googleOauthPeopleScopes: true },
            },
            serverRuntime,
        );

        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.phoneNumber).toBeNull();
        expect(ticket?.birthDate).toBe('1990-01-15');
    });

    it('still signs in when People returns 403', async () => {
        await signInGoogleEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId);
        const email = `google-people-${idCreate().toLowerCase()}@example.com`;

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject: `sub-${idCreate()}`, email, peopleStatus: 403 }),
                env: { ...testEnv, googleOauthPeopleScopes: true },
            },
            serverRuntime,
        );

        expect(result.returnTo).toBe('/log-on');
        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.emailAddress).toBe(email);
        expect(ticket?.phoneNumber).toBeNull();
    });

    it('omits phone and birthday when People scopes are off', async () => {
        await signInGoogleEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId);
        const fetchImpl = googleFetchMock({
            nonce,
            subject: `sub-${idCreate()}`,
            email: `google-scopes-off-${idCreate().toLowerCase()}@example.com`,
            peopleStatus: 200,
            peopleBody: {
                phoneNumbers: [{ canonicalForm: phoneNumberCreate(), metadata: { primary: true } }],
                birthdays: [{ date: { year: 1990, month: 1, day: 15 }, metadata: { primary: true } }],
            },
        });

        await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl,
                env: testEnv,
            },
            serverRuntime,
        );

        expect(fetchImpl.mock.calls.some((call) => String(call[0]).includes('people.googleapis.com'))).toBe(false);
        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.phoneNumber).toBeNull();
        expect(ticket?.birthDate).toBeNull();
    });

    it('rejects unverified Google email and restores the session from state when the cookie is missing', async () => {
        await signInGoogleEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId, { returnTo: '/gift-card' });

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: null,
                fetchImpl: googleFetchMock({
                    nonce,
                    subject: `sub-${idCreate()}`,
                    email: `unverified-${idCreate().toLowerCase()}@example.com`,
                    emailVerified: false,
                }),
                env: testEnv,
            },
            serverRuntime,
        );

        expect(result.sessionId).toBe(requestingSession.sessionId);
        expect(result.returnTo).toBe('/gift-card?authError=google');
    });

    it('rejects an unknown state', async () => {
        await signInGoogleEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const result = await authGoogleCallback(
            {
                code: 'code',
                state: 'missing-state',
                error: null,
                cookieSessionId: requestingSession.sessionId,
                env: testEnv,
            },
            serverRuntime,
        );
        expect(result.returnTo).toBe('/log-on?authError=google');
    });

    it('bounces back when the global toggle is off', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state } = await oauthStateInsert(requestingSession.sessionId);
        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                env: testEnv,
            },
            serverRuntime,
        );
        expect(result.returnTo).toBe('/log-on?authError=google');
    });

    it('honors a per-user toggle override after identity resolve', async () => {
        const existing = await commandSetup.withUser();
        await signInGoogleEnable(true);
        await testDb.insert(featureToggleUserOverrides).values({
            userId: existing.user.userId,
            featureToggleKey: 'SIGN_IN_GOOGLE',
            enabled: false,
        });
        const anonymous = await commandSetup();
        const { state, nonce } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject: `sub-${idCreate()}`, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=google');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBeNull();
    });

    it('returns to returnTo without switching when the session is already signed in', async () => {
        const existing = await commandSetup.withUser();
        await signInGoogleEnable();
        const { state } = await oauthStateInsert(existing.requestingSession.sessionId, { returnTo: '/profile' });
        const result = await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: existing.requestingSession.sessionId,
                env: testEnv,
            },
            existing.serverRuntime,
        );
        expect(result.returnTo).toBe('/profile');
        expect(result.returnTo.includes('authError')).toBe(false);
    });

    it('stores an imported Google photo on the registration ticket', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await signInGoogleEnable();
        const email = `google-photo-${idCreate().toLowerCase()}@example.com`;
        const subject = `sub-${idCreate()}`;
        const { state, nonce } = await oauthStateInsert(requestingSession.sessionId);
        const pictureUrl = `https://lh3.googleusercontent.com/a/${idCreate()}=s96-c`;

        await authGoogleCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: googleFetchMock({ nonce, subject, email, pictureUrl }),
                env: testEnv,
            },
            serverRuntime,
        );

        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.profilePictureFileUploadId).toBeTruthy();
        const [upload] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, ticket!.profilePictureFileUploadId!));
        expect(upload?.userId).toBeNull();
        expect(upload?.mediaType).toBe('image/webp');
        expect(upload?.filename).toBe('avatar.webp');
    });
});
