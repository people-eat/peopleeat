/** Join a user's given + family name for display (UI, emails, audit labels). */
export function userDisplayName(
    user: { firstName: string; lastName: string; status?: string | null },
    deletedLabel = 'Deleted account',
): string {
    if (user.status === 'ANONYMIZED') {
        return deletedLabel;
    }
    return `${user.firstName} ${user.lastName}`.trim();
}
