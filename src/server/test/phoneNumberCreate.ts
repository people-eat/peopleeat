import { randomInt } from 'node:crypto';

/**
 * Unique E.164-shaped German mobile for tests/e2e.
 * Do not derive phones by stripping digits from nanoIds — digit density is too low.
 * Lives here (not `shared/idCreate`) so the browser bundle never pulls in `node:crypto`.
 */
export function phoneNumberCreate(): string {
    return `+4915${String(randomInt(0, 1e9)).padStart(9, '0')}`;
}
