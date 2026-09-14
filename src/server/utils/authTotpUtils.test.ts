import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';

import {
    authTotpCodeValid,
    authTotpLooksLikeRecoveryCode,
    authTotpOtpauthUrl,
    authTotpRecoveryCodeConsume,
    authTotpRecoveryCodeNormalize,
    authTotpRecoveryCodesGenerate,
    authTotpRecoveryCodesHash,
    authTotpRecoveryCodesRemaining,
    authTotpSecretDecrypt,
    authTotpSecretEncrypt,
    authTotpSecretGenerate,
} from './authTotpUtils';

const TEST_KEY = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const TEST_PEPPER = 'test-otp-pepper';

describe('authTotpUtils', () => {
    it('encrypts and decrypts a TOTP secret', () => {
        const secret = authTotpSecretGenerate();
        const encrypted = authTotpSecretEncrypt(secret, TEST_KEY);
        expect(encrypted).not.toContain(secret);
        expect(authTotpSecretDecrypt(encrypted, TEST_KEY)).toBe(secret);
    });

    it('builds an otpauth URL and validates a current code', () => {
        const secret = authTotpSecretGenerate();
        const url = authTotpOtpauthUrl(secret, 'user@example.com');
        expect(url).toMatch(/^otpauth:\/\/totp\//);
        expect(url).toContain('user%40example.com');

        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secret),
        });
        const code = totp.generate();
        expect(authTotpCodeValid(secret, code)).toBe(true);
        expect(authTotpCodeValid(secret, '000000')).toBe(false);
    });

    it('hashes, matches, and consumes recovery codes', () => {
        const codes = authTotpRecoveryCodesGenerate(2);
        expect(codes).toHaveLength(2);
        const hashed = authTotpRecoveryCodesHash(codes, TEST_PEPPER);
        expect(authTotpRecoveryCodesRemaining(hashed)).toBe(2);

        const afterFirst = authTotpRecoveryCodeConsume(hashed, codes[0]!, TEST_PEPPER);
        expect(afterFirst).not.toBeNull();
        expect(authTotpRecoveryCodesRemaining(afterFirst!)).toBe(1);

        const replay = authTotpRecoveryCodeConsume(afterFirst!, codes[0]!, TEST_PEPPER);
        expect(replay).toBeNull();

        const afterSecond = authTotpRecoveryCodeConsume(afterFirst!, codes[1]!.toLowerCase(), TEST_PEPPER);
        expect(afterSecond).not.toBeNull();
        expect(authTotpRecoveryCodesRemaining(afterSecond!)).toBe(0);
    });

    it('normalizes recovery codes and detects them vs TOTP digits', () => {
        expect(authTotpRecoveryCodeNormalize('ab12c-de34f')).toBe('AB12CDE34F');
        expect(authTotpLooksLikeRecoveryCode('AB12C-DE34F')).toBe(true);
        expect(authTotpLooksLikeRecoveryCode('123456')).toBe(false);
    });
});
