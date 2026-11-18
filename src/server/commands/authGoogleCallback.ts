import { and, eq } from 'drizzle-orm';

import { emailNormalize } from '../../shared/emailNormalize';
import { idCreate } from '../../shared/idCreate';
import { authOauthIdentities, authOauthStates, sessions, users } from '../db/schema';
import type { AuthOauthSignInFailReason } from '../domain/authOauth';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { EnvironmentVariables } from '../env/EnvironmentVariables';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { GqlSSession } from '../graphql/generated';
import type { AuthGoogleProfileSnapshot } from '../utils/authGoogleOauth';
import {
    AUTH_OAUTH_TICKET_TTL_MS,
    authGoogleIdTokenClaimsParse,
    authGooglePeopleFetch,
    authGoogleProfileSnapshotMerge,
    authGoogleReturnToSafe,
    authGoogleReturnToWithError,
    authGoogleTokenExchange,
    authGoogleUserinfoFetch,
} from '../utils/authGoogleOauth';
import { authOauthProfilePictureImport } from '../utils/authOauthProfilePictureImport';
import { authOauthTicketReplace } from '../utils/authOauthTicketReplace';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionPrimaryAuthComplete } from './sessionPrimaryAuthComplete';

export type AuthGoogleCallbackResult = {
    sessionId: string | null;
    returnTo: string;
};

export async function authGoogleCallback(
    args: {
        code: string | null;
        state: string | null;
        error: string | null;
        cookieSessionId: string | null;
        fetchImpl?: typeof fetch;
        env?: Pick<EnvironmentVariables, 'googleOauthClientId' | 'googleOauthClientSecret' | 'googleOauthPeopleScopes' | 'webPageUrl'>;
    },
    serverRuntime: ServerRuntime,
): Promise<AuthGoogleCallbackResult> {
    const fallbackReturnTo = '/log-on';
    const env = args.env ?? environmentVariables;
    const enabled = await featureToggleIsEnabled('SIGN_IN_GOOGLE', serverRuntime);
    if (!enabled) {
        return fail(serverRuntime, args.cookieSessionId, fallbackReturnTo, 'toggle_off');
    }

    if (args.error === 'access_denied') {
        const deniedState = args.state ? await stateFind(serverRuntime, args.state) : null;
        const returnTo = deniedState?.returnTo ?? fallbackReturnTo;
        if (deniedState) {
            await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, deniedState.authOauthStateId));
        }
        return fail(serverRuntime, deniedState?.sessionId ?? args.cookieSessionId, returnTo, 'denied');
    }

    if (!args.code || !args.state) {
        return fail(serverRuntime, args.cookieSessionId, fallbackReturnTo, 'invalid_state');
    }

    const stateRow = await stateFind(serverRuntime, args.state);
    if (!stateRow || stateRow.expiresAt.getTime() <= Date.now()) {
        if (stateRow) {
            await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        }
        return fail(serverRuntime, stateRow?.sessionId ?? args.cookieSessionId, stateRow?.returnTo ?? fallbackReturnTo, 'invalid_state');
    }

    const returnTo = authGoogleReturnToSafe(stateRow.returnTo) ?? fallbackReturnTo;
    const sessionId = stateRow.sessionId;

    const [session] = await serverRuntime.db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    if (!session || session.wasTerminatedAt != null) {
        await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        return fail(serverRuntime, sessionId, returnTo, 'invalid_state');
    }
    if (session.userId || session.impersonationReturnSessionId) {
        await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));
        return { sessionId, returnTo };
    }

    await serverRuntime.db.delete(authOauthStates).where(eq(authOauthStates.authOauthStateId, stateRow.authOauthStateId));

    let snapshot: AuthGoogleProfileSnapshot;
    try {
        const tokens = await authGoogleTokenExchange({
            env,
            code: args.code,
            codeVerifier: stateRow.codeVerifier,
            fetchImpl: args.fetchImpl,
        });
        const claims = authGoogleIdTokenClaimsParse(tokens.idToken, {
            clientId: env.googleOauthClientId,
            nonce: stateRow.nonce,
        });
        if (!claims.emailVerified || !claims.emailAddress) {
            return fail(serverRuntime, sessionId, returnTo, 'unverified_email');
        }
        const userinfo = await authGoogleUserinfoFetch(tokens.accessToken, args.fetchImpl);
        if (userinfo.subject !== claims.subject || userinfo.emailAddress !== claims.emailAddress) {
            return fail(serverRuntime, sessionId, returnTo, 'token');
        }
        const people = env.googleOauthPeopleScopes ? await authGooglePeopleFetch(tokens.accessToken, args.fetchImpl) : null;
        snapshot = authGoogleProfileSnapshotMerge({
            claims: { ...claims, emailAddress: emailNormalize(claims.emailAddress) },
            userinfo: { ...userinfo, emailAddress: emailNormalize(userinfo.emailAddress) },
            people,
        });
    } catch (error) {
        serverRuntime.log.warn('authGoogleCallback: token exchange failed', { sessionId });
        serverRuntime.log.error(error, { sessionId });
        return fail(serverRuntime, sessionId, returnTo, 'token');
    }

    const requestingSession = { sessionId } as GqlSSession;

    const [identity] = await serverRuntime.db
        .select()
        .from(authOauthIdentities)
        .where(and(eq(authOauthIdentities.provider, 'GOOGLE'), eq(authOauthIdentities.subject, snapshot.subject)))
        .limit(1);

    const [emailUser] = await serverRuntime.db
        .select({ userId: users.userId, status: users.status, emailAddress: users.emailAddress })
        .from(users)
        .where(eq(users.emailAddress, snapshot.emailAddress))
        .limit(1);

    if (identity && emailUser && identity.userId !== emailUser.userId) {
        serverRuntime.log.warn('authGoogleCallback: identity/email conflict', { sessionId });
        return fail(serverRuntime, sessionId, returnTo, 'conflict');
    }

    const existingUserId = identity?.userId ?? emailUser?.userId;
    if (existingUserId) {
        const [existing] = await serverRuntime.db
            .select({ userId: users.userId, status: users.status })
            .from(users)
            .where(eq(users.userId, existingUserId))
            .limit(1);
        if (!existing || existing.status === 'ANONYMIZED') {
            return fail(serverRuntime, sessionId, returnTo, 'anonymized');
        }

        const userEnabled = await featureToggleIsEnabled('SIGN_IN_GOOGLE', serverRuntime, existing.userId);
        if (!userEnabled) {
            return fail(serverRuntime, sessionId, returnTo, 'toggle_off');
        }

        if (!identity) {
            await serverRuntime.db.insert(authOauthIdentities).values({
                authOauthIdentityId: idCreate(),
                userId: existing.userId,
                provider: 'GOOGLE',
                subject: snapshot.subject,
            });
        }

        await sessionPrimaryAuthComplete(sessionId, existing.userId, requestingSession, serverRuntime);
        await sessionEventCreate(serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
            payload: { provider: 'GOOGLE', outcome: 'sign_in' },
        });
        return { sessionId, returnTo };
    }

    if (snapshot.phoneNumber) {
        const [taken] = await serverRuntime.db
            .select({ userId: users.userId })
            .from(users)
            .where(eq(users.phoneNumber, snapshot.phoneNumber))
            .limit(1);
        if (taken) {
            snapshot = { ...snapshot, phoneNumber: null };
        }
    }

    const now = new Date();
    const profilePicture = snapshot.pictureUrl
        ? await authOauthProfilePictureImport({ url: snapshot.pictureUrl, fetchImpl: args.fetchImpl })
        : null;
    await serverRuntime.db.transaction(async (transaction) => {
        await authOauthTicketReplace(transaction, {
            ticket: {
                sessionId,
                provider: 'GOOGLE',
                subject: snapshot.subject,
                emailAddress: snapshot.emailAddress,
                firstName: snapshot.firstName,
                lastName: snapshot.lastName,
                phoneNumber: snapshot.phoneNumber,
                birthDate: snapshot.birthDate,
                verifiedAt: now,
                expiresAt: new Date(now.getTime() + AUTH_OAUTH_TICKET_TTL_MS),
            },
            profilePicture,
        });
    });
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'AUTH_OAUTH_SIGN_IN_SUCCEEDED',
        payload: { provider: 'GOOGLE', outcome: 'registration_ticket' },
    });
    await serverRuntime.publish.sessionUpdates({ sessionId });
    return { sessionId, returnTo };
}

async function stateFind(serverRuntime: ServerRuntime, state: string) {
    const [row] = await serverRuntime.db.select().from(authOauthStates).where(eq(authOauthStates.state, state)).limit(1);
    return row ?? null;
}

async function fail(
    serverRuntime: ServerRuntime,
    sessionId: string | null,
    returnTo: string,
    reason: AuthOauthSignInFailReason,
): Promise<AuthGoogleCallbackResult> {
    if (sessionId) {
        await sessionEventCreate(serverRuntime, {
            sessionId,
            type: 'AUTH_OAUTH_SIGN_IN_FAILED',
            payload: { provider: 'GOOGLE', reason },
        });
    }
    return { sessionId, returnTo: authGoogleReturnToWithError(returnTo) };
}
