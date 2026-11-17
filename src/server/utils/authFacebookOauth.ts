import { createHmac, randomBytes } from 'node:crypto';

import { DEFAULT_LOCALE, isLocale } from '../../shared/locale';
import type { Locale } from '../../shared/locale';
import { textNormalizeTitledOrNull } from '../../shared/textNormalize';
import type { EnvironmentVariables } from '../env/EnvironmentVariables';

/** Pin Graph API / dialog version; bump deliberately when Meta requires it. */
const AUTH_FACEBOOK_GRAPH_VERSION = 'v22.0';

export const AUTH_FACEBOOK_AUTHORIZE_URL = `https://www.facebook.com/${AUTH_FACEBOOK_GRAPH_VERSION}/dialog/oauth`;
export const AUTH_FACEBOOK_TOKEN_URL = `https://graph.facebook.com/${AUTH_FACEBOOK_GRAPH_VERSION}/oauth/access_token`;
export const AUTH_FACEBOOK_ME_URL = `https://graph.facebook.com/${AUTH_FACEBOOK_GRAPH_VERSION}/me`;

export const AUTH_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const AUTH_OAUTH_TICKET_TTL_MS = 30 * 60 * 1000;

export type AuthFacebookStateSecrets = {
    /** Unused by Meta Login today; stored because AuthOauthStates.codeVerifier is NOT NULL. */
    codeVerifier: string;
    /** Unused by Meta Login today; stored because AuthOauthStates.nonce is NOT NULL. */
    nonce: string;
    state: string;
};

export type AuthFacebookProfileSnapshot = {
    subject: string;
    emailAddress: string;
    firstName: string | null;
    lastName: string | null;
};

export function authFacebookRedirectUri(webPageUrl: string): string {
    return `${webPageUrl.replace(/\/$/, '')}/api/auth/facebook/callback`;
}

export function authFacebookReturnToSafe(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed.startsWith('/')) return undefined;
    if (trimmed.startsWith('//')) return undefined;
    if (trimmed.includes('\\')) return undefined;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return undefined;
    return trimmed;
}

export function authFacebookReturnToWithError(returnTo: string): string {
    const hashIndex = returnTo.indexOf('#');
    const pathAndSearch = hashIndex === -1 ? returnTo : returnTo.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : returnTo.slice(hashIndex);
    if (/(?:[?&])authError=/.test(pathAndSearch)) {
        return returnTo;
    }
    const join = pathAndSearch.includes('?') ? '&' : '?';
    return `${pathAndSearch}${join}authError=facebook${hash}`;
}

export function authFacebookLocaleFromReturnTo(returnTo: string): Locale {
    const first = returnTo.split('/').filter(Boolean)[0];
    if (isLocale(first) && first !== DEFAULT_LOCALE) return first;
    return DEFAULT_LOCALE;
}

export function authFacebookStateSecretsCreate(): AuthFacebookStateSecrets {
    return {
        codeVerifier: randomBytes(32).toString('base64url'),
        nonce: randomBytes(32).toString('base64url'),
        state: randomBytes(32).toString('base64url'),
    };
}

export function authFacebookAppSecretProof(accessToken: string, clientSecret: string): string {
    return createHmac('sha256', clientSecret).update(accessToken).digest('hex');
}

export function authFacebookAuthorizationUrlCreate(args: {
    env: Pick<EnvironmentVariables, 'facebookOauthClientId' | 'webPageUrl'>;
    state: string;
    locale: Locale;
}): string {
    const params = new URLSearchParams({
        client_id: args.env.facebookOauthClientId,
        redirect_uri: authFacebookRedirectUri(args.env.webPageUrl),
        response_type: 'code',
        scope: 'email,public_profile',
        state: args.state,
        locale: args.locale === 'de' ? 'de_DE' : args.locale === 'en' ? 'en_US' : args.locale,
    });
    return `${AUTH_FACEBOOK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function authFacebookTokenExchange(args: {
    env: Pick<EnvironmentVariables, 'facebookOauthClientId' | 'facebookOauthClientSecret' | 'webPageUrl'>;
    code: string;
    fetchImpl?: typeof fetch;
}): Promise<{ accessToken: string }> {
    const fetchImpl = args.fetchImpl ?? fetch;
    const params = new URLSearchParams({
        client_id: args.env.facebookOauthClientId,
        client_secret: args.env.facebookOauthClientSecret,
        redirect_uri: authFacebookRedirectUri(args.env.webPageUrl),
        code: args.code,
    });
    const response = await fetchImpl(`${AUTH_FACEBOOK_TOKEN_URL}?${params.toString()}`);
    if (!response.ok) {
        throw new Error('authFacebookTokenExchange: token endpoint rejected');
    }
    const json: unknown = await response.json();
    if (!json || typeof json !== 'object') {
        throw new Error('authFacebookTokenExchange: invalid token response');
    }
    const record = json as Record<string, unknown>;
    const accessToken = typeof record.access_token === 'string' ? record.access_token : '';
    if (!accessToken) {
        throw new Error('authFacebookTokenExchange: missing access_token');
    }
    return { accessToken };
}

export async function authFacebookMeFetch(args: {
    accessToken: string;
    clientSecret: string;
    fetchImpl?: typeof fetch;
}): Promise<AuthFacebookProfileSnapshot> {
    const fetchImpl = args.fetchImpl ?? fetch;
    const appsecretProof = authFacebookAppSecretProof(args.accessToken, args.clientSecret);
    const params = new URLSearchParams({
        fields: 'id,email,first_name,last_name',
        access_token: args.accessToken,
        appsecret_proof: appsecretProof,
    });
    const response = await fetchImpl(`${AUTH_FACEBOOK_ME_URL}?${params.toString()}`);
    if (!response.ok) {
        throw new Error('authFacebookMeFetch: me endpoint rejected');
    }
    const json: unknown = await response.json();
    return authFacebookMeParse(json);
}

export function authFacebookMeParse(json: unknown): AuthFacebookProfileSnapshot {
    if (!json || typeof json !== 'object') {
        throw new Error('authFacebookMeParse: invalid me response');
    }
    const record = json as Record<string, unknown>;
    const subject = typeof record.id === 'string' ? record.id.trim() : '';
    const emailAddress = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
    if (!subject) {
        throw new Error('authFacebookMeParse: missing id');
    }
    if (!emailAddress) {
        throw new Error('authFacebookMeParse: missing email');
    }
    return {
        subject,
        emailAddress,
        firstName: textNormalizeTitledOrNull(typeof record.first_name === 'string' ? record.first_name : null),
        lastName: textNormalizeTitledOrNull(typeof record.last_name === 'string' ? record.last_name : null),
    };
}
