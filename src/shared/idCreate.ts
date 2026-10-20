import { customAlphabet } from 'nanoid';
import { z } from 'zod';

/** 20-character URL-safe nanoId (entity PKs / FKs). */
const NANO_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NANO_ID_LENGTH = 20;

const nanoIdGenerator = customAlphabet(NANO_ID_ALPHABET, NANO_ID_LENGTH);

/** Create a new 20-char entity id for persisted PKs / FKs. Prefer this over `crypto.randomUUID()`. */
export function idCreate(): string {
    return nanoIdGenerator();
}

const nanoIdPattern = new RegExp(`^[${NANO_ID_ALPHABET}]{${NANO_ID_LENGTH}}$`);

export function isNanoId(value: string): boolean {
    return nanoIdPattern.test(value);
}

/** Zod schema for entity ids (and JSONB-embedded ids such as content section ids). */
export const zNanoId = z.string().regex(nanoIdPattern, { message: 'Expected a 20-character nanoId' });
