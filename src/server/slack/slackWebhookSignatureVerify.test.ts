import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { slackWebhookSignatureVerify } from './slackWebhookSignatureVerify';

function sign(rawBody: string, timestamp: string, secret: string): string {
    const base = `v0:${timestamp}:${rawBody}`;
    return `v0=${createHmac('sha256', secret).update(base, 'utf8').digest('hex')}`;
}

describe('slackWebhookSignatureVerify', () => {
    const secret = 'test-signing-secret';
    const rawBody = 'payload=%7B%22type%22%3A%22block_actions%22%7D';
    const timestamp = '1710000000';

    it('accepts a valid signature within the clock skew window', () => {
        const signature = sign(rawBody, timestamp, secret);
        expect(
            slackWebhookSignatureVerify({
                rawBody,
                signatureHeader: signature,
                timestampHeader: timestamp,
                signingSecret: secret,
                nowSeconds: Number(timestamp),
            }),
        ).toBe(true);
    });

    it('rejects a wrong signature, missing headers, or stale timestamp', () => {
        const signature = sign(rawBody, timestamp, secret);
        expect(
            slackWebhookSignatureVerify({
                rawBody,
                signatureHeader: 'v0=deadbeef',
                timestampHeader: timestamp,
                signingSecret: secret,
                nowSeconds: Number(timestamp),
            }),
        ).toBe(false);
        expect(
            slackWebhookSignatureVerify({
                rawBody,
                signatureHeader: null,
                timestampHeader: timestamp,
                signingSecret: secret,
                nowSeconds: Number(timestamp),
            }),
        ).toBe(false);
        expect(
            slackWebhookSignatureVerify({
                rawBody,
                signatureHeader: signature,
                timestampHeader: timestamp,
                signingSecret: secret,
                nowSeconds: Number(timestamp) + 60 * 6,
            }),
        ).toBe(false);
    });
});
