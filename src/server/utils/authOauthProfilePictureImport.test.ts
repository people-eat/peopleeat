import { describe, expect, it, vi } from 'vitest';

import {
    authGooglePictureUrlNormalize,
    authOauthPictureHostAllowed,
    authOauthProfilePictureEncode,
    authOauthProfilePictureImport,
} from './authOauthProfilePictureImport';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('authOauthPictureHostAllowed', () => {
    it('allows Google and Facebook CDN hosts and rejects others', () => {
        expect(authOauthPictureHostAllowed('lh3.googleusercontent.com')).toBe(true);
        expect(authOauthPictureHostAllowed('scontent.xx.fbcdn.net')).toBe(true);
        expect(authOauthPictureHostAllowed('platform-lookaside.fbsbx.com')).toBe(true);
        expect(authOauthPictureHostAllowed('evil.example')).toBe(false);
        expect(authOauthPictureHostAllowed('127.0.0.1')).toBe(false);
    });
});

describe('authGooglePictureUrlNormalize', () => {
    it('requests a 512px Google photo and drops default avatars', () => {
        expect(authGooglePictureUrlNormalize('https://lh3.googleusercontent.com/a/ACg8ocTest=s96-c')).toBe(
            'https://lh3.googleusercontent.com/a/ACg8ocTest=s512-c',
        );
        expect(authGooglePictureUrlNormalize('https://lh3.googleusercontent.com/a/default-user')).toBeNull();
        expect(authGooglePictureUrlNormalize('http://lh3.googleusercontent.com/a/ACg8ocTest=s96-c')).toBeNull();
        expect(authGooglePictureUrlNormalize('https://evil.example/a.png')).toBeNull();
    });
});

describe('authOauthProfilePictureEncode', () => {
    it('encodes a bitmap as a square WebP avatar', async () => {
        const encoded = await authOauthProfilePictureEncode(PNG_1X1);
        expect(encoded?.mediaType).toBe('image/webp');
        expect(encoded?.filename).toBe('avatar.webp');
        expect(encoded?.bytes.subarray(0, 4).equals(Buffer.from('RIFF'))).toBe(true);
    });

    it('returns null for non-image bytes', async () => {
        expect(await authOauthProfilePictureEncode(Buffer.from('<html></html>'))).toBeNull();
    });
});

describe('authOauthProfilePictureImport', () => {
    it('downloads an allowlisted image and encodes WebP', async () => {
        const fetchImpl = vi.fn(async () => new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } }));
        const imported = await authOauthProfilePictureImport({
            url: 'https://lh3.googleusercontent.com/a/ACg8ocTest=s512-c',
            fetchImpl,
        });
        expect(imported?.mediaType).toBe('image/webp');
        expect(imported?.bytes.byteLength).toBeGreaterThan(0);
    });

    it('rejects a redirect onto a non-allowlisted host', async () => {
        const fetchImpl = vi.fn(async () => {
            const response = new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } });
            Object.defineProperty(response, 'url', { value: 'https://evil.example/phished.png' });
            return response;
        });
        expect(
            await authOauthProfilePictureImport({
                url: 'https://lh3.googleusercontent.com/a/ACg8ocTest=s512-c',
                fetchImpl,
            }),
        ).toBeNull();
    });

    it('returns null when the download fails', async () => {
        const fetchImpl = vi.fn(async () => new Response('nope', { status: 404 }));
        expect(
            await authOauthProfilePictureImport({
                url: 'https://lh3.googleusercontent.com/a/missing.png',
                fetchImpl,
            }),
        ).toBeNull();
    });
});
