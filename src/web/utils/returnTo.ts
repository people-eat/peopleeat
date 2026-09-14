/**
 * Safe same-app return paths (sign-in, menu edit → offer create, etc.).
 *
 * `returnTo` is a relative path (pathname + optional search). Absolute URLs,
 * protocol-relative URLs, and other open-redirect shapes are rejected.
 */

export type SignInSearch = {
    returnTo?: string;
};

/** Build a returnTo value from the current router location. */
export function returnToFromLocation(location: { pathname: string; searchStr: string }): string {
    return `${location.pathname}${location.searchStr}`;
}

/**
 * Accept only same-app relative paths: leading `/`, no `//`, no scheme, no
 * backslashes. Returns `undefined` when the value is missing or unsafe.
 */
export function returnToSafe(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed.startsWith('/')) return undefined;
    if (trimmed.startsWith('//')) return undefined;
    if (trimmed.includes('\\')) return undefined;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return undefined;
    return trimmed;
}

export function parseSignInSearch(search: Record<string, unknown>): SignInSearch {
    const returnTo = returnToSafe(search.returnTo);
    return returnTo ? { returnTo } : {};
}
