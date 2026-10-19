import { createHmac, timingSafeEqual } from 'node:crypto';

/** Reject Slack requests whose timestamp is older than this (replay protection). */
const MAX_CLOCK_SKEW_SECONDS = 60 * 5;

/**
 * Verify `X-Slack-Signature` / `X-Slack-Request-Timestamp` per
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function slackWebhookSignatureVerify(args: {
    rawBody: string;
    signatureHeader: string | null;
    timestampHeader: string | null;
    signingSecret: string;
    nowSeconds?: number;
}): boolean {
    const signingSecret = args.signingSecret.trim();
    const signatureHeader = args.signatureHeader?.trim() ?? '';
    const timestampHeader = args.timestampHeader?.trim() ?? '';
    if (!signingSecret || !signatureHeader || !timestampHeader) {
        return false;
    }

    const timestampSeconds = Number(timestampHeader);
    if (!Number.isFinite(timestampSeconds)) {
        return false;
    }
    const nowSeconds = args.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
        return false;
    }

    const prefix = 'v0=';
    if (!signatureHeader.startsWith(prefix)) {
        return false;
    }

    const base = `v0:${timestampHeader}:${args.rawBody}`;
    const expected = `${prefix}${createHmac('sha256', signingSecret).update(base, 'utf8').digest('hex')}`;
    try {
        const expectedBuf = Buffer.from(expected, 'utf8');
        const receivedBuf = Buffer.from(signatureHeader, 'utf8');
        return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
        return false;
    }
}
