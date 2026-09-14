import { eq, or } from 'drizzle-orm';

import { authPasskeys, authTimeBasedOneTimePasswords, authWebAuthnChallenges, cooks, sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/**
 * Shared anonymization: scrub PII on Users, revoke auth, terminate sessions,
 * hide cook profile. Keeps the row (`status = ANONYMIZED`) so relational
 * history (bookings, offers, …) stays joinable. See docs/features/account.md.
 */
export async function userAnonymizeApply(userId: string, serverRuntime: ServerRuntime): Promise<void> {
    const [existing] = await serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1);

    if (!existing) {
        throw new Error('userAnonymize: user not found');
    }

    if (existing.status === 'ANONYMIZED') {
        throw new Error('userAnonymize: already anonymized');
    }

    const now = new Date();

    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(users)
            .set({
                status: 'ANONYMIZED',
                emailAddress: null,
                previousEmailAddresses: [],
                firstName: ' ',
                lastName: ' ',
                phoneNumber: null,
                birthDate: null,
                preferredCommunication: null,
                profilePictureFileUploadId: null,
            })
            .where(eq(users.userId, userId));

        await transaction
            .update(sessions)
            .set({
                wasTerminatedAt: now,
                pendingTotpUserId: null,
                pendingTotpExpiresAt: null,
            })
            .where(or(eq(sessions.userId, userId), eq(sessions.pendingTotpUserId, userId)));

        await transaction.delete(authPasskeys).where(eq(authPasskeys.userId, userId));
        await transaction.delete(authTimeBasedOneTimePasswords).where(eq(authTimeBasedOneTimePasswords.userId, userId));
        await transaction.delete(authWebAuthnChallenges).where(eq(authWebAuthnChallenges.userId, userId));

        await transaction.update(cooks).set({ isVisible: false, lastModifiedAt: new Date() }).where(eq(cooks.cookId, userId));
    });
}
