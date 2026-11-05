export const SECURITY_RESPONSE_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "frame-ancestors 'self'",
} as const;

type HeaderGet = (name: string) => string | undefined;
type HeaderSet = (name: string, value: string) => void;

// Applied on the way out of every response. A route that already set
// Referrer-Policy (WhatsApp link redirects use no-referrer) keeps its value.
// An existing Content-Security-Policy gains frame-ancestors when it has none.
export function securityResponseHeadersApply(get: HeaderGet, set: HeaderSet): void {
    if (!get('X-Content-Type-Options')) {
        set('X-Content-Type-Options', SECURITY_RESPONSE_HEADERS['X-Content-Type-Options']);
    }
    if (!get('Referrer-Policy')) {
        set('Referrer-Policy', SECURITY_RESPONSE_HEADERS['Referrer-Policy']);
    }

    const csp = get('Content-Security-Policy');
    if (!csp) {
        set('Content-Security-Policy', SECURITY_RESPONSE_HEADERS['Content-Security-Policy']);
        return;
    }
    if (!csp.includes('frame-ancestors')) {
        set('Content-Security-Policy', `${csp}; ${SECURITY_RESPONSE_HEADERS['Content-Security-Policy']}`);
    }
}
