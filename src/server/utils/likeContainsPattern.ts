/** Escape / strip LIKE wildcards so user searchText cannot broaden the match. */
export function likeContainsPattern(searchText: string | null | undefined): string | null {
    const trimmed = searchText?.trim();
    if (!trimmed) {
        return null;
    }
    return `%${trimmed.replace(/[%_]/g, '')}%`;
}
