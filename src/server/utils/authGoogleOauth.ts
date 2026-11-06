import { createHash, randomBytes } from 'node:crypto';

import { phoneNumberNormalize } from '../../shared/phoneNumber';
import { textNormalizeTitledOrNull } from '../../shared/textNormalize';
import { userBirthDateMeetsMinimumAge } from '../../shared/userBirthDate';
import type { EnvironmentVariables } from '../env/EnvironmentVariables';

export const AUTH_GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const AUTH_GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const AUTH_GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
export const AUTH_GOOGLE_PEOPLE_URL = 'https://people.googleapis.com/v1/people/me';

const PEOPLE_PHONE_SCOPE = 'https://www.googleapis.com/auth/user.phonenumbers.read';
const PEOPLE_BIRTHDAY_SCOPE = 'https://www.googleapis.com/auth/user.birthday.read';

export const AUTH_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const AUTH_OAUTH_TICKET_TTL_MS = 30 * 60 * 1000;

const GOOGLE_ISS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export type AuthGooglePkce = {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
    nonce: string;
};

export type AuthGoogleProfileSnapshot = {
    subject: string;
    emailAddress: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    birthDate: string | null;
};

export function authGoogleRedirectUri(webPageUrl: string): string {
    return `${webPageUrl.replace(/\/$/, '')}/api/auth/google/callback`;
}

export function authGoogleReturnToSafe(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed.startsWith('/')) return undefined;
    if (trimmed.startsWith('//')) return undefined;
    if (trimmed.includes('\\')) return undefined;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return undefined;
    return trimmed;
}

export function authGoogleReturnToWithError(returnTo: string): string {
    const hashIndex = returnTo.indexOf('#');
    const pathAndSearch = hashIndex === -1 ? returnTo : returnTo.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : returnTo.slice(hashIndex);
    if (/(?:[?&])authError=/.test(pathAndSearch)) {
        return returnTo;
    }
    const join = pathAndSearch.includes('?') ? '&' : '?';
    return `${pathAndSearch}${join}authError=google${hash}`;
}

export function authGoogleLocaleFromReturnTo(returnTo: string): 'de' | 'en' {
    return returnTo === '/en' || returnTo.startsWith('/en/') ? 'en' : 'de';
}

export function authGooglePkceCreate(): AuthGooglePkce {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    return { codeVerifier, codeChallenge, state, nonce };
}

export function authGoogleAuthorizationUrlCreate(args: {
    env: Pick<EnvironmentVariables, 'googleOauthClientId' | 'googleOauthPeopleScopes' | 'webPageUrl'>;
    state: string;
    nonce: string;
    codeChallenge: string;
    locale: 'de' | 'en';
}): string {
    const scopes = ['openid', 'email', 'profile'];
    if (args.env.googleOauthPeopleScopes) {
        scopes.push(PEOPLE_PHONE_SCOPE, PEOPLE_BIRTHDAY_SCOPE);
    }
    const params = new URLSearchParams({
        client_id: args.env.googleOauthClientId,
        redirect_uri: authGoogleRedirectUri(args.env.webPageUrl),
        response_type: 'code',
        scope: scopes.join(' '),
        state: args.state,
        nonce: args.nonce,
        code_challenge: args.codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
        include_granted_scopes: 'true',
        hl: args.locale,
        access_type: 'online',
    });
    return `${AUTH_GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function authGoogleTokenExchange(args: {
    env: Pick<EnvironmentVariables, 'googleOauthClientId' | 'googleOauthClientSecret' | 'webPageUrl'>;
    code: string;
    codeVerifier: string;
    fetchImpl?: typeof fetch;
}): Promise<{ accessToken: string; idToken: string }> {
    const fetchImpl = args.fetchImpl ?? fetch;
    const body = new URLSearchParams({
        code: args.code,
        client_id: args.env.googleOauthClientId,
        client_secret: args.env.googleOauthClientSecret,
        redirect_uri: authGoogleRedirectUri(args.env.webPageUrl),
        grant_type: 'authorization_code',
        code_verifier: args.codeVerifier,
    });
    const response = await fetchImpl(AUTH_GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!response.ok) {
        throw new Error('authGoogleTokenExchange: token endpoint rejected');
    }
    const json: unknown = await response.json();
    if (!json || typeof json !== 'object') {
        throw new Error('authGoogleTokenExchange: invalid token response');
    }
    const record = json as Record<string, unknown>;
    const accessToken = typeof record.access_token === 'string' ? record.access_token : '';
    const idToken = typeof record.id_token === 'string' ? record.id_token : '';
    if (!accessToken || !idToken) {
        throw new Error('authGoogleTokenExchange: missing tokens');
    }
    return { accessToken, idToken };
}

export function authGoogleIdTokenClaimsParse(
    idToken: string,
    args: { clientId: string; nonce: string; nowMs?: number },
): { subject: string; emailAddress: string; emailVerified: boolean; givenName: string | null; familyName: string | null } {
    const payload = jwtPayloadParse(idToken);
    if (!payload) {
        throw new Error('authGoogleIdTokenClaimsParse: invalid id_token');
    }
    const iss = typeof payload.iss === 'string' ? payload.iss : '';
    if (!GOOGLE_ISS.has(iss)) {
        throw new Error('authGoogleIdTokenClaimsParse: unexpected iss');
    }
    const aud = payload.aud;
    const audienceOk = aud === args.clientId || (Array.isArray(aud) && aud.includes(args.clientId));
    if (!audienceOk) {
        throw new Error('authGoogleIdTokenClaimsParse: unexpected aud');
    }
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    const nowMs = args.nowMs ?? Date.now();
    if (exp * 1000 <= nowMs) {
        throw new Error('authGoogleIdTokenClaimsParse: expired');
    }
    if (payload.nonce !== args.nonce) {
        throw new Error('authGoogleIdTokenClaimsParse: nonce mismatch');
    }
    const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    if (!subject) {
        throw new Error('authGoogleIdTokenClaimsParse: missing sub');
    }
    const emailAddress = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return {
        subject,
        emailAddress,
        emailVerified,
        givenName: typeof payload.given_name === 'string' ? payload.given_name : null,
        familyName: typeof payload.family_name === 'string' ? payload.family_name : null,
    };
}

export async function authGoogleUserinfoFetch(
    accessToken: string,
    fetchImpl: typeof fetch = fetch,
): Promise<{ subject: string; emailAddress: string; givenName: string | null; familyName: string | null }> {
    const response = await fetchImpl(AUTH_GOOGLE_USERINFO_URL, {
        headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        throw new Error('authGoogleUserinfoFetch: userinfo rejected');
    }
    const json: unknown = await response.json();
    if (!json || typeof json !== 'object') {
        throw new Error('authGoogleUserinfoFetch: invalid userinfo');
    }
    const record = json as Record<string, unknown>;
    const subject = typeof record.sub === 'string' ? record.sub.trim() : '';
    const emailAddress = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
    if (!subject || !emailAddress) {
        throw new Error('authGoogleUserinfoFetch: missing sub or email');
    }
    return {
        subject,
        emailAddress,
        givenName: typeof record.given_name === 'string' ? record.given_name : null,
        familyName: typeof record.family_name === 'string' ? record.family_name : null,
    };
}

export async function authGooglePeopleFetch(
    accessToken: string,
    fetchImpl: typeof fetch = fetch,
): Promise<{ givenName: string | null; familyName: string | null; phoneNumber: string | null; birthDate: string | null } | null> {
    try {
        const url = `${AUTH_GOOGLE_PEOPLE_URL}?personFields=names,phoneNumbers,birthdays`;
        const response = await fetchImpl(url, {
            headers: { authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            return null;
        }
        const json: unknown = await response.json();
        if (!json || typeof json !== 'object') {
            return null;
        }
        return authGooglePeopleParse(json);
    } catch {
        return null;
    }
}

export function authGooglePeopleParse(json: unknown): {
    givenName: string | null;
    familyName: string | null;
    phoneNumber: string | null;
    birthDate: string | null;
} {
    const record = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
    const names = Array.isArray(record.names) ? record.names : [];
    const primaryName = peoplePrimary(names);
    const givenName = typeof primaryName?.givenName === 'string' ? primaryName.givenName : null;
    const familyName = typeof primaryName?.familyName === 'string' ? primaryName.familyName : null;

    const phones = Array.isArray(record.phoneNumbers) ? record.phoneNumbers : [];
    const primaryPhone = peoplePrimary(phones);
    const rawPhone =
        (typeof primaryPhone?.canonicalForm === 'string' && primaryPhone.canonicalForm) ||
        (typeof primaryPhone?.value === 'string' && primaryPhone.value) ||
        null;
    const phoneNumber = rawPhone ? (phoneNumberNormalize(rawPhone) ?? null) : null;

    const birthdays = Array.isArray(record.birthdays) ? record.birthdays : [];
    const primaryBirthday = peoplePrimary(birthdays);
    const date =
        primaryBirthday?.date && typeof primaryBirthday.date === 'object' ? (primaryBirthday.date as Record<string, unknown>) : null;
    const year = typeof date?.year === 'number' ? date.year : null;
    const month = typeof date?.month === 'number' ? date.month : null;
    const day = typeof date?.day === 'number' ? date.day : null;
    let birthDate: string | null = null;
    if (year && month && day) {
        const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (userBirthDateMeetsMinimumAge(iso)) {
            birthDate = iso;
        }
    }

    return { givenName, familyName, phoneNumber, birthDate };
}

export function authGoogleProfileSnapshotMerge(args: {
    claims: { subject: string; emailAddress: string; givenName: string | null; familyName: string | null };
    userinfo: { subject: string; emailAddress: string; givenName: string | null; familyName: string | null };
    people: { givenName: string | null; familyName: string | null; phoneNumber: string | null; birthDate: string | null } | null;
}): AuthGoogleProfileSnapshot {
    const givenName = args.people?.givenName ?? args.userinfo.givenName ?? args.claims.givenName;
    const familyName = args.people?.familyName ?? args.userinfo.familyName ?? args.claims.familyName;
    return {
        subject: args.claims.subject,
        emailAddress: args.claims.emailAddress,
        firstName: textNormalizeTitledOrNull(givenName),
        lastName: textNormalizeTitledOrNull(familyName),
        phoneNumber: args.people?.phoneNumber ?? null,
        birthDate: args.people?.birthDate ?? null,
    };
}

function jwtPayloadParse(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    try {
        const json = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed: unknown = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

function peoplePrimary(entries: unknown[]): Record<string, unknown> | null {
    let fallback: Record<string, unknown> | null = null;
    for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        fallback ??= record;
        const metadata = record.metadata && typeof record.metadata === 'object' ? (record.metadata as Record<string, unknown>) : null;
        if (metadata?.primary === true) {
            return record;
        }
    }
    return fallback;
}
