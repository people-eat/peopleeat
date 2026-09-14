import { randomInt } from 'node:crypto';

// A–Z / 0–9 without ambiguous glyphs (0/O, 1/I/L) so codes stay easy to read aloud.
const REDEEM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function redeemCodeSegment(length: number): string {
    let segment = '';
    for (let index = 0; index < length; index += 1) {
        segment += REDEEM_CODE_ALPHABET[randomInt(REDEEM_CODE_ALPHABET.length)]!;
    }
    return segment;
}

/** Generates a redeem code shaped `XXXX-XXXX-XXXX`. */
export function redeemCodeCreate(): string {
    return `${redeemCodeSegment(4)}-${redeemCodeSegment(4)}-${redeemCodeSegment(4)}`;
}
