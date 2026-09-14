const RECAPTCHA_SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const GIFT_CARD_PURCHASE_ACTION = 'gift_card_purchase';
const MIN_SCORE = 0.5;

export type RecaptchaV3VerifyResult = { ok: true; score: number } | { ok: false; reason: string };

interface RecaptchaSiteverifyResponse {
    success?: boolean;
    score?: number;
    action?: string;
    'error-codes'?: string[];
}

/** Google reCAPTCHA v3 siteverify for the gift-card purchase action. */
export async function verifyRecaptchaV3(token: string, secretKey: string): Promise<RecaptchaV3VerifyResult> {
    const trimmed = token.trim();
    if (!trimmed) {
        return { ok: false, reason: 'missing-token' };
    }

    const body = new URLSearchParams({ secret: secretKey, response: trimmed });
    const response = await fetch(RECAPTCHA_SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        return { ok: false, reason: `http-${response.status}` };
    }

    const payload = (await response.json()) as RecaptchaSiteverifyResponse;
    if (!payload.success) {
        return { ok: false, reason: payload['error-codes']?.join(',') || 'verification-failed' };
    }
    if (payload.action !== GIFT_CARD_PURCHASE_ACTION) {
        return { ok: false, reason: `unexpected-action:${payload.action ?? 'none'}` };
    }
    const score = payload.score ?? 0;
    if (score < MIN_SCORE) {
        return { ok: false, reason: `low-score:${score}` };
    }
    return { ok: true, score };
}
