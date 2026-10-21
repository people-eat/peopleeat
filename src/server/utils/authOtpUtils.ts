import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { emailNormalize } from '../../shared/emailNormalize';
import { environmentVariables } from '../env/environmentVariablesCreate';

export { emailNormalize };

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function authOtpPepperRequire(): string {
    return environmentVariables.authOtpPepper;
}

function authOtpEncryptionKey(pepper: string): Buffer {
    return createHash('sha256').update(pepper).digest();
}

export function authOtpCodeGenerate(): string {
    const value = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
    return value.toString().padStart(6, '0');
}

export function authOtpCodeHash(code: string, pepper: string): string {
    return createHmac('sha256', pepper).update(code).digest('hex');
}

export function authOtpCodeEncrypt(code: string, pepper: string = authOtpPepperRequire()): string {
    const key = authOtpEncryptionKey(pepper);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function authOtpCodeDecrypt(codeEncrypted: string, pepper: string = authOtpPepperRequire()): string {
    const payload = Buffer.from(codeEncrypted, 'base64');
    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error('authOtpCodeDecrypt: invalid ciphertext');
    }
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(AES_ALGORITHM, authOtpEncryptionKey(pepper), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function authOtpCodeMatches(code: string, codeHash: string, pepper: string): boolean {
    const candidate = Buffer.from(authOtpCodeHash(code, pepper), 'utf8');
    const expected = Buffer.from(codeHash, 'utf8');
    if (candidate.length !== expected.length) {
        return false;
    }
    return timingSafeEqual(candidate, expected);
}

export function authOtpExpiresAt(from: Date = new Date()): Date {
    return new Date(from.getTime() + 10 * 60 * 1000);
}
