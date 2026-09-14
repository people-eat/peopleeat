import { describe, expect, it } from 'vitest';

import {
    authOtpCodeDecrypt,
    authOtpCodeEncrypt,
    authOtpCodeGenerate,
    authOtpCodeHash,
    authOtpCodeMatches,
    authOtpExpiresAt,
    emailNormalize,
} from './authOtpUtils';

describe('authOtpUtils', () => {
    it('normalizes email addresses', () => {
        expect(emailNormalize('  Ada@Example.COM ')).toBe('ada@example.com');
    });

    it('generates a 6-digit code', () => {
        const code = authOtpCodeGenerate();
        expect(code).toMatch(/^\d{6}$/);
    });

    it('hashes and matches codes with a pepper', () => {
        const pepper = 'test-pepper';
        const code = '123456';
        const hash = authOtpCodeHash(code, pepper);
        expect(hash).not.toBe(code);
        expect(authOtpCodeMatches(code, hash, pepper)).toBe(true);
        expect(authOtpCodeMatches('000000', hash, pepper)).toBe(false);
    });

    it('encrypts and decrypts codes with a pepper-derived key', () => {
        const pepper = 'test-pepper';
        const code = '654321';
        const encrypted = authOtpCodeEncrypt(code, pepper);
        expect(encrypted).not.toContain(code);
        expect(authOtpCodeDecrypt(encrypted, pepper)).toBe(code);
        expect(authOtpCodeEncrypt(code, pepper)).not.toBe(encrypted);
    });

    it('expires about ten minutes from now', () => {
        const from = new Date('2026-01-01T00:00:00.000Z');
        expect(authOtpExpiresAt(from).toISOString()).toBe('2026-01-01T00:10:00.000Z');
    });
});
