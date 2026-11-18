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
import { AUTH_OAUTH_STATE_TTL_MS } from '../utils/authFacebookOauth';
import { authFacebookCallback } from './authFacebookCallback';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const testEnv = {
    facebookOauthClientId: 'test-facebook-oauth-client-id',
    facebookOauthClientSecret: 'test-facebook-oauth-client-secret',
    webPageUrl: 'https://example.com',
};

function facebookFetchMock(args: {
    subject: string;
    email?: string | null;
    firstName?: string;
    lastName?: string | null;
    pictureUrl?: string;
    pictureSilhouette?: boolean;
    tokenStatus?: number;
    meStatus?: number;
}) {
    return vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/oauth/access_token')) {
            return new Response(JSON.stringify({ access_token: 'access-token' }), { status: args.tokenStatus ?? 200 });
        }
        if (args.pictureUrl && url === args.pictureUrl) {
            return new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } });
        }
        if (url.includes('/me')) {
            if ((args.meStatus ?? 200) !== 200) {
                return new Response('error', { status: args.meStatus ?? 500 });
            }
            const body: Record<string, unknown> = {
                id: args.subject,
                first_name: args.firstName ?? 'Ada',
            };
            if (args.lastName === undefined) {
                body.last_name = 'Lovelace';
            } else if (args.lastName != null) {
                body.last_name = args.lastName;
            }
            if (args.email !== null && args.email !== undefined) {
                body.email = args.email;
            } else if (args.email === undefined) {
                body.email = `fb-${args.subject}@example.com`;
            }
            if (args.pictureUrl) {
                body.picture = {
                    data: {
                        url: args.pictureUrl,
                        is_silhouette: args.pictureSilhouette === true,
                    },
                };
            }
            return new Response(JSON.stringify(body), { status: 200 });
        }
        return new Response('not found', { status: 404 });
    });
}

async function signInFacebookEnable(enabled = true) {
    await testDb.insert(featureToggles).values({ featureToggleKey: 'SIGN_IN_FACEBOOK', enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
}

async function oauthStateInsert(sessionId: string, overrides: { returnTo?: string; expiresAt?: Date } = {}) {
    const state = `state-${idCreate()}`;
    await testDb.insert(authOauthStates).values({
        authOauthStateId: idCreate(),
        sessionId,
        state,
        codeVerifier: 'verifier',
        nonce: 'nonce',
        returnTo: overrides.returnTo ?? '/log-on',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + AUTH_OAUTH_STATE_TTL_MS),
    });
    return { state };
}

describe('authFacebookCallback', () => {
    afterEach(async () => {
        await testDb.delete(featureToggles).where(eq(featureToggles.featureToggleKey, 'SIGN_IN_FACEBOOK'));
    });

    it('writes a registration ticket for a new Facebook email', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await signInFacebookEnable();
        const email = `facebook-new-${idCreate().toLowerCase()}@example.com`;
        const subject = `fb-${idCreate()}`;
        const { state } = await oauthStateInsert(requestingSession.sessionId);

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject, email, lastName: null }),
                env: testEnv,
            },
            serverRuntime,
        );

        expect(result.sessionId).toBe(requestingSession.sessionId);
        expect(result.returnTo).toBe('/log-on');
        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.provider).toBe('FACEBOOK');
        expect(ticket?.emailAddress).toBe(email);
        expect(ticket?.firstName).toBe('Ada');
        expect(ticket?.lastName).toBeNull();
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId));
        expect(session?.userId).toBeNull();
        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, requestingSession.sessionId));
        expect(events.some((event) => event.type === 'AUTH_OAUTH_SIGN_IN_SUCCEEDED')).toBe(true);
    });

    it('binds an existing email and inserts the Facebook identity', async () => {
        const existing = await commandSetup.withUser();
        await signInFacebookEnable();
        const anonymous = await commandSetup();
        const { state } = await oauthStateInsert(anonymous.requestingSession.sessionId);
        const subject = `fb-${idCreate()}`;

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toBe('/log-on');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBe(existing.user.userId);
        const identities = await testDb.select().from(authOauthIdentities).where(eq(authOauthIdentities.userId, existing.user.userId));
        expect(identities).toHaveLength(1);
        expect(identities[0]?.provider).toBe('FACEBOOK');
        expect(identities[0]?.subject).toBe(subject);
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
        await signInFacebookEnable();
        const anonymous = await commandSetup();
        const { state } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject: `fb-${idCreate()}`, email: existing.user.emailAddress! }),
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
        await signInFacebookEnable();
        const anonymous = await commandSetup();
        const { state } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject: `fb-${idCreate()}`, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=facebook');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBeNull();
    });

    it('refuses when Facebook id and email belong to different users', async () => {
        const identityUser = await commandSetup.withUser();
        const emailUser = await commandSetup.withUser();
        const subject = `fb-${idCreate()}`;
        await testDb.insert(authOauthIdentities).values({
            authOauthIdentityId: idCreate(),
            userId: identityUser.user.userId,
            provider: 'FACEBOOK',
            subject,
        });
        await signInFacebookEnable();
        const anonymous = await commandSetup();
        const { state } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject, email: emailUser.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=facebook');
        const events = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionId, anonymous.requestingSession.sessionId));
        expect(events.some((event) => event.type === 'AUTH_OAUTH_SIGN_IN_FAILED')).toBe(true);
    });

    it('rejects missing Facebook email and restores the session from state when the cookie is missing', async () => {
        await signInFacebookEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state } = await oauthStateInsert(requestingSession.sessionId, { returnTo: '/gift-card' });

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: null,
                fetchImpl: facebookFetchMock({ subject: `fb-${idCreate()}`, email: null }),
                env: testEnv,
            },
            serverRuntime,
        );

        expect(result.sessionId).toBe(requestingSession.sessionId);
        expect(result.returnTo).toBe('/gift-card?authError=facebook');
    });

    it('rejects an unknown state', async () => {
        await signInFacebookEnable();
        const { serverRuntime, requestingSession } = await commandSetup();
        const result = await authFacebookCallback(
            {
                code: 'code',
                state: 'missing-state',
                error: null,
                cookieSessionId: requestingSession.sessionId,
                env: testEnv,
            },
            serverRuntime,
        );
        expect(result.returnTo).toBe('/log-on?authError=facebook');
    });

    it('bounces back when the global toggle is off', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const { state } = await oauthStateInsert(requestingSession.sessionId);
        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                env: testEnv,
            },
            serverRuntime,
        );
        expect(result.returnTo).toBe('/log-on?authError=facebook');
    });

    it('honors a per-user toggle override after identity resolve', async () => {
        const existing = await commandSetup.withUser();
        await signInFacebookEnable(true);
        await testDb.insert(featureToggleUserOverrides).values({
            userId: existing.user.userId,
            featureToggleKey: 'SIGN_IN_FACEBOOK',
            enabled: false,
        });
        const anonymous = await commandSetup();
        const { state } = await oauthStateInsert(anonymous.requestingSession.sessionId);

        const result = await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: anonymous.requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject: `fb-${idCreate()}`, email: existing.user.emailAddress! }),
                env: testEnv,
            },
            anonymous.serverRuntime,
        );

        expect(result.returnTo).toContain('authError=facebook');
        const [session] = await testDb.select().from(sessions).where(eq(sessions.sessionId, anonymous.requestingSession.sessionId));
        expect(session?.userId).toBeNull();
    });

    it('returns to returnTo without switching when the session is already signed in', async () => {
        const existing = await commandSetup.withUser();
        await signInFacebookEnable();
        const { state } = await oauthStateInsert(existing.requestingSession.sessionId, { returnTo: '/profile' });
        const result = await authFacebookCallback(
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

    it('stores an imported Facebook photo on the registration ticket', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await signInFacebookEnable();
        const email = `facebook-photo-${idCreate().toLowerCase()}@example.com`;
        const subject = `fb-${idCreate()}`;
        const { state } = await oauthStateInsert(requestingSession.sessionId);
        const pictureUrl = `https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=${idCreate()}`;

        await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject, email, pictureUrl }),
                env: testEnv,
            },
            serverRuntime,
        );

        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.profilePictureFileUploadId).toBeTruthy();
        const [upload] = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, ticket!.profilePictureFileUploadId!));
        expect(upload?.userId).toBeNull();
        expect(upload?.mediaType).toBe('image/webp');
    });

    it('skips a Facebook silhouette photo', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        await signInFacebookEnable();
        const email = `facebook-silhouette-${idCreate().toLowerCase()}@example.com`;
        const subject = `fb-${idCreate()}`;
        const { state } = await oauthStateInsert(requestingSession.sessionId);
        const pictureUrl = `https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=${idCreate()}`;

        await authFacebookCallback(
            {
                code: 'code',
                state,
                error: null,
                cookieSessionId: requestingSession.sessionId,
                fetchImpl: facebookFetchMock({ subject, email, pictureUrl, pictureSilhouette: true }),
                env: testEnv,
            },
            serverRuntime,
        );

        const [ticket] = await testDb.select().from(authOauthTickets).where(eq(authOauthTickets.sessionId, requestingSession.sessionId));
        expect(ticket?.emailAddress).toBe(email);
        expect(ticket?.profilePictureFileUploadId).toBeNull();
    });
});
