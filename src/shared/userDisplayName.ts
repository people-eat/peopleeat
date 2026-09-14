/** Join a user's given + family name for display (UI, emails, audit labels). */
export function userDisplayName(user: { firstName: string; lastName: string }): string {
    return `${user.firstName} ${user.lastName}`.trim();
}
