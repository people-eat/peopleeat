/**
 * Build the `/api/session/switch` URL used after admin Sign in as / Return to
 * admin. Cookie swap + redirect must be the same HTTP response — see
 * `src/routes/api/session.switch.ts`.
 */
export function sessionSwitchUrl(toSessionId: string, redirectPath: string): string {
    const params = new URLSearchParams({
        toSessionId,
        redirect: redirectPath,
    });
    return `/api/session/switch?${params.toString()}`;
}
