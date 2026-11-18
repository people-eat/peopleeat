import { describe, expect, it } from 'vitest';

import { authOauthProviders, authOauthSignInFailReasons } from '../domain/authOauth';
import {
    AUTH_GOOGLE_AUTHORIZE_URL,
    AUTH_GOOGLE_PEOPLE_URL,
    AUTH_GOOGLE_TOKEN_URL,
    AUTH_GOOGLE_USERINFO_URL,
    authGoogleAuthorizationUrlCreate,
    authGoogleIdTokenClaimsParse,
    authGoogleLocaleFromReturnTo,
    authGooglePeopleParse,
    authGooglePkceCreate,
    authGoogleProfileSnapshotMerge,
    authGoogleRedirectUri,
    authGoogleReturnToSafe,
    authGoogleReturnToWithError,
} from './authGoogleOauth';

function jwtCreate(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.sig`;
}

describe('authGoogleReturnToSafe', () => {
    it('accepts same-app relative paths and rejects open redirects', () => {
        expect(authGoogleReturnToSafe('/log-on')).toBe('/log-on');
        expect(authGoogleReturnToSafe('/booking-request/form?step=auth')).toBe('/booking-request/form?step=auth');
        expect(authGoogleReturnToSafe('https://evil.example')).toBeUndefined();
        expect(authGoogleReturnToSafe('//evil.example')).toBeUndefined();
    });
});

describe('authGoogleReturnToWithError', () => {
    it('appends authError without duplicating it', () => {
        expect(authGoogleReturnToWithError('/log-on')).toBe('/log-on?authError=google');
        expect(authGoogleReturnToWithError('/log-on?returnTo=%2Fprofile')).toBe('/log-on?returnTo=%2Fprofile&authError=google');
        expect(authGoogleReturnToWithError('/log-on?authError=google')).toBe('/log-on?authError=google');
    });
});

describe('authGoogleRedirectUri', () => {
    it('appends the callback path', () => {
        expect(authGoogleRedirectUri('https://example.com')).toBe('https://example.com/api/auth/google/callback');
    });
});

describe('authGoogleLocaleFromReturnTo', () => {
    it('reads locale prefixes', () => {
        expect(authGoogleLocaleFromReturnTo('/log-on')).toBe('de');
        expect(authGoogleLocaleFromReturnTo('/en/log-on')).toBe('en');
        expect(authGoogleLocaleFromReturnTo('/fr/log-on')).toBe('fr');
        expect(authGoogleLocaleFromReturnTo('/it/log-on')).toBe('it');
    });
});

describe('authGooglePkceCreate', () => {
    it('returns verifier, challenge, state, and nonce', () => {
        const pkce = authGooglePkceCreate();
        expect(pkce.codeVerifier.length).toBeGreaterThan(20);
        expect(pkce.codeChallenge.length).toBeGreaterThan(20);
        expect(pkce.state.length).toBeGreaterThan(20);
        expect(pkce.nonce.length).toBeGreaterThan(20);
        expect(AUTH_GOOGLE_AUTHORIZE_URL).toContain('accounts.google.com');
        expect(AUTH_GOOGLE_TOKEN_URL).toContain('oauth2.googleapis.com');
        expect(AUTH_GOOGLE_USERINFO_URL).toContain('userinfo');
        expect(AUTH_GOOGLE_PEOPLE_URL).toContain('people.googleapis.com');
        expect(authOauthProviders).toEqual(['GOOGLE', 'FACEBOOK']);
        expect(authOauthSignInFailReasons).toContain('denied');
    });
});

describe('authGoogleAuthorizationUrlCreate', () => {
    it('omits People scopes when the env flag is off', () => {
        const url = authGoogleAuthorizationUrlCreate({
            env: {
                googleOauthClientId: 'client-id',
                googleOauthPeopleScopes: false,
                webPageUrl: 'https://example.com',
            },
            state: 'state',
            nonce: 'nonce',
            codeChallenge: 'challenge',
            locale: 'de',
        });
        const parsed = new URL(url);
        expect(parsed.origin + parsed.pathname).toBe(AUTH_GOOGLE_AUTHORIZE_URL);
        expect(parsed.searchParams.get('scope')).toBe('openid email profile');
        expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/api/auth/google/callback');
    });

    it('includes People scopes when the env flag is on', () => {
        const url = authGoogleAuthorizationUrlCreate({
            env: {
                googleOauthClientId: 'client-id',
                googleOauthPeopleScopes: true,
                webPageUrl: 'https://example.com',
            },
            state: 'state',
            nonce: 'nonce',
            codeChallenge: 'challenge',
            locale: 'en',
        });
        const parsed = new URL(url);
        expect(parsed.searchParams.get('scope') ?? '').toContain('user.phonenumbers.read');
        expect(parsed.searchParams.get('scope') ?? '').toContain('user.birthday.read');
    });
});

describe('authGoogleIdTokenClaimsParse', () => {
    it('parses a valid Google id_token', () => {
        const claims = authGoogleIdTokenClaimsParse(
            jwtCreate({
                iss: 'https://accounts.google.com',
                aud: 'client-id',
                exp: Math.floor(Date.now() / 1000) + 3600,
                nonce: 'nonce-1',
                sub: 'google-sub',
                email: 'Ada@Example.com',
                email_verified: true,
                given_name: 'Ada',
                family_name: 'Lovelace',
            }),
            { clientId: 'client-id', nonce: 'nonce-1' },
        );
        expect(claims).toMatchObject({
            subject: 'google-sub',
            emailAddress: 'ada@example.com',
            emailVerified: true,
            givenName: 'Ada',
            familyName: 'Lovelace',
        });
    });

    it('rejects an unverifiable audience or nonce', () => {
        const token = jwtCreate({
            iss: 'https://accounts.google.com',
            aud: 'other-client',
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-1',
            sub: 'google-sub',
            email: 'ada@example.com',
            email_verified: true,
        });
        expect(() => authGoogleIdTokenClaimsParse(token, { clientId: 'client-id', nonce: 'nonce-1' })).toThrow(/aud/);
    });
});

describe('authGooglePeopleParse', () => {
    it('keeps yearless birthdays and invalid phones out of the snapshot', () => {
        const parsed = authGooglePeopleParse({
            names: [{ givenName: 'Ada', familyName: 'Lovelace', metadata: { primary: true } }],
            phoneNumbers: [{ value: 'not-a-phone', metadata: { primary: true } }],
            birthdays: [{ date: { month: 1, day: 15 }, metadata: { primary: true } }],
        });
        expect(parsed.givenName).toBe('Ada');
        expect(parsed.familyName).toBe('Lovelace');
        expect(parsed.phoneNumber).toBeNull();
        expect(parsed.birthDate).toBeNull();
    });

    it('keeps an adult birthday with a year', () => {
        const parsed = authGooglePeopleParse({
            birthdays: [{ date: { year: 1990, month: 6, day: 15 }, metadata: { primary: true } }],
        });
        expect(parsed.birthDate).toBe('1990-06-15');
    });
});

describe('authGoogleProfileSnapshotMerge', () => {
    it('prefers People names and falls back to OIDC', () => {
        const snapshot = authGoogleProfileSnapshotMerge({
            claims: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Claim',
                familyName: null,
                pictureUrl: null,
            },
            userinfo: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Userinfo',
                familyName: null,
                pictureUrl: null,
            },
            people: { givenName: 'People', familyName: null, phoneNumber: '+4915112345678', birthDate: '1990-01-15' },
        });
        expect(snapshot.firstName).toBe('People');
        expect(snapshot.lastName).toBeNull();
        expect(snapshot.phoneNumber).toBe('+4915112345678');
        expect(snapshot.birthDate).toBe('1990-01-15');
        expect(snapshot.pictureUrl).toBeNull();
    });

    it('enlarges a Google picture URL and skips the default avatar', () => {
        const withPhoto = authGoogleProfileSnapshotMerge({
            claims: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Ada',
                familyName: 'Lovelace',
                pictureUrl: null,
            },
            userinfo: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Ada',
                familyName: 'Lovelace',
                pictureUrl: 'https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c',
            },
            people: null,
        });
        expect(withPhoto.pictureUrl).toBe('https://lh3.googleusercontent.com/a/ACg8ocTest=s512-c');

        const defaultPhoto = authGoogleProfileSnapshotMerge({
            claims: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Ada',
                familyName: 'Lovelace',
                pictureUrl: 'https://lh3.googleusercontent.com/a/default-user',
            },
            userinfo: {
                subject: 'sub-1',
                emailAddress: 'ada@example.com',
                givenName: 'Ada',
                familyName: 'Lovelace',
                pictureUrl: null,
            },
            people: null,
        });
        expect(defaultPhoto.pictureUrl).toBeNull();
    });
});
