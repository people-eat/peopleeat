/** True for owner full-screen assistant routes (`/admin|profile/assistant` + optional chat id). */
export function isAssistantFullscreenPath(path: string): boolean {
    return /^\/(admin|profile)\/assistant(\/[^/]+)?$/.test(path);
}
