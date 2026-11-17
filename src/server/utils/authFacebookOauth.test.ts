import { describe, expect, it } from 'vitest';

import { authOauthProviders } from '../domain/authOauth';
import {
    AUTH_FACEBOOK_AUTHORIZE_URL,
    AUTH_FACEBOOK_ME_URL,
    AUTH_FACEBOOK_TOKEN_URL,
    authFacebookAppSecretProof,
    authFacebookAuthorizationUrlCreate,
    authFacebookLocaleFromReturnTo,
    authFacebookMeParse,
    authFacebookRedirectUri,
    authFacebookReturnToSafe,
    authFacebookReturnToWithError,
    authFacebookStateSecretsCreate,
} from './authFacebookOauth';

describe('authFacebookReturnToSafe', () => {
    it('accepts same-app relative paths and rejects open redirects', () => {
        expect(authFacebookReturnToSafe('/log-on')).toBe('/log-on');
        expect(authFacebookReturnToSafe('/booking-request/form?step=auth')).toBe('/booking-request/form?step=auth');
        expect(authFacebookReturnToSafe('https://evil.example')).toBeUndefined();
        expect(authFacebookReturnToSafe('//evil.example')).toBeUndefined();
    });
});

describe('authFacebookReturnToWithError', () => {
    it('appends authError without duplicating it', () => {
        expect(authFacebookReturnToWithError('/log-on')).toBe('/log-on?authError=facebook');
        expect(authFacebookReturnToWithError('/log-on?returnTo=%2Fprofile')).toBe('/log-on?returnTo=%2Fprofile&authError=facebook');
        expect(authFacebookReturnToWithError('/log-on?authError=facebook')).toBe('/log-on?authError=facebook');
    });
});

describe('authFacebookRedirectUri', () => {
    it('appends the callback path', () => {
        expect(authFacebookRedirectUri('https://example.com')).toBe('https://example.com/api/auth/facebook/callback');
    });
});

describe('authFacebookLocaleFromReturnTo', () => {
    it('reads locale prefixes', () => {
        expect(authFacebookLocaleFromReturnTo('/log-on')).toBe('de');
        expect(authFacebookLocaleFromReturnTo('/en/log-on')).toBe('en');
        expect(authFacebookLocaleFromReturnTo('/fr/log-on')).toBe('fr');
    });
});

describe('authFacebookStateSecretsCreate', () => {
    it('returns state plus unused PKCE placeholders', () => {
        const secrets = authFacebookStateSecretsCreate();
        expect(secrets.codeVerifier.length).toBeGreaterThan(20);
        expect(secrets.nonce.length).toBeGreaterThan(20);
        expect(secrets.state.length).toBeGreaterThan(20);
        expect(AUTH_FACEBOOK_AUTHORIZE_URL).toContain('facebook.com');
        expect(AUTH_FACEBOOK_TOKEN_URL).toContain('graph.facebook.com');
        expect(AUTH_FACEBOOK_ME_URL).toContain('graph.facebook.com');
        expect(authOauthProviders).toContain('FACEBOOK');
    });
});

describe('authFacebookAuthorizationUrlCreate', () => {
    it('requests email and public_profile', () => {
        const url = authFacebookAuthorizationUrlCreate({
            env: {
                facebookOauthClientId: 'app-id',
                webPageUrl: 'https://example.com',
            },
            state: 'state-value',
            locale: 'en',
        });
        const parsed = new URL(url);
        expect(parsed.origin + parsed.pathname).toBe(AUTH_FACEBOOK_AUTHORIZE_URL);
        expect(parsed.searchParams.get('client_id')).toBe('app-id');
        expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/api/auth/facebook/callback');
        expect(parsed.searchParams.get('scope')).toBe('email,public_profile');
        expect(parsed.searchParams.get('state')).toBe('state-value');
        expect(parsed.searchParams.get('response_type')).toBe('code');
    });
});

describe('authFacebookAppSecretProof', () => {
    it('is a hex HMAC of the access token', () => {
        const proof = authFacebookAppSecretProof('token', 'secret');
        expect(proof).toMatch(/^[a-f0-9]{64}$/);
        expect(authFacebookAppSecretProof('token', 'secret')).toBe(proof);
        expect(authFacebookAppSecretProof('other', 'secret')).not.toBe(proof);
    });
});

describe('authFacebookMeParse', () => {
    it('parses id, email, and names', () => {
        expect(
            authFacebookMeParse({
                id: '123',
                email: 'Ada@Example.com',
                first_name: 'ada',
                last_name: 'Lovelace',
            }),
        ).toEqual({
            subject: '123',
            emailAddress: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
        });
    });

    it('rejects missing email', () => {
        expect(() => authFacebookMeParse({ id: '123' })).toThrow(/missing email/);
    });
});
