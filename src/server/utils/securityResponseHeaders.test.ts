import { describe, expect, it } from 'vitest';

import { securityResponseHeadersApply } from './securityResponseHeaders';

describe('securityResponseHeadersApply', () => {
    it('sets nosniff, a referrer policy, and frame-ancestors', () => {
        const headers = new Headers();
        securityResponseHeadersApply(
            (name) => headers.get(name) ?? undefined,
            (name, value) => headers.set(name, value),
        );
        expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
        expect(headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self'");
    });

    it('keeps a stricter referrer policy and appends frame-ancestors to an existing policy', () => {
        const headers = new Headers({
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'self'",
        });
        securityResponseHeadersApply(
            (name) => headers.get(name) ?? undefined,
            (name, value) => headers.set(name, value),
        );
        expect(headers.get('Referrer-Policy')).toBe('no-referrer');
        expect(headers.get('Content-Security-Policy')).toBe("default-src 'self'; frame-ancestors 'self'");
    });
});
