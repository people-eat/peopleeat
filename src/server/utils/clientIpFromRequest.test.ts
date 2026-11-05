import { describe, expect, it } from 'vitest';

import { clientIpFromRequest } from './clientIpFromRequest';

function requestWith(headers: Record<string, string>): Request {
    return new Request('https://example.com/', { headers });
}

describe('clientIpFromRequest', () => {
    it('uses the last X-Forwarded-For hop, which the proxy appended', () => {
        const request = requestWith({ 'x-forwarded-for': '203.0.113.5, 198.51.100.8' });
        expect(clientIpFromRequest(request)).toBe('198.51.100.8');
    });

    it('uses a single X-Forwarded-For value when the proxy replaced the header', () => {
        const request = requestWith({ 'x-forwarded-for': '198.51.100.8' });
        expect(clientIpFromRequest(request)).toBe('198.51.100.8');
    });

    it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
        const request = requestWith({ 'x-real-ip': '198.51.100.9' });
        expect(clientIpFromRequest(request)).toBe('198.51.100.9');
    });

    it('returns null when neither header is present', () => {
        expect(clientIpFromRequest(requestWith({}))).toBeNull();
    });
});
