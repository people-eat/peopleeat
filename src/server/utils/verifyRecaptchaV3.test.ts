import { describe, expect, it, vi } from 'vitest';

import { verifyRecaptchaV3 } from './verifyRecaptchaV3';

describe('verifyRecaptchaV3', () => {
    it('returns ok when Google accepts the token with a high enough score', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json({
                    success: true,
                    score: 0.9,
                    action: 'gift_card_purchase',
                }),
            ),
        );

        const result = await verifyRecaptchaV3('token', 'secret');
        expect(result).toEqual({ ok: true, score: 0.9 });
    });

    it('returns ok:false on low score', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json({
                    success: true,
                    score: 0.1,
                    action: 'gift_card_purchase',
                }),
            ),
        );

        const result = await verifyRecaptchaV3('token', 'secret');
        expect(result.ok).toBe(false);
    });

    it('returns ok:false when action mismatches', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json({
                    success: true,
                    score: 0.9,
                    action: 'other_action',
                }),
            ),
        );

        const result = await verifyRecaptchaV3('token', 'secret');
        expect(result.ok).toBe(false);
    });
});
