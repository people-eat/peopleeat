import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import * as OTPAuth from 'otpauth';

import { SITE_NAME } from '../../shared/siteBranding';
import type { AuthTotpRecoveryCode } from '../db/schema';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { authOtpCodeHash, authOtpCodeMatches, authOtpPepperRequire } from './authOtpUtils';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const RECOVERY_CODE_COUNT = 10;
const TOTP_WINDOW = 1;
const PENDING_TOTP_TTL_MS = 15 * 60 * 1000;

export function authTotpEncryptionKeyRequire(): Buffer {
    const key = Buffer.from(environmentVariables.authTotpEncryptionKey, 'hex');
    if (key.length !== 32) {
        throw new Error('AUTH_TOTP_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return key;
}

export function authTotpSecretGenerate(): string {
    return new OTPAuth.Secret({ size: 20 }).base32;
}

export function authTotpSecretEncrypt(secret: string, key: Buffer = authTotpEncryptionKeyRequire()): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function authTotpSecretDecrypt(secretEncrypted: string, key: Buffer = authTotpEncryptionKeyRequire()): string {
    const payload = Buffer.from(secretEncrypted, 'base64');
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error('authTotpSecretDecrypt: invalid ciphertext');
    }
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function authTotpOtpauthUrl(secret: string, emailAddress: string): string {
    const totp = new OTPAuth.TOTP({
        issuer: SITE_NAME,
        label: emailAddress,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.toString();
}

export function authTotpCodeValid(secret: string, code: string, at: Date = new Date()): boolean {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
        return false;
    }
    const totp = new OTPAuth.TOTP({
        issuer: SITE_NAME,
        label: 'verify',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: trimmed, window: TOTP_WINDOW, timestamp: at.getTime() });
    return delta !== null;
}

export function authTotpRecoveryCodesGenerate(count: number = RECOVERY_CODE_COUNT): string[] {
    const codes: string[] = [];
    for (let index = 0; index < count; index += 1) {
        // 10 chars base32-ish from 8 random bytes → readable recovery code
        const raw = randomBytes(5).toString('hex').toUpperCase();
        codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    return codes;
}

export function authTotpRecoveryCodesHash(codes: string[], pepper: string = authOtpPepperRequire()): AuthTotpRecoveryCode[] {
    return codes.map((code) => ({
        hash: authOtpCodeHash(authTotpRecoveryCodeNormalize(code), pepper),
        consumedAt: null,
    }));
}

export function authTotpRecoveryCodeNormalize(code: string): string {
    return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function authTotpRecoveryCodeConsume(
    recoveryCodes: AuthTotpRecoveryCode[],
    code: string,
    pepper: string = authOtpPepperRequire(),
    at: Date = new Date(),
): AuthTotpRecoveryCode[] | null {
    const normalized = authTotpRecoveryCodeNormalize(code);
    if (normalized.length < 8) {
        return null;
    }
    const next = recoveryCodes.map((entry) => ({ ...entry }));
    for (const entry of next) {
        if (entry.consumedAt != null) {
            continue;
        }
        if (authOtpCodeMatches(normalized, entry.hash, pepper)) {
            entry.consumedAt = at.toISOString();
            return next;
        }
    }
    return null;
}

export function authTotpRecoveryCodesRemaining(recoveryCodes: AuthTotpRecoveryCode[]): number {
    return recoveryCodes.filter((entry) => entry.consumedAt == null).length;
}

export function authTotpPendingExpiresAt(from: Date = new Date()): Date {
    return new Date(from.getTime() + PENDING_TOTP_TTL_MS);
}

/** True when the input is not a 6-digit TOTP token (recovery codes are longer). */
export function authTotpLooksLikeRecoveryCode(code: string): boolean {
    const normalized = authTotpRecoveryCodeNormalize(code);
    return normalized.length >= 8 && !/^\d{6}$/.test(code.trim());
}
