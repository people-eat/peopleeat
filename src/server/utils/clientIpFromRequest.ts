// Extracts the client IP from a request's proxy headers.
//
// Production traffic arrives behind one reverse proxy (Coolify → the app
// container). That proxy appends the address it actually accepted the
// connection from, so the last `x-forwarded-for` hop is the client. The
// first hop is whatever the caller sent and must not be trusted. `x-real-ip`
// is the fallback when the proxy only sets that single-value header.
//
// Returns `null` when neither header is present — typically only in local
// development without a proxy. `sessionUpsert` then stores a null `ipHash`.
export function clientIpFromRequest(request: Request): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const hops = forwardedFor
            .split(',')
            .map((hop) => hop.trim())
            .filter((hop) => hop.length > 0);
        const appendedByProxy = hops.at(-1);
        if (appendedByProxy) return appendedByProxy;
    }
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    return null;
}
